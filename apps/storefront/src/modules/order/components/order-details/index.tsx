import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"
import { getRequestLocale } from "@/lib/i18n/server"
import { commerceTranslations } from "@/lib/i18n/dictionaries/commerce"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetails = async ({ order }: OrderDetailsProps) => {
  const locale = await getRequestLocale()
  const translate = (text: string) =>
    locale === "en" ? text : commerceTranslations[locale]?.[text] || text
  const createdAt = new Date(order.created_at)

  return (
    <>
      <Heading level="h3" className="mb-2">
        Details
      </Heading>

      <div className="text-sm text-ui-fg-subtle overflow-auto">
        <div className="flex justify-between">
           <Text>{translate("Order Number")}</Text>
          <Text>#{order.display_id}</Text>
        </div>

        <div className="flex justify-between mb-2">
           <Text>{translate("Order Date")}</Text>
          <Text>
            {" "}
            {createdAt.getDate()}-{createdAt.getMonth()}-
            {createdAt.getFullYear()}
          </Text>
        </div>

        <Text>
          We have sent the order confirmation details to{" "}
          <span className="font-semibold">{order.email}</span>.
        </Text>
      </div>
    </>
  )
}

export default OrderDetails
