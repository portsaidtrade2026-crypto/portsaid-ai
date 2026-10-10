import { getProductPrice } from "@/lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"
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

  return (
    // PreviewAddToCart is a sibling, NOT nested inside the Link below - a <button> inside an
    // <a> is invalid HTML (interactive content can't nest) and browsers resolve a click near
    // the boundary inconsistently, more so on touch than a precise mouse click. Found live
    // this session: an imprecise click on the button could trigger the card's own navigation
    // instead of adding to cart, which from a user's perspective looks exactly like "nothing
    // happened, so I click again" - the same symptom the loading-state fix already addressed
    // for the request itself, but this covers the click never reaching the button at all.
    <div
      data-testid="product-wrapper"
      className="group flex flex-col gap-4 relative aspect-[3/5] w-full overflow-hidden p-4 bg-white shadow-borders-base rounded-lg hover:shadow-[0_0_0_4px_rgba(0,0,0,0.1)] transition-shadow ease-in-out duration-150"
    >
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="flex flex-col gap-4 flex-1 min-h-0"
      >
        <div className="w-full h-full p-10">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="square"
            isFeatured={isFeatured}
          />
        </div>
        <Text className="text-ui-fg-base txt-compact-medium" data-testid="product-title">
          {product.title}
        </Text>
        {cheapestPrice && (
          <div className="flex flex-col gap-0">
            <PreviewPrice price={cheapestPrice} />
            <Text className="text-neutral-600 text-[0.6rem]">
              {tCatalog("Excl. VAT")}
            </Text>
          </div>
        )}
      </LocalizedClientLink>
      <PreviewAddToCart
        product={product}
        region={region}
        hasPrice={!!cheapestPrice}
      />
    </div>
  )
}
