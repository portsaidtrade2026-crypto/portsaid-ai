import { getBaseURL } from "@/lib/util/env"
import { Toaster } from "@medusajs/ui"
import { Analytics } from "@vercel/analytics/next"
import { GeistSans } from "geist/font/sans"
import { Metadata } from "next"
import "@/styles/globals.css"
import { getRequestLocale } from "@/lib/i18n/server"
import { I18nProvider } from "@/lib/i18n/provider"
import { Locale } from "@/lib/i18n/config"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const locale = await getRequestLocale()
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-mode="light" className={GeistSans.variable}>
      <body>
        <I18nProvider locale={locale as Locale}>
          <main className="relative">{props.children}</main>
        </I18nProvider>
        <Toaster className="z-[99999]" position="bottom-left" />
        <Analytics />
      </body>
    </html>
  )
}
