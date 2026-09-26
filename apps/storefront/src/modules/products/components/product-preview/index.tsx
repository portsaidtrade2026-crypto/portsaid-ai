import { getProductPrice } from "@/lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { Text, clx } from "@medusajs/ui"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewAddToCart from "./preview-add-to-cart"
import PreviewPrice from "./price"
import { getRequestLocale } from "@/lib/i18n/server"
import { translateCatalogValue } from "@/lib/i18n/catalog"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  if (!product) {
    return null
  }
  const locale = await getRequestLocale()
  const tCatalog = (value: string) =>
    translateCatalogValue(value, locale)

  const { cheapestPrice } = getProductPrice({
    product,
  })

  const trackedVariants = product.variants?.filter(
    (variant) => variant.manage_inventory !== false
  )
  const knownQuantities = trackedVariants
    ?.map((variant) => variant.inventory_quantity)
    .filter((quantity): quantity is number => typeof quantity === "number")
  const inventoryQuantity = knownQuantities?.length
    ? knownQuantities.reduce((acc, quantity) => acc + quantity, 0)
    : null

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div
        data-testid="product-wrapper"
        className="flex flex-col gap-4 relative aspect-[3/5] w-full overflow-hidden p-4 bg-white shadow-borders-base rounded-lg group-hover:shadow-[0_0_0_4px_rgba(0,0,0,0.1)] transition-shadow ease-in-out duration-150"
      >
        <div className="w-full h-full p-10">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="square"
            isFeatured={isFeatured}
          />
        </div>
        <div className="flex flex-col txt-compact-medium">
          <Text className="text-neutral-600 text-xs">{tCatalog("BRAND")}</Text>
          <Text className="text-ui-fg-base" data-testid="product-title">
            {product.title}
          </Text>
        </div>
        <div className="flex flex-col gap-0">
          {cheapestPrice ? (
            <>
              <PreviewPrice price={cheapestPrice} />
              <Text className="text-neutral-600 text-[0.6rem]">
                {tCatalog("Excl. VAT")}
              </Text>
            </>
          ) : (
            <Text
              className="text-neutral-950 font-medium text-lg"
              data-testid="price-on-request"
            >
              {tCatalog("Price on request")}
            </Text>
          )}
        </div>
        <div className="flex justify-between">
          <div className="flex flex-row gap-1 items-center">
            <span
              className={clx({
                "text-green-500": inventoryQuantity !== null && inventoryQuantity > 50,
                "text-orange-500":
                  inventoryQuantity !== null &&
                  inventoryQuantity <= 50 &&
                  inventoryQuantity > 0,
                "text-red-500": inventoryQuantity === 0,
              })}
            >
              •
            </span>
            <Text className="text-neutral-600 text-xs">
              {inventoryQuantity === null
                ? tCatalog("Availability on request")
                : `${inventoryQuantity} ${tCatalog("left")}`}
            </Text>
          </div>
          <PreviewAddToCart
            product={product}
            region={region}
          />
        </div>
      </div>
    </LocalizedClientLink>
  )
}
