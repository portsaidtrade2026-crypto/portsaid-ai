 "use client"

import { useI18n } from "@/lib/i18n/provider"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

type ItemUnitPriceProps = {
  item: HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
}

const ItemUnitPrice = ({ item, style = "default" }: ItemUnitPriceProps) => {
  const { t } = useI18n()
  const hasReducedPrice = !!item.compare_at_unit_price
  return (
    <div className="flex flex-col text-ui-fg-muted justify-center h-full">
      {hasReducedPrice && (
        <p>
          {style === "default" && (
            <span className="text-ui-fg-muted">{t("Original")}: </span>
          )}
          <span
            className="line-through"
            data-testid="product-unit-original-price"
          >
            {item.compare_at_unit_price}
          </span>
        </p>
      )}
      <span
        className={clx("text-base-regular", {
          "text-ui-fg-interactive": hasReducedPrice,
        })}
        data-testid="product-unit-price"
      >
        {item.unit_price}
      </span>
    </div>
  )
}

export default ItemUnitPrice
