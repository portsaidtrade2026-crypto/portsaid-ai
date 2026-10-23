// Read-only view of the public catalogue for the MCP tools, built on the Medusa Store API (the same public, key-guarded
// API the storefront itself uses). No prices are ever returned: the shop is quote-based and shows none.
//
// The product index (title, handle, thumbnail, categories: ~1.8k rows) is cached in memory and refreshed in the
// background, so searches never hit Medusa; a failed refresh keeps serving the last good copy.

const BACKEND =
  process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const KEY = () => process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
const REGION = () => (process.env.NEXT_PUBLIC_DEFAULT_REGION || "tr").toLowerCase()
const SITE = () => (process.env.NEXT_PUBLIC_BASE_URL || "https://portsaid.com.tr").replace(/\/$/, "")

const INDEX_TTL = 30 * 60 * 1000
const PRODUCT_TTL = 10 * 60 * 1000
const TIMEOUT = 8000
const PAGE = 1000

async function api<T>(path: string, query: Record<string, string>): Promise<T> {
  const url = new URL(path, BACKEND)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  const res = await fetch(url, {
    headers: { "x-publishable-api-key": KEY() },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return (await res.json()) as T
}

/** Lower-case, accent-insensitive form for matching ("Streç" / "STREC" / "strec" are the same word). */
export function fold(s: string): string {
  return s
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export const productUrl = (handle: string) => `${SITE()}/${REGION()}/products/${encodeURIComponent(handle)}`
export const categoryUrl = (handle: string) => `${SITE()}/${REGION()}/categories/${encodeURIComponent(handle)}`

export type CategoryRef = { id: string; name: string; handle: string }
type IndexRow = { id: string; title: string; handle: string; thumbnail: string | null; categories: CategoryRef[]; hay: string }
type CategoryRow = { id: string; name: string; handle: string; parentId: string | null; direct: number; total: number }
type Index = { at: number; products: IndexRow[]; categories: CategoryRow[] }

let index: Index | null = null
let loading: Promise<Index> | null = null

async function pageAll<T>(path: string, key: string, fields: string): Promise<T[]> {
  const out: T[] = []
  for (let offset = 0; offset < 20000; offset += PAGE) {
    const r = await api<Record<string, any>>(path, { fields, limit: String(PAGE), offset: String(offset) })
    const rows = (r[key] || []) as T[]
    out.push(...rows)
    if (rows.length === 0 || out.length >= (r.count ?? 0)) break
  }
  return out
}

async function build(): Promise<Index> {
  const [prods, cats] = await Promise.all([
    pageAll<any>("/store/products", "products", "id,title,handle,thumbnail,*categories"),
    pageAll<any>("/store/product-categories", "product_categories", "id,name,handle,parent_category_id"),
  ])
  const products: IndexRow[] = prods
    .filter((p) => p.handle && p.title)
    .map((p) => {
      const categories: CategoryRef[] = (p.categories || []).map((c: any) => ({ id: c.id, name: c.name, handle: c.handle }))
      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        thumbnail: p.thumbnail || null,
        categories,
        hay: fold([p.title, ...categories.map((c) => c.name)].join(" ")),
      }
    })

  const rows = new Map<string, CategoryRow>(
    cats.map((c: any) => [c.id, { id: c.id, name: c.name, handle: c.handle, parentId: c.parent_category_id || null, direct: 0, total: 0 }])
  )
  for (const p of products) for (const c of p.categories) {
    const r = rows.get(c.id)
    if (r) r.direct++
  }
  rows.forEach((r) => {
    // a category's total includes its descendants, so "Streç Film" counts every kind of streç film
    for (let cur: CategoryRow | undefined = r, n = 0; cur && n < 10; n++) {
      cur.total += r.direct
      cur = cur.parentId ? rows.get(cur.parentId) : undefined
    }
  })
  return { at: Date.now(), products, categories: [...rows.values()] }
}

async function getIndex(): Promise<Index> {
  if (index && Date.now() - index.at < INDEX_TTL) return index
  if (!loading) {
    loading = build()
      .then((i) => (index = i))
      .finally(() => (loading = null))
  }
  // stale copy: answer now, refresh behind the scenes; no copy yet: wait for the first load
  if (index) {
    loading.catch((e) => console.error("mcp catalogue refresh failed", e))
    return index
  }
  return loading
}

const tokens = (q: string) => fold(q).split(/[^a-z0-9]+/).filter(Boolean)

export type SearchHit = { title: string; handle: string; url: string; categories: string[]; thumbnail: string | null }

export async function searchProducts(query: string, category: string | undefined, limit: number) {
  const idx = await getIndex()
  const toks = tokens(query)
  const cat = category ? fold(category) : ""
  const need = toks.length <= 2 ? toks.length : toks.length - 1
  const scored: { row: IndexRow; score: number }[] = []
  for (const row of idx.products) {
    if (cat && !row.categories.some((c) => fold(c.handle) === cat || fold(c.name) === cat)) continue
    let hits = 0
    let score = 0
    for (const t of toks) {
      const at = row.hay.indexOf(t)
      if (at < 0) continue
      hits++
      score += at === 0 || row.hay[at - 1] === " " ? 2 : 1 // whole-word / word-start beats a mid-word hit
    }
    if (hits >= need) scored.push({ row, score: score + (hits === toks.length ? 100 : 0) })
  }
  scored.sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title, "tr"))
  const hits: SearchHit[] = scored.slice(0, limit).map(({ row }) => ({
    title: row.title,
    handle: row.handle,
    url: productUrl(row.handle),
    categories: row.categories.map((c) => c.name),
    thumbnail: row.thumbnail,
  }))
  return { total: scored.length, results: hits }
}

