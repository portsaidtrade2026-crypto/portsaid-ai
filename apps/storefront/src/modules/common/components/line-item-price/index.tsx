import { convertToLocale } from "@/lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx, Text } from "@medusajs/ui"
import { useI18n } from "@/lib/i18n/provider"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  className?: string
  currencyCode: string
}

const LineItemPrice = ({
  item,
  style = "default",
  className,
  currencyCode,
}: LineItemPriceProps) => {
  const { t } = useI18n()
  const adjustmentsSum = (item.adjustments || []).reduce(
    (acc, adjustment) => adjustment.amount + acc,
    0
  )

  const originalPrice = item.original_total ?? 0 / item.quantity

  const currentPrice = item.total ?? 0 / item.quantity - adjustmentsSum

  const hasReducedPrice = currentPrice < originalPrice

  // A request-quote item has no real price - Medusa still stores a
  // resolvable numeric unit_price of 0 for it, which would otherwise render
  // as a real "€0.00" (and, worse, be payable as free at checkout).
  if (!item.unit_price) {
    return (
      <Text className={clx("text-ui-fg-subtle", className)}>
        {t("Price on request")}
      </Text>
    )
  }

  return (
    <Text
      className={clx(
        "flex flex-col gap-x-2 text-ui-fg-subtle items-end",
        className
      )}
    >
      <span className="flex flex-col text-left">
        {hasReducedPrice && (
          <>
            <span
              className="line-through text-ui-fg-muted"
              data-testid="product-original-price"
            >
              {convertToLocale({
                amount: originalPrice,
                currency_code: currencyCode ?? "eur",
              })}
            </span>

            {style === "default" && (
              <span className="text-base-regular text-ui-fg-interactive">
                -
                {convertToLocale({
                  amount: adjustmentsSum,
                  currency_code: currencyCode ?? "eur",
                })}
              </span>
            )}
          </>
        )}
        <span className="text-base-regular" data-testid="product-price">
          {convertToLocale({
            amount: currentPrice,
            currency_code: currencyCode ?? "eur",
          })}
        </span>
      </span>
    </Text>
  )
}

export default LineItemPrice
