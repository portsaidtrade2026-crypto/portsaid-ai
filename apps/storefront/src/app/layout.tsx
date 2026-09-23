import { getBaseURL } from "@/lib/util/env"
import { Toaster } from "@medusajs/ui"
import { Analytics } from "@vercel/analytics/next"
import { GeistSans } from "geist/font/sans"
import { Metadata } from "next"
import "@/styles/globals.css"
import { getRequestLocale } from "@/lib/i18n/server"
import { I18nProvider } from "@/lib/i18n/provider"
import { Locale } from "@/lib/i18n/config"
import { getRequestTheme } from "@/lib/theme/server"

// Apply locally saved preferences before hydration to avoid a light-theme flash
// in an embedded preview where unpartitioned cookies may not be available.
const themeBootstrap = `(function(){try{var theme=localStorage.getItem("portsaid_theme");if(theme==="dark"||theme==="light"){document.documentElement.dataset.mode=theme;document.documentElement.classList.toggle("dark",theme==="dark");document.documentElement.style.colorScheme=theme}}catch(e){}})();`

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getRequestLocale(), getRequestTheme()])
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-mode={theme} className={`${GeistSans.variable} ${theme === "dark" ? "dark" : ""}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
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