export async function listCategories() {
  const idx = await getIndex()
  const byParent = new Map<string | null, CategoryRow[]>()
  for (const c of idx.categories) {
    if (c.total === 0) continue // empty categories are not browsable on the site either
    const arr = byParent.get(c.parentId) || []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const node = (c: CategoryRow): Record<string, unknown> => {
    const kids = (byParent.get(c.id) || []).sort((a, b) => a.name.localeCompare(b.name, "tr"))
    return {
      name: c.name,
      handle: c.handle,
      url: categoryUrl(c.handle),
      product_count: c.total,
      ...(kids.length ? { subcategories: kids.map(node) } : {}),
    }
  }
  const roots = (byParent.get(null) || []).sort((a, b) => a.name.localeCompare(b.name, "tr"))
  return { categories: roots.map(node), product_count: idx.products.length }
}

/**
 * Accepts what an agent is likely to pass for a product: the handle as listed, the same percent-encoded, a product page
 * URL, or the handle without Turkish accents. Returns the real handle, or the cleaned input when nothing matches.
 */
export async function resolveHandle(input: string): Promise<string> {
  let h = input.trim()
  const at = h.indexOf('/products/')
  if (at >= 0) h = h.slice(at + '/products/'.length).split(/[?#/]/)[0]
  if (/%[0-9a-f]{2}/i.test(h)) {
    try {
      h = decodeURIComponent(h)
    } catch {}
  }
  const idx = await getIndex().catch(() => null)
  if (!idx || idx.products.some((p) => p.handle === h)) return h
  const f = fold(h)
  const same = idx.products.filter((p) => fold(p.handle) === f)
  return same.length === 1 ? same[0].handle : h
}

type Detail = { at: number; value: Record<string, unknown> | null }
const details = new Map<string, Detail>()

const stripHtml = (s: string) =>
  s
    .replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

export async function getProduct(handle: string): Promise<Record<string, unknown> | null> {
  const key = handle.trim()
  const hit = details.get(key)
  if (hit && Date.now() - hit.at < PRODUCT_TTL) return hit.value

  const r = await api<{ products?: any[] }>("/store/products", {
    handle: key,
    fields: "id,title,handle,subtitle,description,thumbnail,*options,*options.values,*variants,*variants.options,*categories,*images",
    limit: "1",
  })
  const p = r.products?.[0]
  let value: Record<string, unknown> | null = null
  if (p) {
    const optionTitle = new Map<string, string>(); // option id -> title
    for (const o of p.options || []) optionTitle.set(o.id, o.title)
    const specs: Record<string, string[]> = {}
    for (const o of p.options || []) {
      if (!o.title || /^default option$/i.test(o.title)) continue
      const values = [...new Set<string>((o.values || []).map((v: any) => v.value).filter((v: any) => v && !/^default option value$/i.test(v)))]
      if (values.length) specs[o.title] = values
    }
    const desc = p.description ? stripHtml(String(p.description)).slice(0, 1500) : null
    value = {
      title: p.title,
      handle: p.handle,
      url: productUrl(p.handle),
      subtitle: p.subtitle || null,
      description: desc || null,
      categories: (p.categories || []).map((c: any) => ({ name: c.name, handle: c.handle, url: categoryUrl(c.handle) })),
      specifications: specs,
      variants: (p.variants || []).map((v: any) => ({
        title: v.title,
        sku: v.sku || null,
        unit: v.metadata?.unit || null,
        options: Object.fromEntries(
          (v.options || [])
            .map((o: any) => [o.option?.title || optionTitle.get(o.option_id) || "", o.value])
            .filter(([k, val]: [string, string]) => k && !/^default option/i.test(k) && val && !/^default option/i.test(val))
        ),
      })),
      images: [...new Set<string>([p.thumbnail, ...(p.images || []).map((i: any) => i.url)].filter(Boolean))],
      pricing: "Fiyat listelenmez; teklif ile verilir (get_company_info topic=quote).",
    }
  }
  if (details.size > 300) details.clear()
  details.set(key, { at: Date.now(), value })
  return value
}
