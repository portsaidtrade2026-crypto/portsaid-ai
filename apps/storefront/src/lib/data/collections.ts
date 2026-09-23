"use server"

import { sdk } from "@/lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { getRequestLocale } from "@/lib/i18n/server"
import { localizeCollection } from "@/lib/i18n/catalog"

export const retrieveCollection = async (id: string) => {
  const locale = await getRequestLocale()
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return sdk.client
    .fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {
        query: { fields: "+metadata" },
        next,
      }
    )
    .then(({ collection }) =>
      localizeCollection(collection, locale)
    )
}

export const listCollections = async (
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const locale = await getRequestLocale()
  const next = {
    ...(await getCacheOptions("collections")),
  }

  queryParams.limit = queryParams.limit || "100"
  queryParams.offset = queryParams.offset || "0"

  return sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
      "/store/collections",
      {
        query: queryParams,
        next,
      }
    )
    .then(({ collections }) => {
      return {
        collections: collections.map((collection) =>
          localizeCollection(collection, locale)
        ),
        count: collections.length,
      }
    })
}

export const getCollectionByHandle = async (
  handle: string
): Promise<HttpTypes.StoreCollection> => {
  const locale = await getRequestLocale()
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreCollectionListResponse>(`/store/collections`, {
      query: { handle },
      next,
    })
    .then(({ collections }) =>
      collections[0] &&
      localizeCollection(collections[0], locale)
    )
}
