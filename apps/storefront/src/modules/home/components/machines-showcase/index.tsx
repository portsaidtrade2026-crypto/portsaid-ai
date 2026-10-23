import { translateCatalogValue } from "@/lib/i18n/catalog"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"
import { listProducts } from "@/lib/data/products"
import { getProductPrice } from "@/lib/util/get-product-price"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Thumbnail from "@/modules/products/components/thumbnail"

// The three priced machines, shown side by side on the home page. Handles are the
// Medusa product handles; the order here is the display order.
const HANDLES = [
  "manuel-hidrolik-palet-istif-makinesi",
  "yarım-otomatik-streç-sarma-makinesi",
  "full-otomatik-streç-sarma-makinesi",
]

const NUMBER_LOCALE: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  bg: "bg-BG",
  ar: "ar-EG-u-nu-latn",
}

const MachinesShowcase = async () => {
  const locale = await getRequestLocale()
  const t = (text: string) => translate(locale, text)
  const countryCode = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "tr").toLowerCase()

  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: { handle: HANDLES, limit: HANDLES.length },
  })

  const machines = HANDLES.map((h) =>
    products.find((p) => p.handle?.normalize("NFC") === h.normalize("NFC"))
  ).filter((p): p is NonNullable<typeof p> => !!p)
  if (!machines.length) return null

  const groupName = translateCatalogValue("Makineler", locale)
  const formatPrice = (amount: number, currency: string) => {
    const number = new Intl.NumberFormat(NUMBER_LOCALE[locale] ?? "en-US", {
      maximumFractionDigits: 0,
    }).format(amount)
    const label = currency.toUpperCase() === "TRY" && locale === "tr" ? "TL" : currency.toUpperCase()
    return `${number} ${label}`
  }

  return (
    <div className="content-container py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[var(--ps-muted)] text-xs uppercase tracking-[.24em] font-semibold">
            PS PORT
          </p>
          <h2 className="display-type text-3xl small:text-4xl font-semibold mt-1">
            {groupName}
          </h2>
        </div>
        <LocalizedClientLink
          href="/categories/makineler"
          className="text-sm font-semibold underline underline-offset-4 whitespace-nowrap"
        >
          {translate(locale, "View all {name}").replace("{name}", groupName)}
        </LocalizedClientLink>
      </div>

      <ul className="grid grid-cols-1 small:grid-cols-3 gap-4">
        {machines.map((product) => {
          const { cheapestPrice } = getProductPrice({ product })
          return (
            <li key={product.id} className="flex">
              <LocalizedClientLink
                href={`/products/${product.handle}`}
                className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--ps-line)] bg-[var(--ps-panel)] transition-shadow hover:shadow-lg"
              >
                <div className="bg-[#f4f4f0] p-6 border-b border-[var(--ps-line)]">
                  <Thumbnail
                    thumbnail={product.thumbnail}
                    images={product.images}
                    size="square"
                    className="mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-lg font-semibold leading-snug">{product.title}</h3>
                  {cheapestPrice && (
                    <p className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold" dir="ltr">
                        {formatPrice(
                          Number(cheapestPrice.calculated_price_number),
                          cheapestPrice.currency_code
                        )}
                      </span>
                      <span className="text-xs text-[var(--ps-muted)]">
                        {translateCatalogValue("Excl. VAT", locale)}
                      </span>
                    </p>
                  )}
                  <span className="mt-auto inline-flex w-fit items-center rounded-2xl bg-[var(--ps-ink)] px-5 py-2.5 text-sm font-semibold text-[var(--ps-paper)] transition-opacity group-hover:opacity-85">
                    {t("View details")}
                  </span>
                </div>
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default MachinesShowcase
