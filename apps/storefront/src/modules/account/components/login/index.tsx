"use client"

import { login } from "@/lib/data/customer"
import { LOGIN_VIEW } from "@/modules/account/templates/login-template"
import SocialButtons from "@/modules/account/components/social-buttons"
import ErrorMessage from "@/modules/checkout/components/error-message"
import { SubmitButton } from "@/modules/checkout/components/submit-button"
import Input from "@/modules/common/components/input"
import { Text } from "@medusajs/ui"
import { useActionState } from "react"
import { useI18n } from "@/lib/i18n/provider"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  google: boolean
  next?: string
}

const Login = ({ setCurrentView, google, next }: Props) => {
  const { t } = useI18n()
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="max-w-sm w-full h-full flex flex-col justify-center gap-7 my-auto"
      data-testid="login-page"
    >
      <Text className="text-4xl text-neutral-950 text-center font-medium">
        {t("Welcome back!")}
      </Text>
      <form className="w-full" action={formAction}>
        {next && <input type="hidden" name="next" value={next} />}
        <div className="flex flex-col w-full gap-y-3">
          <Input
            label={t("Email")}
            name="email"
            type="email"
            title={t("Enter a valid email address.")}
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label={t("Password")}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.CLAIM_ACCOUNT)}
            className="text-sm font-medium text-neutral-950 hover:underline"
            data-testid="claim-account-link"
          >
            {t("Already a customer? Set your password")}
          </button>
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-5 h-11">
          {t("Log in")}
        </SubmitButton>
      </form>
      <SocialButtons google={google} next={next} />
      <p className="text-center text-sm text-[var(--ps-muted)] border-t border-[var(--ps-line)] pt-5">
        {t("Don't have an account?")}{" "}
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="font-semibold text-neutral-950 hover:underline"
          data-testid="register-button"
        >
          {t("Create a free account")}
        </button>
      </p>
    </div>
  )
}

export default Login
