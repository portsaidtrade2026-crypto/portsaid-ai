"use client"

import { locales, Locale } from "@/lib/i18n/config"
import { persistLocalePreference, useI18n } from "@/lib/i18n/provider"
import { useRouter } from "next/navigation"

const labels: Record<Locale, string> = { en: "English", tr: "Türkçe", bg: "Български", ar: "العربية" }

export default function LanguageSwitcher() {
  const { locale, setLocale: updateLocale, t } = useI18n()
  const router = useRouter()
  const setLocale = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as Locale
    persistLocalePreference(next)
    updateLocale(next)
    document.documentElement.lang = next
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr"
    router.refresh()
  }
  return (
    <label className="flex items-center gap-1" aria-label={t("Language")}>
      <span className="sr-only">{t("Language")}</span>
      <select value={locale} onChange={setLocale} className="bg-transparent border-0 text-xs cursor-pointer" aria-label={t("Language")} data-testid="language-switcher">
        {locales.map((item) => <option value={item} key={item}>{labels[item]}</option>)}
      </select>
    </label>
  )
}