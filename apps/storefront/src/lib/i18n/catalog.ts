import { HttpTypes } from "@medusajs/types"
import { catalogTranslations } from "./dictionaries/catalog"
import { productTitleTranslations } from "./dictionaries/product-titles"
import { Locale } from "./config"

type TranslationMetadata = {
  translations?: Record<string, Record<string, string>>
}

const LOCAL_MEDIA_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

export const toStorefrontMediaUrl = (
  value: string | null | undefined
): string | null | undefined => {
  if (!value) return value

  let pathname: string
  let search = ""

  if (value.startsWith("/static/")) {
    pathname = value
  } else {
    try {
      const url = new URL(value)
      if (
        url.protocol !== "http:" ||
        !LOCAL_MEDIA_HOSTS.has(url.hostname) ||
        !url.pathname.startsWith("/static/")
      ) {
        return value
      }
      pathname = url.pathname
      search = url.search
    } catch {
      return value
    }
  }

  const filename = pathname.slice("/static/".length)
  if (!filename || filename.includes("/") || filename.toLowerCase().startsWith("private-")) {
    return value
  }

  return `/api/medusa-media/${filename}${search}`
}

const fromMetadata = (
  value: string | null | undefined,
  metadata: unknown,
  locale: Locale,
  field: string
) => {
  const translations = (metadata as TranslationMetadata | null)?.translations
  return translations?.[locale]?.[field] || translations?.en?.[field] || ""
}

export const translateCatalogValue = (
  value: string | null | undefined,
  locale: Locale = "en",
  metadata?: unknown,
  field = "value"
) => {
  if (!value) return ""
  return (
    fromMetadata(value, metadata, locale, field) ||
    catalogTranslations[locale]?.[value] ||
    value
  )
}

export const translateProductTitle = (
  title: string | null | undefined,
  handle: string | null | undefined,
  locale: Locale = "en"
) => {
  if (!title) return ""
  if (!handle || locale === "tr") return title
  let decoded = handle
  try {
    decoded = decodeURIComponent(handle)
  } catch {}
  return (
    productTitleTranslations[decoded.normalize("NFC")]?.[
      locale as "en" | "bg" | "ar"
    ] || title
  )
}

export const localizeProduct = (
  product: HttpTypes.StoreProduct,
  locale: Locale = "en"
): HttpTypes.StoreProduct => ({
  ...product,
  thumbnail: toStorefrontMediaUrl(product.thumbnail) ?? null,
  images:
    product.images?.map((image) => ({
      ...image,
      url: toStorefrontMediaUrl(image.url) || image.url,
    })) ?? null,
  // NOT translateCatalogValue(..., "name"): metadata.translations.*.name is a
  // generic per-concept label shared by every sibling family in a category, so
  // swapping it in made every product in a category show the same title.
  // Per-product titles come from productTitleTranslations (keyed by handle).
  title: translateProductTitle(product.title, product.handle, locale),
  subtitle: translateCatalogValue(
    product.subtitle,
    locale,
    product.metadata,
    "subtitle"
  ),
  description:
    product.handle === "wireless-rechargeable-mouse-multi-touch-surface"
      ? {
          tr: "Bu kablosuz fare, çoklu dokunmatik yüzeyiyle hassas ve rahat kontrol sağlar. Şarj edilebilir pili ve uyumlu bilgisayarlarla otomatik eşleşmesi sayesinde günlük kullanım için pratiktir.",
          bg: "Тази безжична мишка с Multi-Touch повърхност осигурява прецизен и удобен контрол. Акумулаторната батерия и автоматичното свързване я правят практична за ежедневна употреба.",
          ar: "توفر هذه الفأرة اللاسلكية ذات السطح متعدد اللمس تحكمًا دقيقًا ومريحًا. بطاريتها القابلة للشحن والاقتران التلقائي يجعلانها عملية للاستخدام اليومي.",
        }[locale as "tr" | "bg" | "ar"] ||
        translateCatalogValue(
          product.description,
          locale,
          product.metadata,
          "description"
        )
      : translateCatalogValue(
          product.description,
          locale,
          product.metadata,
          "description"
        ),
})

export const localizeCategory = (
  category: HttpTypes.StoreProductCategory,
  locale: Locale = "en"
): HttpTypes.StoreProductCategory => ({
  ...category,
  name: translateCatalogValue(category.name, locale, category.metadata, "name"),
  description: translateCatalogValue(
    category.description,
    locale,
    category.metadata,
    "description"
  ),
  category_children: category.category_children?.map((child) =>
    localizeCategory(child, locale)
  ),
})

export const localizeCollection = (
  collection: HttpTypes.StoreCollection,
  locale: Locale = "en"
): HttpTypes.StoreCollection => ({
  ...collection,
  title: translateCatalogValue(collection.title, locale, collection.metadata, "title"),
})