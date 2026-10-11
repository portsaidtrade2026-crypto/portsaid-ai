import { retrieveCustomer } from "@/lib/data/customer"
import AccountButton from "@/modules/account/components/account-button"
import CartButton from "@/modules/cart/components/cart-button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { MegaMenuWrapper } from "@/modules/layout/components/mega-menu"
import SkeletonAccountButton from "@/modules/skeletons/components/skeleton-account-button"
import SkeletonCartButton from "@/modules/skeletons/components/skeleton-cart-button"
import SkeletonMegaMenu from "@/modules/skeletons/components/skeleton-mega-menu"
import { Suspense } from "react"
import LanguageSwitcher from "@/modules/layout/components/language-switcher"
import HeaderSearch from "@/modules/layout/components/header-search"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"
import ThemeToggle from "@/modules/layout/components/theme-toggle"

export async function NavigationHeader() {
  const locale = await getRequestLocale()
  const t = (text: string) => translate(locale, text)
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <div className="brand-header sticky top-0 inset-x-0 group ps-surface text-[var(--ps-ink)] small:p-4 p-2 text-sm border-b duration-200 border-[var(--ps-line)] z-50">
      <header className="flex w-full content-container relative small:mx-auto justify-between">
        <div className="small:mx-auto flex flex-col small:flex-row small:justify-between items-start small:items-center min-w-0 w-full gap-2">
          <div className="flex items-center small:space-x-4">
            <LocalizedClientLink
              className="hover:text-ui-fg-base flex items-center w-fit"
              href="/"
            >
              <h1 className="brand-lockup">
                <span className="brand-plaque">
                  <img src="/portsaid-logo.png" alt="Portsaid Plastik" />
                </span>
                <small className="hidden medium:block">{t("Industrial supply")}</small>
              </h1>
            </LocalizedClientLink>

            <nav>
              <ul className="space-x-4 flex">
                <li>
                  <Suspense fallback={<SkeletonMegaMenu locale={locale} />}>
                    <MegaMenuWrapper />
                  </Suspense>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex w-full small:w-auto justify-between small:justify-end items-center gap-1 small:gap-2 min-w-0 shrink-0">
            <HeaderSearch />

            <div className="h-4 w-px bg-neutral-300" />
            <LanguageSwitcher />
            <ThemeToggle />

            <Suspense fallback={<SkeletonAccountButton label={t("Log in")} />}>
              <AccountButton customer={customer} locale={locale} />
            </Suspense>

            <Suspense fallback={<SkeletonCartButton locale={locale} />}>
              <CartButton />
            </Suspense>
          </div>
        </div>
      </header>
    </div>
  )
}
