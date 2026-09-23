import { retrieveCart } from "@/lib/data/cart"
import { retrieveCustomer } from "@/lib/data/customer"
import AccountButton from "@/modules/account/components/account-button"
import CartButton from "@/modules/cart/components/cart-button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import FilePlus from "@/modules/common/icons/file-plus"
import { MegaMenuWrapper } from "@/modules/layout/components/mega-menu"
import { RequestQuoteConfirmation } from "@/modules/quotes/components/request-quote-confirmation"
import { RequestQuotePrompt } from "@/modules/quotes/components/request-quote-prompt"
import SkeletonAccountButton from "@/modules/skeletons/components/skeleton-account-button"
import SkeletonCartButton from "@/modules/skeletons/components/skeleton-cart-button"
import SkeletonMegaMenu from "@/modules/skeletons/components/skeleton-mega-menu"
import { Suspense } from "react"
import LanguageSwitcher from "@/modules/layout/components/language-switcher"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"
import ThemeToggle from "@/modules/layout/components/theme-toggle"

export async function NavigationHeader() {
  const locale = await getRequestLocale()
  const t = (text: string) => translate(locale, text)
  const customer = await retrieveCustomer().catch(() => null)
  const cart = await retrieveCart()

  return (
    <div className="sticky top-0 inset-x-0 group bg-ui-bg-base text-ui-fg-base small:p-4 p-2 text-sm border-b duration-200 border-ui-border-base z-50">
      <header className="flex w-full content-container relative small:mx-auto justify-between">
        <div className="small:mx-auto flex flex-col small:flex-row small:justify-between items-start small:items-center min-w-full gap-2 small:gap-0">
          <div className="flex items-center small:space-x-4">
              <LocalizedClientLink
               className="hover:text-[#705700] dark:hover:text-[#e5c126] flex items-center w-fit"
              href="/"
            >
                <h1 className="small:text-base text-sm font-semibold flex items-center">
                 <span className="bg-[#121212] rounded-md px-2 py-1.5 me-2 flex items-center">
                   <img src="/portsaid-logo.png" alt="PORTSAID" className="h-8 w-[52px] object-contain" />
                 </span>
                 <span className="hidden small:inline tracking-[.12em]">PORTSAID <span className="text-[#a6840d]">/</span> B2B</span>
              </h1>
            </LocalizedClientLink>

            <nav>
              <ul className="space-x-4 hidden small:flex">
                <li>
                  <Suspense fallback={<SkeletonMegaMenu />}>
                    <MegaMenuWrapper />
                  </Suspense>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex w-full small:w-auto justify-between small:justify-end items-center gap-1 small:gap-2">
            <div className="relative mr-2 hidden small:inline-flex">
              <input
                disabled
                type="text"
                placeholder={t("Search for products")}
              className="bg-ui-bg-subtle text-ui-fg-base px-4 py-2 rounded-full pe-10 border border-ui-border-base hidden small:inline-block hover:cursor-not-allowed"
                title={t("Install a search provider to enable product search")}
              />
            </div>

            <div className="h-4 w-px bg-neutral-300" />
            <LanguageSwitcher />
            <ThemeToggle />

            {customer && cart?.items && cart.items.length > 0 ? (
              <RequestQuoteConfirmation>
                <button
                  className="flex gap-1.5 items-center rounded-2xl bg-none shadow-none border-none hover:bg-neutral-100 px-2 py-1"
                  // disabled={isPendingApproval}
                >
                  <FilePlus />
                  <span className="hidden small:inline-block">{t("Quote")}</span>
                </button>
              </RequestQuoteConfirmation>
            ) : (
              <RequestQuotePrompt>
                <button className="flex gap-1.5 items-center rounded-2xl bg-none shadow-none border-none hover:bg-neutral-100 px-2 py-1">
                  <FilePlus />
                  <span className="hidden small:inline-block">{t("Quote")}</span>
                </button>
              </RequestQuotePrompt>
            )}

            <Suspense fallback={<SkeletonAccountButton />}>
              <AccountButton customer={customer} />
            </Suspense>

            <Suspense fallback={<SkeletonCartButton />}>
              <CartButton />
            </Suspense>
          </div>
        </div>
      </header>
    </div>
  )
}
