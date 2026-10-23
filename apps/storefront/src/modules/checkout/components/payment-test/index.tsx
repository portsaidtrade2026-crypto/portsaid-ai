"use client"

import { Badge } from "@medusajs/ui"
import { useI18n } from "@/lib/i18n/provider"

const PaymentTest = ({ className }: { className?: string }) => {
  const { t } = useI18n()
  return (
    <Badge color="orange" className={className}>
      <span className="font-semibold">{t("Attention")}:</span>{" "}
      {t("For testing purposes only.")}
    </Badge>
  )
}

export default PaymentTest
