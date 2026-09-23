"use client"

import { StatusBadge } from "@medusajs/ui"
import { useI18n } from "@/lib/i18n/provider"

const StatusTitles: Record<string, string> = {
  accepted: "Accepted", customer_rejected: "Customer Rejected", merchant_rejected: "Merchant Rejected",
  pending_merchant: "Pending Merchant", pending_customer: "Pending Customer",
}

const StatusColors: Record<string, "green" | "orange" | "red" | "blue"> = {
  accepted: "green",
  customer_rejected: "red",
  merchant_rejected: "red",
  pending_merchant: "orange",
  pending_customer: "orange",
}

export default function QuoteStatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  return (
    <StatusBadge color={StatusColors[status]}>
      {t(StatusTitles[status])}
    </StatusBadge>
  )
}
