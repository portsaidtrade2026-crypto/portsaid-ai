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

// Bulgarian uses Cyrillic metric abbreviations, not the Latin ones (Mic/kg/
// gr/m/cm/mm) this catalog's option values are stored with - a flat
// catalogTranslations lookup can't cover every "<number> <unit>" combination,
// so the unit suffix is matched and swapped separately, keeping the number
// (and its locale-specific decimal formatting as typed by the ERP) intact.
// English and Arabic keep the Latin abbreviations as-is (both read fine with
// them in this industry), so only "bg" has an entry here.
const UNIT_SUFFIX_TRANSLATIONS: Partial<Record<Locale, Record<string, string>>> = {
  bg: { Mic: "мкм", kg: "кг", gr: "г", mm: "мм", cm: "см", m: "м" },
  // "gr" is the ERP's Turkish-style gram abbreviation, not standard English
  // (where it reads as "grain", an old imperial unit) - the correct SI
  // abbreviation is "g". Mic/kg/m/cm/mm are already correct English SI.
  en: { gr: "g" },
}
const UNIT_SUFFIX_PATTERN = /^([\d.,]+)\s*(Mic|kg|gr|mm|cm|m)$/

export const translateOptionValue = (
  value: string | null | undefined,
  locale: Locale = "en"
) => {
  if (!value) return ""
  const dictHit = catalogTranslations[locale]?.[value]
  if (dictHit) return dictHit
  const match = value.match(UNIT_SUFFIX_PATTERN)
  const unit = match && UNIT_SUFFIX_TRANSLATIONS[locale]?.[match[2]]
  return unit ? `${match![1]} ${unit}` : value
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