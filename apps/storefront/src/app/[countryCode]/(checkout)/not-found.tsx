import InteractiveLink from "@/modules/common/components/interactive-link"
import { getRequestLocale } from "@/lib/i18n/server"
import { commerceTranslations } from "@/lib/i18n/dictionaries/commerce"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default async function NotFound() {
  const locale = await getRequestLocale()
  const translate = (text: string) =>
    locale === "en" ? text : commerceTranslations[locale]?.[text] || text
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">{translate("Page not found")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {translate("The page you tried to access does not exist.")}
      </p>
      <InteractiveLink href="/">{translate("Go to frontpage")}</InteractiveLink>
    </div>
  )
}
