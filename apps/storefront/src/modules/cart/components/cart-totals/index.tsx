"use client"

import { useCart } from "@/lib/context/cart-context"
import { convertToLocale } from "@/lib/util/money"
import Divider from "@/modules/common/components/divider"
import { Text } from "@medusajs/ui"
import React from "react"
import { useI18n } from "@/lib/i18n/provider"

const CartTotals: React.FC = () => {
  const { isUpdatingCart, cart } = useCart()
  const { t } = useI18n()

  if (!cart) return null

  const {
    currency_code,
    total,
    item_subtotal,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
  } = cart

  // An unpriced line (unit_price 0, pending a real quote) makes every
  // total genuinely zero, not just small - rendered as a currency-
  // formatted "TRY 0.00" that reads as "this order is free" rather than
  // "pricing is pending." Show pending-quote text there instead of a
  // literal zero whenever any line in the cart carries no real price.
  const hasUnpricedItems = cart.items?.some((item) => !item.unit_price)
  const amountOrPending = (amount: number | null | undefined) =>
    hasUnpricedItems
      ? t("Pending quote")
      : convertToLocale({ amount: amount ?? 0, currency_code })

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle ">
        <div className="flex items-center justify-between">
          <Text className="flex gap-x-1 items-center">
            {t("Subtotal (excl. shipping and taxes)")}
          </Text>
          <Text
            data-testid="cart-item-subtotal"
            data-value={item_subtotal || 0}
          >
            {amountOrPending(item_subtotal)}
          </Text>
        </div>
        {!!discount_total && (
          <div className="flex items-center justify-between">
            <Text>{t("Discount")}</Text>
            <Text
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_total || 0}
            >
              -{" "}
              {convertToLocale({ amount: discount_total ?? 0, currency_code })}
            </Text>
          </div>
        )}
        <div className="flex items-center justify-between">
          <Text>{t("Shipping")}</Text>
          <Text data-testid="cart-shipping" data-value={shipping_total || 0}>
            {amountOrPending(shipping_total)}
          </Text>
        </div>
        <div className="flex justify-between">
          <Text className="flex gap-x-1 items-center ">{t("Taxes")}</Text>
          <Text data-testid="cart-taxes" data-value={tax_total || 0}>
            {amountOrPending(tax_total)}
          </Text>
        </div>
        {!!gift_card_total && (
          <div className="flex items-center justify-between">
            <Text>{t("Gift card")}</Text>
            <Text
              className="text-ui-fg-interactive"
              data-testid="cart-gift-card-amount"
              data-value={gift_card_total || 0}
            >
              -{" "}
              {convertToLocale({ amount: gift_card_total ?? 0, currency_code })}
            </Text>
          </div>
        )}
      </div>
      <Divider className="my-2" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium ">
        <Text className="font-medium">{t("Total")}</Text>
        {isUpdatingCart ? (
          <div className="w-28 h-6 mt-[3px] bg-neutral-200 rounded-full animate-pulse" />
        ) : (
          <Text
            className="txt-xlarge-plus"
            data-testid="cart-total"
            data-value={total || 0}
          >
            {amountOrPending(total)}
          </Text>
        )}
      </div>
    </div>
  )
}

export default CartTotals
