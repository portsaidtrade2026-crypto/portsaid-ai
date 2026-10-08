"use client"

import { useCart } from "@/lib/context/cart-context"
import AddNoteButton from "@/modules/cart/components/add-note-button"
import { translateProductTitle } from "@/lib/i18n/catalog"
import { useI18n } from "@/lib/i18n/provider"
import DeleteButton from "@/modules/common/components/delete-button"
import LineItemPrice from "@/modules/common/components/line-item-price"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Spinner from "@/modules/common/icons/spinner"
import Thumbnail from "@/modules/products/components/thumbnail"
import { HttpTypes } from "@medusajs/types"
import { clx, Container, Input } from "@medusajs/ui"
import { startTransition, useEffect, useState } from "react"
import { clampToCartonMinimum, getStretchFilmCartonQty } from "@/lib/util/stretch-film-moq"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  showBorders?: boolean
  currencyCode: string
  disabled?: boolean
}

const ItemFull = ({
  item,
  showBorders = true,
  currencyCode,
  disabled,
}: ItemProps) => {
  const { locale } = useI18n()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [quantity, setQuantity] = useState(item.quantity.toString())

  const { handleDeleteItem, handleUpdateCartQuantity } = useCart()

  // Same carton-size floor as the product page's quantity picker (see
  // stretch-film-moq) - the cart's own +/- shouldn't let a customer drop
  // a stretch-film line into a partial-carton quantity it was never
  // orderable at in the first place.
  const cartonQty = getStretchFilmCartonQty(item.variant?.title ?? item.product_title)

  // The +/- buttons step by whole units but must never land between 1 and
  // cartonQty-1: going up from 0 jumps straight to a full carton, and
  // going down out of the carton minimum drops straight to 0 (not a
  // partial carton) rather than bouncing back up to the minimum the way
  // changeQuantity's own clamp would for typed input.
  const stepQuantity = (direction: 1 | -1) => {
    const current = item.quantity
    if (direction === 1) {
      changeQuantity(current === 0 && cartonQty > 1 ? cartonQty : current + 1)
    } else {
      const next = current - 1
      changeQuantity(next < cartonQty ? 0 : next)
    }
  }

  const changeQuantity = async (requestedQuantity: number) => {
    const newQuantity = clampToCartonMinimum(requestedQuantity, cartonQty)
    setError(null)
    // Blocks the +/-/input controls for the duration of the request - was
    // previously commented out, which let rapid clicks fire several
    // concurrent update requests for the same line item. Medusa processes
    // them out of order (each one recalculates the cart from whatever
    // state it reads at that moment), so the last response to land can
    // silently undo an earlier click, or two overlapping writes can
    // conflict and surface as "Failed to update cart quantity" - matching
    // exactly what Ahmed saw (sometimes an error, sometimes the click is
    // just lost).
    setUpdating(true)

    // 0 means "remove this line" - Medusa's line-item UPDATE endpoint
    // rejects a quantity of 0 (a cart line can't exist at zero; removal is
    // its own DELETE call), so routing a clamped-to-zero result through
    // handleUpdateCartQuantity instead of handleDeleteItem surfaced as
    // "Failed to update cart quantity" on a real cart - caught live by
    // Ahmed stepping a 25cm stretch-film line down below its carton
    // minimum (10cm -> 30/carton, stepping "-" from 2 clamps to 0).
    if (newQuantity <= 0) {
      startTransition(() => {
        setQuantity("0")
      })
      await handleDeleteItem(item.id)
      setUpdating(false)
      return
    }

    startTransition(() => {
      setQuantity(newQuantity.toString())
    })

    await handleUpdateCartQuantity(item.id, Number(newQuantity))
    setUpdating(false)
  }

  useEffect(() => {
    setQuantity(item.quantity.toString())
  }, [item.quantity])

  const handleBlur = (value: number) => {
    if (value === item.quantity) {
      return
    }

    if (value > maxQuantity) {
      changeQuantity(maxQuantity)
      return
    }

    // changeQuantity's own clamp already routes anything <= 0 to a real
    // delete - no need for a separate handleDeleteItem call here (the
    // previous version called both, unconditionally, for every blur).
    changeQuantity(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return
    }

    if (e.key === "Enter") {
      changeQuantity(Number(quantity))
    }

    if (e.key === "ArrowUp" && e.shiftKey) {
      e.preventDefault()
      setQuantity((Number(quantity) + 10).toString())
    }

    if (e.key === "ArrowDown" && e.shiftKey) {
      e.preventDefault()
      setQuantity((Number(quantity) - 10).toString())
    }
  }

  const maxQuantity = item.variant?.inventory_quantity ?? 100

  return (
    <Container
      className={clx("flex gap-4 w-full h-full items-center justify-between", {
        "shadow-none": !showBorders,
      })}
    >
      <div className="flex gap-x-4 items-start">
        <LocalizedClientLink href={`/products/${item.product_handle}`}>
          <Thumbnail
            thumbnail={item.thumbnail}
            size="square"
            type="full"
            className="bg-neutral-100 rounded-lg w-20 h-20"
          />
        </LocalizedClientLink>
        <div className="flex flex-col gap-y-2 justify-between min-h-full self-stretch">
          <div className="flex flex-col">
            <span className="txt-medium-plus text-neutral-950">
              {translateProductTitle(item.product?.title, item.product?.handle, locale, item.product?.metadata)}
            </span>
            {/* This catalog is mostly single-variant products whose
                variant title is just the product's own raw Turkish title
                again - showing it unconditionally duplicated the line
                right under the (already-translated) title above. Only
                show it when it's actually different information. */}
            {item.variant?.title &&
              item.variant.title !== item.product?.title && (
                <span className="text-neutral-600 text-xs">
                  {item.variant.title}
                </span>
              )}
          </div>
          <div className="flex small:flex-row flex-col gap-2">
            <LineItemPrice
              className="flex small:hidden self-start"
              item={item}
              currencyCode={currencyCode}
            />
            <div className="flex gap-x-2">
              <div className="flex gap-x-3 shadow-[0_0_0_1px_rgba(0,0,0,0.1)] rounded-full w-fit p-px items-center">
                <button
                  className={clx(
                    "w-4 h-4 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-full text-md",
                    disabled || updating ? "opacity-50 pointer-events-none" : "opacity-100"
                  )}
                  onClick={() => stepQuantity(-1)}
                  disabled={item.quantity <= 1 || disabled || updating}
                >
                  -
                </button>
                <span className="w-4 h-4 flex items-center justify-center text-neutral-950 text-xs">
                  {updating ? (
                    <Spinner size="12" />
                  ) : (
                    <Input
                      className={clx(
                        "w-10 h-4 flex items-center justify-center text-center text-neutral-950 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent shadow-none",
                        disabled
                          ? "opacity-50 pointer-events-none"
                          : "opacity-100"
                      )}
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value)
                      }}
                      onBlur={(e) => {
                        handleBlur(Number(e.target.value))
                      }}
                      onKeyDown={(e) => handleKeyDown(e)}
                      disabled={disabled}
                    />
                  )}
                </span>
                <button
                  className={clx(
                    "w-4 h-4 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-full text-md",
                    disabled || updating ? "opacity-50 pointer-events-none" : "opacity-100"
                  )}
                  onClick={() => stepQuantity(1)}
                  disabled={item.quantity >= maxQuantity || disabled || updating}
                >
                  +
                </button>
              </div>

              <DeleteButton id={item.id} disabled={disabled} />
            </div>
            <AddNoteButton
              item={item as HttpTypes.StoreCartLineItem}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start justify-between min-h-full self-stretch">
        <LineItemPrice
          className="hidden small:flex"
          item={item}
          currencyCode={currencyCode}
          style="default"
        />
      </div>
    </Container>
  )
}

export default ItemFull
