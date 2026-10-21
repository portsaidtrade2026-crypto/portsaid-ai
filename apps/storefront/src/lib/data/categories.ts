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
// One small count request per category instead of embedding every product of every category (see lib/util/category-fields.ts).
export const listCategoryHandlesWithProducts = async (): Promise<string[]> => {
  const categories = await listCategories({ fields: LIGHT_CATEGORY_FIELDS }, { localize: false })
  const direct = await Promise.all(
    categories.map((c) =>
      sdk.client
        .fetch<{ count?: number }>("/store/products", {
          query: { limit: 1, fields: "id", category_id: c.id },
          next: { revalidate: 300 },
        })
        .then((r) => (r.count ?? 0) > 0)
    )
  )
  const byId = new Map(categories.map((c, i) => [c.id, { c, has: direct[i] }]))
  const filled = new Set<string>()
  byId.forEach(({ has }, id) => {
    if (!has) return
    for (let cur: string | null | undefined = id, n = 0; cur && n < 10; n++) {
      filled.add(cur)
      cur = byId.get(cur)?.c.parent_category_id
    }
  })
  return categories.filter((c) => filled.has(c.id)).map((c) => c.handle)
}
