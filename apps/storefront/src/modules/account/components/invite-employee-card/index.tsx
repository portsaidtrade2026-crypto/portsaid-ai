"use client"

import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import { QueryCompany } from "@/types"
import { Container, Text, toast } from "@medusajs/ui"
import { useI18n } from "@/lib/i18n/provider"

const InviteEmployeeCard = ({ company }: { company: QueryCompany }) => {
  const { t } = useI18n()
  return (
    <Container className="p-0 overflow-hidden">
      <div className="grid small:grid-cols-4 grid-cols-2 gap-4 p-4 border-b border-neutral-200">
        <div className="flex flex-col gap-y-2">
          <Text className="font-medium text-neutral-950">{t("Name")}</Text>
          <Input name="first_name" label={t("First name")} />
        </div>
        <div className="flex flex-col gap-y-2 justify-end">
          <Input name="last_name" label={t("Last name")} />
        </div>
        <div className="flex flex-col col-span-2 gap-y-2">
          <Text className="font-medium text-neutral-950">{t("Email")}</Text>
          <Input name="email" label={t("Enter an email")} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 bg-neutral-50 p-4">
        <Button variant="primary" onClick={() => toast.info(t("Not implemented"))}>
          {t("Send Invite")}
        </Button>
      </div>
    </Container>
  )
}

export default InviteEmployeeCard
