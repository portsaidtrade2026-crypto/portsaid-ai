import type { StoreProduct, StoreProductVariant } from "@medusajs/types"
import { track } from "@vercel/analytics"

export type AddToCartEventPayload = {
  lineItems: {
    productVariant: StoreProductVariant & {
      product: StoreProduct
    }
    quantity: number
  }[]
  regionId: string
}

type CartAddEventHandler = (payload: AddToCartEventPayload) => void | Promise<void>

type CartAddEventBus = {
  emitCartAdd: (payload: AddToCartEventPayload) => Promise<void>
  handler: CartAddEventHandler
  registerCartAddHandler: (handler: CartAddEventHandler) => void
}

export const addToCartEventBus: CartAddEventBus = {
  // Awaited now (was fire-and-forget) - the caller's "Add to cart" button needs the real
  // request's completion to clear its own loading state, not just this call returning
  // synchronously before the network request has even gone out. Found live this session:
  // the button looked instantly done, so a user would click again mid-request.
  async emitCartAdd(payload: AddToCartEventPayload) {
    await this.handler(payload)

    for (const lineItem of payload.lineItems) {
      track("add_to_cart", {
        product_name: lineItem.productVariant.title,
        quantity: lineItem.quantity,
      })
    }
  },

  handler: () => {},

  registerCartAddHandler(handler: CartAddEventHandler) {
    this.handler = handler
  },
}
