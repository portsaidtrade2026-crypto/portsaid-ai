"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { B2BCart } from "@/types"
import { ApprovalStatusType } from "@/types/approval"
import { CheckMini, LockClosedSolid, XMarkMini } from "@medusajs/icons"
import { Container, Text } from "@medusajs/ui"
import { useI18n } from "@/lib/i18n/provider"

const ApprovalStatusBanner = ({ cart }: { cart: B2BCart }) => {
  const { t } = useI18n()
  const cartApprovalStatus = cart.approval_status?.status

  if (!cartApprovalStatus) {
    return null
  }

  return (
    <Container className="flex gap-2 self-stretch relative w-full h-fit overflow-hidden items-center">
      {cartApprovalStatus === ApprovalStatusType.PENDING && (
        <>
          <LockClosedSolid className="w-4 h-4" />
          <Text className="text-left">{t("This cart is locked for approval.")}</Text>
        </>
      )}

      {cartApprovalStatus === ApprovalStatusType.REJECTED && (
        <>
          <XMarkMini className="w-4 h-4" />
          <Text className="text-left">
             {t("This cart has been rejected. You can re-request approval from the")}{" "}
            <LocalizedClientLink
              href="/checkout"
              className="text-ui-bg-interactive hover:text-ui-fg-interactive-hover"
            >
               {t("checkout page")}
            </LocalizedClientLink>
            .
          </Text>
        </>
      )}

      {cartApprovalStatus === ApprovalStatusType.APPROVED && (
        <>
          <CheckMini className="w-4 h-4" />
          <Text className="text-left">
             {t("This cart has been approved and can now be completed.")}
          </Text>
        </>
      )}
    </Container>
  )
}

export default ApprovalStatusBanner
