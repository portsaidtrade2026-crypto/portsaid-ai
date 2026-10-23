import { Heading } from "@medusajs/ui"
import { getRequestLocale } from "@/lib/i18n/server"
import { commerceTranslations } from "@/lib/i18n/dictionaries/commerce"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import React from "react"

const Help = async () => {
  const locale = await getRequestLocale()
  const translate = (text: string) =>
    locale === "en" ? text : commerceTranslations[locale]?.[text] || text
  return (
    <div className="mt-6">
      <Heading className="text-base-semi">{translate("Need help?")}</Heading>
      <div className="text-base-regular my-2">
        <ul className="gap-y-2 flex flex-col">
          <li>
            <LocalizedClientLink href="/contact">{translate("Contact")}</LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/contact">
              {translate("Returns & Exchanges")}
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
