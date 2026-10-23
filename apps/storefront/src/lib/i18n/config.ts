export const locales = ["en", "tr", "bg", "ar"] as const

export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"
export const localeCookie = "medusa_locale"
export const previewLocaleCookie = "medusa_locale_preview"

export const arabLeagueCountries = new Set([
  "dz", "bh", "km", "dj", "eg", "iq", "jo", "kw", "lb", "ly", "mr",
  "ma", "om", "ps", "qa", "sa", "so", "sd", "sy", "tn", "ae", "ye",
])

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

export function localeFromCountry(country: string | undefined | null): Locale {
  const code = country?.toLowerCase()
  if (code === "tr") return "tr"
  if (code === "bg") return "bg"
  if (code && arabLeagueCountries.has(code)) return "ar"
  return defaultLocale
}