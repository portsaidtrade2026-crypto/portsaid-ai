"use client"

import { locales, Locale } from "@/lib/i18n/config"
import { useI18n } from "@/lib/i18n/provider"

const labels: Record<Locale, string> = { en: "English", tr: "Türkçe", bg: "Български", ar: "العربية" }

export default function LanguageSwitcher() {
  const { locale, t } = useI18n()
  const setLocale = (event: React.ChangeEvent<HTMLSelectElement>) => {
    document.cookie = `medusa_locale=${event.target.value}; Path=/; Max-Age=31536000; SameSite=Lax`
    window.location.reload()
  }
  return (
    <label className="flex items-center gap-1" aria-label={t("Language")}>
      <span className="sr-only">{t("Language")}</span>
      <select value={locale} onChange={setLocale} className="bg-transparent border-0 text-xs cursor-pointer" aria-label={t("Language")}>
        {locales.map((item) => <option value={item} key={item}>{labels[item]}</option>)}
      </select>
    </label>
  )
}