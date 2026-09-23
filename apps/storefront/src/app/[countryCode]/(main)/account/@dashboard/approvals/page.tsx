import ApprovedApprovalRequestsAdminList from "@/modules/account/components/approval-requests-admin-list/approved-list"
import PendingApprovalRequestsAdminList from "@/modules/account/components/approval-requests-admin-list/pending-list"
import RejectedApprovalRequestsAdminList from "@/modules/account/components/approval-requests-admin-list/rejected-list"
import { Heading } from "@medusajs/ui"
import { Metadata } from "next"
import { Suspense } from "react"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

export const metadata: Metadata = {
  title: "Approvals",
  description: "Overview of your pending approvals.",
}

export default async function Approvals({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const urlSearchParams = await searchParams
  const locale = await getRequestLocale()

  return (
    <div className="w-full flex flex-col gap-y-4">
      <Heading>{translate(locale, "Approvals")}</Heading>

      <Heading level="h2" className="text-neutral-700">
        {translate(locale, "Pending")}
      </Heading>
      <Suspense fallback={<div>{translate(locale, "Loading")}</div>}>
        <PendingApprovalRequestsAdminList searchParams={urlSearchParams} />
      </Suspense>

      <Heading level="h2" className="text-neutral-700">
        {translate(locale, "Approved")}
      </Heading>
      <Suspense fallback={<div>{translate(locale, "Loading")}</div>}>
        <ApprovedApprovalRequestsAdminList searchParams={urlSearchParams} />
      </Suspense>

      <Heading level="h2" className="text-neutral-700">
        {translate(locale, "Rejected")}
      </Heading>
      <Suspense fallback={<div>{translate(locale, "Loading")}</div>}>
        <RejectedApprovalRequestsAdminList searchParams={urlSearchParams} />
      </Suspense>
    </div>
  )
}
