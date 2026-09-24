"use client"

import { addToCartEventBus } from "@/lib/data/cart-event-bus"
import { StoreProduct, StoreRegion } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import ShoppingBag from "@/modules/common/icons/shopping-bag"
import { useState } from "react"

const PreviewAddToCart = ({
  product,
  region,
  disabled,
}: {
  product: StoreProduct
  region: StoreRegion
  disabled?: boolean
}) => {
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = async () => {
    // Defense in depth: never add a variant with no resolvable price to the
    // cart, even if this handler is somehow triggered while `disabled`.
    if (disabled || !product?.variants?.[0]?.id) return null

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
  if (disabled) {
    return null
  }

  return (
    <Button
      className="rounded-full p-3 border-none shadow-none"
      onClick={(e) => {
        e.preventDefault()
        handleAddToCart()
      }}
      isLoading={isAdding}
    >
      <ShoppingBag fill="#fff" />
    </Button>
  )
}

export default PreviewAddToCart
