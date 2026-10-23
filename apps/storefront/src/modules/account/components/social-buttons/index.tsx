"use client"

import { startGoogleLogin } from "@/lib/data/customer"
import { useI18n } from "@/lib/i18n/provider"
import { useActionState } from "react"

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
)

// Providers come from the server (env flags), so a button only appears once its
// credentials exist and the matching Medusa auth provider is configured.
const SocialButtons = ({
  google,
  next,
}: {
  google: boolean
  next?: string
}) => {
  const { t } = useI18n()
  const [error, action, pending] = useActionState(async () => startGoogleLogin(next), null)

  if (!google) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-[var(--ps-muted)]">
        <span className="h-px flex-1 bg-[var(--ps-line)]" />
        {t("or")}
        <span className="h-px flex-1 bg-[var(--ps-line)]" />
      </div>
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-[var(--ps-line)] bg-[#ffffff] text-sm font-semibold text-[#111214] transition-colors hover:bg-[#f4f4f0] disabled:opacity-60"
          data-testid="google-login-button"
        >
          <GoogleMark />
          {t("Continue with Google")}
        </button>
      </form>
      {error && <p className="text-small-regular text-rose-500">{error}</p>}
    </div>
  )
}

export default SocialButtons
