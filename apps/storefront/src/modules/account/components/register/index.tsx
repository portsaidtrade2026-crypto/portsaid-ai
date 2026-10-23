"use client"

import { quickSignup } from "@/lib/data/customer"
import { LOGIN_VIEW } from "@/modules/account/templates/login-template"
import SocialButtons from "@/modules/account/components/social-buttons"
import ErrorMessage from "@/modules/checkout/components/error-message"
import { SubmitButton } from "@/modules/checkout/components/submit-button"
import Input from "@/modules/common/components/input"
import { Checkbox, Label, Text } from "@medusajs/ui"
import { useActionState, useState } from "react"
import { useParams } from "next/navigation"
import { useI18n } from "@/lib/i18n/provider"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  google: boolean
  next?: string
}

// Sign-up is only an email and a password. Name, phone and company are collected
// later, in the quote dialog, so nobody is stopped at the door by a long form.
const Register = ({ setCurrentView, google, next }: Props) => {
  const { t } = useI18n()
  const { countryCode } = useParams<{ countryCode: string }>()
  const [message, formAction] = useActionState(quickSignup, null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const isValid = termsAccepted && !!email && password.length >= 8

  return (
    <div
      className="max-w-sm w-full h-full flex flex-col justify-center gap-6 my-auto"
      data-testid="register-page"
    >
      <div className="flex flex-col gap-2 text-center">
        <Text className="text-4xl text-neutral-950 font-medium">
          {t("Create your free account")}
        </Text>
        <Text className="text-neutral-600">
          {t("Just your email and a password. We'll ask for the rest when you send your first quote request.")}
        </Text>
      </div>
      <form className="w-full flex flex-col" action={formAction}>
        <input type="hidden" name="account_country_code" value={countryCode} />
        {next && <input type="hidden" name="next" value={next} />}
        <div className="flex flex-col w-full gap-y-3">
          <Input
            label={t("Email")}
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label={t("Password")}
            name="password"
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            data-testid="password-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-[var(--ps-muted)] px-2">{t("At least 8 characters.")}</p>
        </div>
        <ErrorMessage error={message} data-testid="register-error" />
        <div className="flex items-center gap-2 mt-4">
          <Checkbox
            name="terms"
            id="terms-checkbox"
            data-testid="terms-checkbox"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(!!checked)}
          />
          <Label
            id="terms-label"
            className="flex items-center text-ui-fg-base !text-xs hover:cursor-pointer !transform-none"
            htmlFor="terms-checkbox"
            data-testid="terms-label"
          >
            {t("I agree to the terms and conditions.")}
          </Label>
        </div>
        <SubmitButton
          className="w-full mt-5 h-11"
          data-testid="register-button"
          disabled={!isValid}
        >
          {t("Create a free account")}
        </SubmitButton>
      </form>
      <SocialButtons google={google} next={next} />
      <p className="text-center text-sm text-[var(--ps-muted)] border-t border-[var(--ps-line)] pt-5">
        {t("Already a member?")}{" "}
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.LOG_IN)}
          className="font-semibold text-neutral-950 hover:underline"
        >
          {t("Log in")}
        </button>
      </p>
    </div>
  )
}

export default Register
