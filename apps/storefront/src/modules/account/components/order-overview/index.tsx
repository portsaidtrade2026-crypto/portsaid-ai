"use client"

import OrderCard from "@/modules/account/components/order-card"
import Button from "@/modules/common/components/button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { useI18n } from "@/lib/i18n/provider"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  const { t } = useI18n()
  if (orders?.length) {
    return (
      <div className="flex flex-col gap-y-2 w-full">
        {orders.map((o) => (
          <div key={o.id}>
            <OrderCard order={o} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center gap-y-4"
      data-testid="no-orders-container"
    >
       <h2 className="text-large-semi">{t("Nothing to see here")}</h2>
      <p className="text-base-regular">
        {t("You don't have any orders yet, let us change that")} {":)"}
      </p>
      <div className="mt-4">
        <LocalizedClientLink href="/" passHref>
          <Button data-testid="continue-shopping-button">
             {t("Continue shopping")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderOverview
