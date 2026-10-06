"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { defaultLocale, isLocale, Locale, localeCookie, previewLocaleCookie } from "./config"
import { translate } from "./messages"

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (english: string, vars?: Record<string, string | number>) => string
}
const I18nContext = createContext<I18nValue | null>(null)

function interpolate(value: string, vars?: Record<string, string | number>) {
  return Object.entries(vars ?? {}).reduce(
    (result, [key, replacement]) =>
      result
        .replaceAll(`{{${key}}}`, () => String(replacement))
        .replaceAll(`{${key}}`, () => String(replacement)),
    value
  )
}

export function I18nProvider({ locale: initialLocale, children }: { locale: Locale; children: React.ReactNode }) {
  const [locale, setLocale] = useState(initialLocale ?? defaultLocale)
  useEffect(() => setLocale(initialLocale ?? defaultLocale), [initialLocale])

  return <I18nContext.Provider value={{ locale, setLocale, t: (text, vars) => interpolate(translate(locale, text), vars) }}>{children}</I18nContext.Provider>
}

export function persistLocalePreference(next: Locale) {
  document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`
  // The partitioned preview cookie is only for Replit's embedded preview
  // iframe (a genuinely cross-site context, where SameSite=Lax cookies
  // aren't sent at all) - it used to be set on every HTTPS visit,
  // including the real, never-embedded production site. There the
  // SameSite=None + Partitioned write can silently fail or linger stale
  // in some browsers, and getRequestLocale() prefers it over the regular
  // cookie whenever it's present - so a stuck old value there kept the
  // banner on a previous language after switching, until a stale preview
  // cookie expired or got overwritten by coincidence. Gating on actually
  // being embedded removes that failure mode outside the one place it's
  // needed.
  if (window.location.protocol === "https:" && window.self !== window.top) {
    document.cookie = `${previewLocaleCookie}=${next}; Path=/; Max-Age=31536000; SameSite=None; Secure; Partitioned`
  }
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error("useI18n must be used inside I18nProvider")
  return value
}

export { isLocale }