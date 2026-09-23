import InteractiveLink from "@/modules/common/components/interactive-link"
import { Metadata } from "next"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default async function NotFound() {
  const locale = await getRequestLocale()
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
       <h1 className="text-2xl-semi text-ui-fg-base">{translate(locale, "Page not found")}</h1>
      <p className="text-small-regular text-ui-fg-base">
         {translate(locale, "The cart you tried to access does not exist. Clear your cookies and try again.")}
      </p>
       <InteractiveLink href="/">{translate(locale, "Go to frontpage")}</InteractiveLink>
    </div>
  )
}
