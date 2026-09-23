import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import MedusaCTA from "@/modules/layout/components/medusa-cta"
import ThemeToggle from "@/modules/layout/components/theme-toggle"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mb-2 w-full bg-ui-bg-base relative small:min-h-screen">
      <div className="h-16 bg-ui-bg-base border-b border-ui-border-base">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink className="hover:text-[#705700] dark:hover:text-[#e5c126]" href="/">
            <h1 className="text-base font-semibold flex items-center tracking-[.12em]">
              <span className="bg-[#121212] rounded-md px-2 py-1.5 mr-2"><img src="/portsaid-logo.png" alt="PORTSAID" className="h-8 w-[52px] object-contain" /></span>
              <span className="hidden small:inline">PORTSAID <span className="text-[#a6840d]">/</span> B2B</span>
            </h1>
          </LocalizedClientLink>
          <ThemeToggle />
        </nav>
      </div>
       <div className="relative bg-ui-bg-subtle" data-testid="checkout-container">
        {children}
      </div>
      <div className="py-4 w-full flex items-center justify-center">
        <MedusaCTA />
      </div>
    </div>
  )
}
