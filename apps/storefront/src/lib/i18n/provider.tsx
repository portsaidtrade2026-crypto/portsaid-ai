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
  if (window.location.protocol === "https:") {
    document.cookie = `${previewLocaleCookie}=${next}; Path=/; Max-Age=31536000; SameSite=None; Secure; Partitioned`
  }
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error("useI18n must be used inside I18nProvider")
  return value
}

export { isLocale }