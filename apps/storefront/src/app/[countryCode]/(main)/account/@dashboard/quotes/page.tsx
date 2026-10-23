import { fetchQuotes } from "@/lib/data/quotes"
import { Heading } from "@medusajs/ui"
import QuotesOverview from "./components/quotes-overview"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

export default async function Quotes() {
  const { quotes } = await fetchQuotes()
  const locale = await getRequestLocale()

  return (
    <div className="w-full" data-testid="quotes-page-wrapper">
      <div className="mb-4">
         <Heading>{translate(locale, "Quotes")}</Heading>
      </div>

      <div>
        <QuotesOverview quotes={quotes!} />
      </div>
    </div>
  )
}
