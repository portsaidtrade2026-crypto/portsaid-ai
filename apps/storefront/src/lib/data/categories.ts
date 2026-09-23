"use server"

import { sdk } from "@/lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { getRequestLocale } from "@/lib/i18n/server"
import { localizeCategory } from "@/lib/i18n/catalog"

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
