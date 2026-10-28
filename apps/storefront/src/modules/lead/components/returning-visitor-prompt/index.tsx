"use client"

import { submitSalesLead } from "@/lib/data/leads"
import { useI18n } from "@/lib/i18n/provider"
import Button from "@/modules/common/components/button"
import Input from "@/modules/common/components/input"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

// A visitor who is not signed in and comes back on a second day within 7 days is asked, once and politely, for an
// email and a phone number so a sales representative can contact them. Nothing is sent until they press the button.
// The only thing kept in the browser is a short list of visit dates (localStorage, this site only) plus "answered /
// not now" - no tracking id, nothing is sent anywhere before the form is submitted.
const KEY = "ps_visits_v1"
const WINDOW_DAYS = 7
const SNOOZE_DAYS = 14
const DELAY_MS = 7000
const SKIP_PATHS = /\/(cart|account|checkout|order|auth)(\/|$)/

type State = { days: string[]; done?: boolean; snoozeUntil?: number; shownDay?: string }

const dayOf = (d: Date) => d.toLocaleDateString("en-CA") // YYYY-MM-DD in the visitor's own time zone
const daysApart = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000)

const read = (): State => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}")
    return { days: Array.isArray(parsed.days) ? parsed.days.filter((d: unknown) => typeof d === "string") : [], done: !!parsed.done, snoozeUntil: Number(parsed.snoozeUntil) || 0, shownDay: parsed.shownDay }
  } catch {
    return { days: [] }
  }
}
const write = (s: State) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode: the prompt simply never shows */
  }
}

export default function ReturningVisitorPrompt({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { t, locale } = useI18n()
  const pathname = usePathname() || ""
  const [open, setOpen] = useState(false)
  const [visits, setVisits] = useState(0)
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)
  const hp = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isLoggedIn || SKIP_PATHS.test(pathname)) return
    if (navigator.webdriver || /bot|crawl|spider|lighthouse|headless/i.test(navigator.userAgent)) return
    try {
      window.localStorage.setItem(KEY + "_t", "1")
      window.localStorage.removeItem(KEY + "_t")
    } catch {
      return
    }
    const today = dayOf(new Date())
    const state = read()
    if (!state.days.includes(today)) state.days.push(today)
    state.days = state.days.filter((d) => daysApart(d, today) >= 0 && daysApart(d, today) < 14).sort().slice(-14)
    write(state)
    const recent = state.days.filter((d) => daysApart(d, today) < WINDOW_DAYS)
    if (recent.length < 2 || state.done || (state.snoozeUntil || 0) > Date.now() || state.shownDay === today) return
    const timer = window.setTimeout(() => {
      const s = read()
      write({ ...s, shownDay: today })
      setVisits(recent.length)
      setOpen(true)
    }, DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [pathname, isLoggedIn])

  if (!open) return null

  const close = (answered: boolean) => {
    const s = read()
    write(answered ? { ...s, done: true } : { ...s, snoozeUntil: Date.now() + SNOOZE_DAYS * 86400000 })
    setOpen(false)
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus("sending")
    setError(null)
    const result = await submitSalesLead({
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      hp: hp.current?.value || "",
      visits,
      page: pathname,
      lang: locale,
    })
    if (result.ok) {
      const s = read()
      write({ ...s, done: true })
      setStatus("sent")
      window.setTimeout(() => setOpen(false), 6000)
    } else {
      setStatus("idle")
      setError(result.error === "invalid" ? t("Please enter a valid email and phone number.") : t("Could not send. Please try again."))
    }
  }

  return (
    <div
      role="dialog"
      aria-label={t("Welcome back!")}
      className="fixed bottom-4 start-4 z-[60] w-[min(92vw,360px)] rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-950 shadow-2xl"
    >
      <button
        type="button"
        onClick={() => close(status === "sent")}
        aria-label={t("Close")}
        className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
      >
        ×
      </button>
      {status === "sent" ? (
        <p className="pe-6 text-sm leading-6">{t("Thank you! Our sales representative will contact you soon.")}</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-y-3">
          <p className="pe-6 text-base font-semibold">{t("Welcome back!")}</p>
          <p className="text-sm leading-6 text-neutral-600">
            {t("Want a price or a quote? Leave your email and phone and our sales representative will contact you.")}
          </p>
          <Input label={t("Email")} name="email" type="email" required autoComplete="email" />
          <Input label={t("Phone")} name="phone" type="tel" required autoComplete="tel" />
          <input ref={hp} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <div className="flex items-center justify-between gap-x-2">
            <button type="button" onClick={() => close(false)} className="text-sm text-neutral-500 underline-offset-4 hover:underline">
              {t("Not now")}
            </button>
            <Button type="submit" isLoading={status === "sending"}>
              {t("Call me")}
            </Button>
          </div>
          <p className="text-[11px] leading-4 text-neutral-500">
            {t("By sending this you agree that our sales representative may contact you by email or phone.")}
          </p>
        </form>
      )}
    </div>
  )
}
