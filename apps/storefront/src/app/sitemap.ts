import type { MetadataRoute } from "next"
import { getBaseURL } from "@/lib/util/env"

// /sitemap.xml (sitemaps.org protocol): canonical, crawlable URLs of the public catalogue, built from the Medusa Store
// API. Generated per request (never at `next build`, when the backend is not reachable) and cached for an hour by the
// fetch cache, so a published / changed product shows up within the hour without a redeploy.
//
// One entry per page, on the default region (/tr): the other regions only differ by currency, and the UI language is a
// cookie, not part of the URL - listing them too would just be duplicate content.
export const dynamic = "force-dynamic"

const BACKEND =
  process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PAGE = 500
const REVALIDATE = 3600

type Row = { id?: string; handle?: string; updated_at?: string; parent_category_id?: string | null }

async function api<T>(path: string, query: Record<string, string | number | string[]>): Promise<T> {
  const url = new URL(path, BACKEND)
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x))
    else url.searchParams.set(k, String(v))
  }
  const res = await fetch(url, {
    headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "" },
    next: { revalidate: REVALIDATE },
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json() as Promise<T>
}

async function listAll(path: string, key: string, fields: string): Promise<Row[]> {
  const out: Row[] = []
  for (let offset = 0; ; offset += PAGE) {
    const page = await api<Record<string, any>>(path, { limit: PAGE, offset, fields })
    const rows = (page[key] || []) as Row[]
    out.push(...rows)
    if (rows.length === 0 || out.length >= (page.count ?? 0)) break
  }
  return out
}

const seg = (handle: string) => encodeURIComponent(handle) // Turkish handles ("endüstriyel-streç-film") must be percent-encoded
const last = (iso?: string) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso) : undefined)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseURL().replace(/\/$/, "")
  const region = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "tr").toLowerCase()
  const home = `${base}/${region}`

  const entries: MetadataRoute.Sitemap = [
    { url: home },
    { url: `${home}/store` },
    { url: `${home}/katalog` },
    // only the two info pages with real text; the legal pages are placeholders until the real texts exist
    { url: `${home}/bilgi/hakkimizda` },
    { url: `${home}/bilgi/bize-ulasin` },
  ]

  try {
    const [categories, collections, products] = await Promise.all([
      listAll("/store/product-categories", "product_categories", "id,handle,updated_at,parent_category_id"),
      listAll("/store/collections", "collections", "handle,updated_at"),
      listAll("/store/products", "products", "handle,updated_at"),
    ])

    // a category page is only listed when it (or one of its sub-categories) holds at least one product
    const direct = await Promise.all(
      categories.map(async (c) => {
        try {
          const r = await api<{ count?: number }>("/store/products", { limit: 1, fields: "id", "category_id[]": [c.id!] })
          return (r.count ?? 0) > 0
        } catch {
          return true // unknown: keep the page rather than drop it
        }
      })
    )
    const byId = new Map(categories.map((c, i) => [c.id!, { c, has: direct[i] }]))
    const filled = new Set<string>()
    byId.forEach(({ has }, id) => {
      if (!has) return
      for (let cur: string | null | undefined = id, n = 0; cur && n < 10; n++) {
        filled.add(cur)
        cur = byId.get(cur)?.c.parent_category_id
      }
    })

    for (const c of categories) {
      if (c.handle && filled.has(c.id!)) entries.push({ url: `${home}/categories/${seg(c.handle)}`, lastModified: last(c.updated_at) })
    }
    for (const c of collections) if (c.handle) entries.push({ url: `${home}/collections/${seg(c.handle)}`, lastModified: last(c.updated_at) })
    for (const p of products) if (p.handle) entries.push({ url: `${home}/products/${seg(p.handle)}`, lastModified: last(p.updated_at) })
  } catch (e) {
    // backend unreachable: the fixed pages above are still a valid sitemap
    console.error("sitemap: catalogue fetch failed", e)
  }

  return entries
}
