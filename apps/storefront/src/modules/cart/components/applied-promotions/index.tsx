"use client"

import { HttpTypes } from "@medusajs/types"
import { Badge, Container, Text } from "@medusajs/ui"
import { useI18n } from "@/lib/i18n/provider"

const AppliedPromotions = ({
  promotions,
}: {
  promotions: HttpTypes.StorePromotion[]
}) => {
  const { t } = useI18n()
  return (
    <Container className="flex gap-2 items-center py-3 flex-wrap">
      <Text>{t("Promotions applied:")}</Text>
      {promotions?.map((promotion) => (
        <Badge
          key={promotion.id}
          color={promotion.is_automatic ? "green" : "blue"}
          className="font-mono text-[0.7rem] p-1 py-px h-fit"
        >
          {promotion.code}
        </Badge>
      ))}
    </Container>
  )
}

export default AppliedPromotions
