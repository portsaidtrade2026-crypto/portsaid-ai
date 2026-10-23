"use client"

import { clx, Text } from "@medusajs/ui"
import { getProductPrice } from "@/lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { useI18n } from "@/lib/i18n/provider"

export default function ProductPrice({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const { t } = useI18n()
  const { cheapestPrice } = getProductPrice({
    product,
  })

  if (!cheapestPrice) {
    return (
      <div className="flex flex-col text-neutral-950">
        <Text className="font-medium text-xl" data-testid="product-price-on-request">
          {t("Price on request")}
        </Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col text-neutral-950">
      <span
        className={clx({
          "text-ui-fg-interactive": cheapestPrice.price_type === "sale",
        })}
      >
        <Text
          className="font-medium text-xl"
          data-testid="product-price"
          data-value={cheapestPrice.calculated_price_number}
        >
           {t("From")} {cheapestPrice.calculated_price}
        </Text>
        <Text className="text-neutral-600 text-[0.6rem]">
          {t("Excl. VAT")}
        </Text>
      </span>
      {cheapestPrice.price_type === "sale" && (
        <p
          className="line-through text-neutral-500"
          data-testid="original-product-price"
          data-value={cheapestPrice.original_price_number}
        >
          {cheapestPrice.original_price}
        </p>
      )}
    </div>
  )
}
