import { listCategories } from "@/lib/data/categories"
import { Text } from "@medusajs/ui"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"
import { translateCatalogValue } from "@/lib/i18n/catalog"

export default async function Footer() {
  const locale = await getRequestLocale()
  const t = (text: string) => translate(locale, text)
  // fetch enough to find the top-level ones even though most categories
  // returned first are children (Ambalaj Malzemeleri/Makineler subtrees) -
  // filtering after a limit:6 fetch could return zero top-level results
  const product_categories = await listCategories({
    offset: 0,
    limit: 50,
  })

  const topLevelCategories = (product_categories || []).filter(
    (c) => !c.parent_category
  )

  return (
    <footer className="border-t border-[var(--ps-line)] w-full">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-10 xsmall:flex-row items-start justify-between py-16">
          <div>
            <LocalizedClientLink
              href="/"
              className="brand-lockup"
            >
              <img src="/logo-portsaid.png" alt="Portsaid Plastik" />
            </LocalizedClientLink>
            <p className="mt-5 max-w-[220px] text-xs leading-5 text-[var(--ps-muted)]">
              {t("Components and supply for the road ahead. Built for businesses that keep moving.")}
            </p>
          </div>
          <div className="text-small-regular gap-10 small:gap-x-12 grid grid-cols-2 xsmall:grid-cols-5 w-full xsmall:w-auto">
            {topLevelCategories.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  {t("Popular categories")}
                </span>
                <ul
                  className="grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small"
                  data-testid="footer-categories"
                >
                  {topLevelCategories.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/categories/${c.handle}`}
                        data-testid="category-link"
                      >
                        {translateCatalogValue(c.name, locale, c.metadata, "name")}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base">{t("Quick access")}</span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                <li>
                  <LocalizedClientLink href="/bilgi/hakkimizda" className="hover:text-ui-fg-base">{t("About us")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/bilgi/bize-ulasin" className="hover:text-ui-fg-base">{t("Contact us")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/katalog" className="hover:text-ui-fg-base">{t("Catalogue")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/account" className="hover:text-ui-fg-base">{t("Customer account")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/account" className="hover:text-ui-fg-base">{t("Request a quote")}</LocalizedClientLink>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base">{t("Help")}</span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                <li>
                  <LocalizedClientLink href="/bilgi/odeme-secenekleri" className="hover:text-ui-fg-base">{t("Payment options")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/bilgi/kargo-ve-teslimat" className="hover:text-ui-fg-base">{t("Shipping & delivery")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/bilgi/mesafeli-satis-sozlesmesi" className="hover:text-ui-fg-base">{t("Distance sales agreement")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/bilgi/iptal-ve-iade-kosullari" className="hover:text-ui-fg-base">{t("Cancellation & returns")}</LocalizedClientLink>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base">{t("Data protection")}</span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                <li>
                  <LocalizedClientLink href="/bilgi/ticari-elektronik-ileti-onay-metni" className="hover:text-ui-fg-base">{t("E-message consent notice")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/bilgi/gizlilik-ve-guvenlik" className="hover:text-ui-fg-base">{t("Privacy & security")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/bilgi/uyelik-sozlesmesi" className="hover:text-ui-fg-base">{t("Membership agreement")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/bilgi/cerez-politikasi" className="hover:text-ui-fg-base">{t("Cookie policy")}</LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/bilgi/aydinlatma-metni" className="hover:text-ui-fg-base">{t("Disclosure notice")}</LocalizedClientLink>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base">{t("Contact")}</span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                <li>
                  <a href="https://wa.me/902128750605" className="hover:text-ui-fg-base">
                    +90 212 875 0605
                  </a>
                </li>
                <li>
                  <a href="mailto:info@portsaid.com.tr" className="hover:text-ui-fg-base">
                    info@portsaid.com.tr
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex w-full mb-10 justify-between text-ui-fg-muted">
          <Text className="txt-compact-small">
            © {new Date().getFullYear()} Portsaid Plastik. {t("All rights reserved.")}
          </Text>
          <span className="text-xs uppercase tracking-[.18em] text-[var(--ps-muted)]">PS PORT</span>
        </div>
      </div>
    </footer>
  )
}
