"use client"

import { addToCartEventBus } from "@/lib/data/cart-event-bus"
import { StoreProduct, StoreRegion } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import ShoppingBag from "@/modules/common/icons/shopping-bag"
import { useState } from "react"
import { useI18n } from "@/lib/i18n/provider"

const PreviewAddToCart = ({
  product,
  region,
  hasPrice,
}: {
  product: StoreProduct
  region: StoreRegion
  hasPrice: boolean
}) => {
  const { t } = useI18n()
  const [isAdding, setIsAdding] = useState(false)

  // Unpriced variants are addable on purpose: this B2B storefront's
  // request-a-quote flow depends on being able to add unpriced items to the
  // cart, then converting that cart to a quote (see RequestQuotePrompt).
  const handleAddToCart = async () => {
    if (!product?.variants?.[0]?.id) return null

    setIsAdding(true)

    addToCartEventBus.emitCartAdd({
      lineItems: [
        {
          productVariant: {
            ...product?.variants?.[0],
            product,
          },
          quantity: 1,
        },
      ],
      regionId: region.id,
    })

    setIsAdding(false)
  }

  return (
    <Button
      className="w-full rounded-full gap-2 border-none shadow-none"
      onClick={(e) => {
        e.preventDefault()
        handleAddToCart()
      }}
      isLoading={isAdding}
    >
      <ShoppingBag fill="#fff" />
      {hasPrice ? t("Add to cart") : t("Request a quote")}
    </Button>
  )
}

export default PreviewAddToCart
