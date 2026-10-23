import {
  CheckCircleSolid,
  ExclamationCircleSolid,
  InformationCircleSolid,
} from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

const ProductFacts = async ({ product }: { product: HttpTypes.StoreProduct }) => {
  const managedVariants = product.variants?.filter(
    (variant) => variant.manage_inventory !== false
  )

  const quantities = managedVariants
    ?.map((variant) => variant.inventory_quantity)
    .filter((quantity): quantity is number => typeof quantity === "number")
  const inventoryQuantity = quantities?.length
    ? quantities.reduce((acc, quantity) => acc + quantity, 0)
    : null
  const locale = await getRequestLocale()
  const t = (value: string) => translate(locale, value)

  const hasManageInventory = !!managedVariants?.length

  return (
    <div className="flex flex-col gap-y-2 w-full">
      {hasManageInventory && (inventoryQuantity === null ? (
        <span className="flex items-center gap-x-2 text-neutral-600 text-sm">
          <InformationCircleSolid /> {t("Availability on request")}
        </span>
      ) : inventoryQuantity > 10 ? (
        <span className="flex items-center gap-x-2 text-neutral-600 text-sm">
          <CheckCircleSolid className="text-green-500" /> {t("Can be shipped")}
          ({inventoryQuantity} {t("in stock")})
        </span>
      ) : (
        <span className="flex items-center gap-x-2 text-neutral-600 text-sm ">
          <ExclamationCircleSolid className="text-orange-500" />
          {t("Limited quantity available")} ({inventoryQuantity} {t("in stock")})
        </span>
      ))}
      <span className="flex items-center gap-x-2 text-neutral-600 text-sm">
        {product.mid_code && (
          <>
            <InformationCircleSolid />
            MID: {product.mid_code}
          </>
        )}
      </span>
    </div>
  )
}

export default ProductFacts
