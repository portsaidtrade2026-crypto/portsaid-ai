"use client"

import { addToCartEventBus } from "@/lib/data/cart-event-bus"
import { getProductPrice } from "@/lib/util/get-product-price"
import { HttpTypes, StoreProduct, StoreProductVariant } from "@medusajs/types"
import Button from "@/modules/common/components/button"
import ShoppingBag from "@/modules/common/icons/shopping-bag"
import { useState } from "react"
import { useI18n } from "@/lib/i18n/provider"
import { translateOptionValue } from "@/lib/i18n/catalog"
import { getStretchFilmCartonQty } from "@/lib/util/stretch-film-moq"
import BulkTableQuantity from "../bulk-table-quantity"

const ProductVariantsTable = ({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) => {
  const { t, locale } = useI18n()
  const [isAdding, setIsAdding] = useState(false)
  const [lineItemsMap, setLineItemsMap] = useState<
    Map<
      string,
      StoreProductVariant & {
        product: StoreProduct
        quantity: number
      }
    >
  >(new Map())

  const totalQuantity = Array.from(lineItemsMap.values()).reduce(
    (acc, curr) => acc + curr.quantity,
    0
  )

  const handleQuantityChange = (variantId: string, quantity: number) => {
    setLineItemsMap((prev) => {
      const newLineItems = new Map(prev)

      if (!prev.get(variantId)) {
        newLineItems.set(variantId, {
          ...product.variants?.find((v) => v.id === variantId)!,
          product,
          quantity,
        })
      } else {
        newLineItems.set(variantId, {
          ...prev.get(variantId)!,
          quantity,
        })
      }

      return newLineItems
    })
  }

  const handleAddToCart = async () => {
    setIsAdding(true)

    // Unpriced variants are NOT filtered out here: this B2B storefront's
    // whole request-a-quote flow depends on adding unpriced items to the
    // cart, then converting that cart to a quote instead of checking out
    // directly (see RequestQuotePrompt: "Add products to your cart" ->
    // "Open cart & click Request a quote"). Filtering them out here would
    // make every unpriced product impossible to request at all.
    const lineItems = Array.from(lineItemsMap.entries()).map(
      ([variantId, { quantity, ...variant }]) => ({
        productVariant: {
          ...variant,
        },
        quantity,
      })
    )

    addToCartEventBus.emitCartAdd({
      lineItems,
      regionId: region.id,
    })

    setIsAdding(false)
  }

  // Non-"Default option" columns, same filter the table header uses - shared
  // so the mobile cards list exactly the same attributes in the same order.
  const visibleOptions = (product.options || []).filter(
    (option) => option.title !== "Default option"
  )

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Stacked cards at every screen size, not a table - Ahmed's explicit
          call after trying it live: a wide table with many attribute
          columns (thickness/width/length/weight/core weight/color...)
          needed horizontal scrolling to reach price/quantity even on a
          normal desktop width, and he didn't want a scroll-to-find-the-
          button interaction at all, on any screen size. One layout,
          always full width, nothing to scroll sideways to reach. */}
      <div className="flex flex-col gap-3 w-full">
        {product.variants?.map((variant) => {
          const { variantPrice } = getProductPrice({
            product,
            variantId: variant.id,
          })
          return (
            <div
              key={variant.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4"
            >
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>{t("SKU")}</span>
                <span>{variant.sku}</span>
              </div>
              {visibleOptions.map((option) => {
                const value = variant.options?.find(
                  (o) => o.option_id === option.id
                )?.value
                if (!value || value === "Default option value") return null
                return (
                  <div
                    key={option.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-neutral-500">{t(option.title || "")}</span>
                    <span>{translateOptionValue(value, locale)}</span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between font-medium">
                <span>{t("Price")}</span>
                <span>
                  {variantPrice?.calculated_price || (
                    <span className="text-neutral-500 font-normal">
                      {t("Price on request")}
                    </span>
                  )}
                </span>
              </div>
              <div className="pt-1">
                {(() => {
                  const cartonQty = getStretchFilmCartonQty(variant.title)
                  return (
                    <>
                      {cartonQty > 1 && (
                        <p className="text-xs text-neutral-500 mb-1">
                          {t("Sold by the carton: {count} per carton", { count: cartonQty })}
                        </p>
                      )}
                      <BulkTableQuantity
                        variantId={variant.id}
                        onChange={handleQuantityChange}
                        minQuantity={cartonQty}
                      />
                    </>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
      <Button
        onClick={handleAddToCart}
        variant="primary"
        className="w-full h-10"
        isLoading={isAdding}
        disabled={totalQuantity === 0}
        data-testid="add-product-button"
      >
        <ShoppingBag
          className="text-white"
          fill={totalQuantity === 0 ? "none" : "#fff"}
        />
        {totalQuantity === 0
           ? t("Choose product variant(s) above")
           : t("Add to cart")}
      </Button>
    </div>
  )
}

export default ProductVariantsTable
