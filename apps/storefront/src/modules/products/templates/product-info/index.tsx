import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  return (
    <div id="product-info" className="min-w-0 w-full">
      <div className="flex min-w-0 flex-col gap-y-4 w-full">
        <Heading
          level="h1"
          className="text-[2.5rem] leading-10 text-ui-fg-base break-words"
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        <Text
          className="text-2xl text-ui-fg-subtle whitespace-pre-line break-words"
          data-testid="product-description"
        >
          {product.subtitle || product.description}
        </Text>
      </div>
    </div>
  )
}

export default ProductInfo
