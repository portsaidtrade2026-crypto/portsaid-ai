"use client"

import { claimAccount } from "@/lib/data/customer"
import { LOGIN_VIEW } from "@/modules/account/templates/login-template"
import ErrorMessage from "@/modules/checkout/components/error-message"
import { SubmitButton } from "@/modules/checkout/components/submit-button"
import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import { Text } from "@medusajs/ui"
import { useActionState } from "react"
import { useParams } from "next/navigation"
import { useI18n } from "@/lib/i18n/provider"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

// For an existing business customer (imported from Ahmed's CRM, no password
// yet) to set their own password for the first time - not the general
// public "Register" flow, which would create a brand new, disconnected
// account for the same email instead of linking to their existing record.
const ClaimAccount = ({ setCurrentView }: Props) => {
  const { t } = useI18n()
  const { countryCode } = useParams<{ countryCode: string }>()
  const [message, formAction] = useActionState(claimAccount, null)

  return (
    <div
      className="max-w-sm w-full h-full flex flex-col justify-center gap-6 my-auto"
      data-testid="claim-account-page"
    >
      <Text className="text-4xl text-neutral-950 text-left">
        {t("Set your password")}
      </Text>
      <Text className="text-neutral-600">
        {t(
          "Already a Portsaid customer? Enter the email we have on file and choose a password to access your account."
        )}
      </Text>
      <form className="w-full" action={formAction}>
        <input type="hidden" name="account_country_code" value={countryCode} />
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t("Email")}
            name="email"
            type="email"
            autoComplete="email"
            required
            data-testid="claim-email-input"
          />
          <Input
            label={t("Password")}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            data-testid="claim-password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="claim-account-error-message" />
        <div className="flex flex-col gap-2">
          <SubmitButton data-testid="claim-account-button" className="w-full mt-6">
            {t("Set password and log in")}
          </SubmitButton>
          <Button
            variant="secondary"
            onClick={() => setCurrentView(LOGIN_VIEW.LOG_IN)}
            className="w-full h-10"
            data-testid="back-to-login-button"
          >
            {t("Back to log in")}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ClaimAccount
