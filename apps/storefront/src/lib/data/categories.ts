"use server"

import { sdk } from "@/lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { getRequestLocale } from "@/lib/i18n/server"
import { localizeCategory } from "@/lib/i18n/catalog"
import { LIGHT_CATEGORY_FIELDS } from "@/lib/util/category-fields"

export const listCategories = async (
  query?: Record<string, any>,
  { localize = true }: { localize?: boolean } = {}
): Promise<HttpTypes.StoreProductCategory[]> => {
  // Static-parameter generation has no request cookies; it only needs handles.
  // Resolve the locale before the SDK promise, while request scope is available.
  const locale = localize ? await getRequestLocale() : null
  const next = {
    ...(await getCacheOptions("categories")),
    // public catalogue data: kept for 120 s instead of being fetched again on every page view (2026-10-28, site was slow)
    revalidate: 120,
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children, *products, *parent_category, *parent_category.parent_category,+metadata",
          limit,
          ...query,
        },
        next,
      }
    )
    .then(({ product_categories }) => {
      return locale
        ? product_categories.map((category) => localizeCategory(category, locale))
        : product_categories
    })
}

export const getCategoryByHandle = async (
  categoryHandle: string[]
): Promise<HttpTypes.StoreProductCategory> => {
  const locale = await getRequestLocale()
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
    // public catalogue data: kept for 120 s instead of being fetched again on every page view (2026-10-28, site was slow)
    revalidate: 120,
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products,+metadata",
          handle,
        },
        next,
      }
    )
    .then(({ product_categories }) => {
      return product_categories[0] && localizeCategory(product_categories[0], locale)
    })
}

// Handles of categories that hold at least one product, sub-categories counted (a parent with a non-empty child counts).
// History: this used to send one count request per category (31 of them, ~0.3 s each and they queue up inside Medusa), re-done every
// 5 minutes on a page render - so the first visitor after each expiry waited ~8 s for ANY page (found 2026-10-28, "the site is very slow").
// Now ONE request returns every category with its products (identical result, checked against the old method), the answer is kept in
// memory for 20 minutes, and once it is older it is refreshed in the background while the old answer is still served.
const HANDLES_TTL_MS = 20 * 60 * 1000
let handlesCache: { at: number; handles: string[] } | null = null
let handlesInflight: Promise<string[]> | null = null

type CategoryWithProducts = {
  id: string
  handle: string
  parent_category_id?: string | null
  products?: { id: string }[]
}

async function computeCategoryHandlesWithProducts(): Promise<string[]> {
  const { product_categories } = await sdk.client.fetch<{ product_categories: CategoryWithProducts[] }>(
    "/store/product-categories",
    { query: { limit: 200, fields: "id,handle,parent_category_id,*products" }, cache: "no-store" }
  )
  const byId = new Map(product_categories.map((c) => [c.id, c]))
  const filled = new Set<string>()
  for (const c of product_categories) {
    if (!c.products?.length) continue
    for (let cur: string | null | undefined = c.id, n = 0; cur && n < 10; n++) {
      filled.add(cur)
      cur = byId.get(cur)?.parent_category_id
    }
  }
  return product_categories.filter((c) => filled.has(c.id)).map((c) => c.handle)
}

function refreshCategoryHandles(): Promise<string[]> {
  if (!handlesInflight) {
    handlesInflight = computeCategoryHandlesWithProducts()
      .then((handles) => {
        handlesCache = { at: Date.now(), handles }
        return handles
      })
      .finally(() => {
        handlesInflight = null
      })
  }
  return handlesInflight
}

export const listCategoryHandlesWithProducts = async (): Promise<string[]> => {
  if (handlesCache) {
    if (Date.now() - handlesCache.at > HANDLES_TTL_MS) refreshCategoryHandles().catch(() => {})
    return handlesCache.handles
  }
  try {
    return await refreshCategoryHandles()
  } catch {
    // never take the whole page down because the menu filter failed: show every category instead
    const categories = await listCategories({ fields: LIGHT_CATEGORY_FIELDS }, { localize: false })
    return categories.map((c) => c.handle)
  }
}
