import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import LanguageSwitcher from "@/modules/layout/components/language-switcher"
import ThemeToggle from "@/modules/layout/components/theme-toggle"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mb-2 w-full ps-surface relative small:min-h-screen">
      <div className="h-16 border-b border-[var(--ps-line)]">
        <nav className="flex h-full items-center content-container justify-between gap-3">
          <LocalizedClientLink className="hover:text-ui-fg-base" href="/">
            <h1 className="brand-lockup">
              <span className="brand-plaque">
                <img src="/portsaid-logo.png" alt="Portsaid Plastik" />
              </span>
            </h1>
          </LocalizedClientLink>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      </div>
      <div className="relative bg-[var(--ps-paper)]" data-testid="checkout-container">
        {children}
      </div>
      <div className="py-5 text-center text-xs text-[var(--ps-muted)]">
        © {new Date().getFullYear()} Portsaid Plastik
      </div>
    </div>
  )
}
