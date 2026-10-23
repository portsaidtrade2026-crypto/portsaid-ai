"use client"

import ApprovalCard from "@/modules/account/components/approval-card"
import { Text } from "@medusajs/ui"
import { useI18n } from "@/lib/i18n/provider"

const PendingCustomerApprovals = ({
  cartsWithApprovals,
}: {
  cartsWithApprovals: any[]
}) => {
  const { t } = useI18n()
  if (cartsWithApprovals.length) {
    return (
      <div className="flex flex-col gap-y-2 w-full">
        {cartsWithApprovals.map((cart) => (
          <ApprovalCard
            key={cart.id}
            cartWithApprovals={cart}
            type="customer"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center gap-y-4"
      data-testid="no-approvals-container"
    >
      <Text className="text-large-semi">{t("Nothing to see here")}</Text>
      <Text className="text-base-regular">
        {t("You don't have any approvals yet.")}
      </Text>
    </div>
  )
}

export default PendingCustomerApprovals
