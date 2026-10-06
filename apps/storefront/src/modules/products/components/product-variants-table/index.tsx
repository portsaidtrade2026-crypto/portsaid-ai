"use client"

import { addToCartEventBus } from "@/lib/data/cart-event-bus"
import { getProductPrice } from "@/lib/util/get-product-price"
import { HttpTypes, StoreProduct, StoreProductVariant } from "@medusajs/types"
import { clx, Table } from "@medusajs/ui"
import Button from "@/modules/common/components/button"
import ShoppingBag from "@/modules/common/icons/shopping-bag"
import { useState } from "react"
import { useI18n } from "@/lib/i18n/provider"
import { translateOptionValue } from "@/lib/i18n/catalog"
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
      {/* Stacked cards instead of a wide table below "medium" (1280px) - not
          just on phones. At "small" (1024px) the two-column product layout
          only leaves ~310px for this column, but the table needs 500px+ and
          was overflowing straight past the visible page with no visual cue
          it could even scroll - the quantity input and add-to-cart button
          ended up off-screen. Cards don't need that width. */}
      <div className="medium:hidden flex flex-col gap-3 w-full">
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
                <BulkTableQuantity
                  variantId={variant.id}
                  onChange={handleQuantityChange}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden medium:block overflow-x-auto w-full min-w-0 p-px">
        <Table className="w-full rounded-xl overflow-hidden shadow-borders-base border-none ">
          <Table.Header className="border-t-0">
            <Table.Row className="bg-neutral-100 border-none hover:!bg-neutral-100">
              <Table.HeaderCell className="px-4">{t("SKU")}</Table.HeaderCell>
              {product.options?.map((option) => {
                if (option.title === "Default option") {
                  return null
                }
                return (
                  <Table.HeaderCell key={option.id} className="px-4 border-x">
                    {t(option.title || "")}
                  </Table.HeaderCell>
                )
              })}
              <Table.HeaderCell className="px-4 border-x">
                {t("Price")}
              </Table.HeaderCell>
              <Table.HeaderCell className="px-4">{t("Quantity")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body className="border-none">
            {product.variants?.map((variant, index) => {
              const { variantPrice } = getProductPrice({
                product,
                variantId: variant.id,
              })

              return (
                <Table.Row
                  key={variant.id}
                  className={clx({
                    "border-b-0": index === product.variants?.length! - 1,
                  })}
                >
                  <Table.Cell className="px-4">{variant.sku}</Table.Cell>
                  {/* Neither product.options (headers) nor variant.options
                      (values) carries an explicit rank in the database, and
                      each is fetched via a different join path - their array
                      order can diverge per product depending on when each
                      option/value was linked, silently shifting every value
                      one or more columns from its real header. Look each
                      value up by option_id and render in product.options'
                      order instead of zipping the two arrays by index. */}
                  {product.options?.map((option) => {
                    if (option.title === "Default option") {
                      return null
                    }
                    const value = variant.options?.find(
                      (o) => o.option_id === option.id
                    )?.value
                    // Render an empty cell (not a skipped one) when this
                    // variant has no value for the option - some variants
                    // in a family don't carry every attribute, and skipping
                    // the cell outright would shift the rest of that row
                    // out of alignment with the header row.
                    // translateOptionValue resolves colors via the catalog
                    // dictionary and swaps measurement units (Mic/kg/gr/...)
                    // per locale, falling back to the raw value unchanged.
                    return (
                      <Table.Cell key={option.id} className="px-4 border-x">
                        {value && value !== "Default option value"
                          ? translateOptionValue(value, locale)
                          : ""}
                      </Table.Cell>
                    )
                  })}
                  <Table.Cell className="px-4 border-x">
                    {variantPrice?.calculated_price || (
                      <span className="text-neutral-500">
                        {t("Price on request")}
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="pl-1 !pr-1">
                    <BulkTableQuantity
                      variantId={variant.id}
                      onChange={handleQuantityChange}
                    />
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
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
