import { cookies, headers } from "next/headers"
import { defaultLocale, isLocale, localeFromCountry, Locale, localeCookie, previewLocaleCookie } from "./config"
import { extractPublicClientIp, getCountryForIp } from "./geoip"

export async function getRequestLocale(): Promise<Locale> {
  const requestCookies = await cookies()
  // Replit's embedded preview is cross-site. The partitioned cookie is sent
  // there, while the regular preference is used in a standalone browser tab.
  const previewLocale = requestCookies.get(previewLocaleCookie)?.value
  if (isLocale(previewLocale)) return previewLocale
  const cookieLocale = requestCookies.get(localeCookie)?.value
  if (isLocale(cookieLocale)) return cookieLocale
  const requestHeaders = await headers()
  const country = requestHeaders.get("x-vercel-ip-country") ||
    requestHeaders.get("cf-ipcountry")
  if (country) return localeFromCountry(country)
  const ip = extractPublicClientIp({
    forwardedFor: requestHeaders.get("x-forwarded-for"),
    realIp: requestHeaders.get("x-real-ip"),
  })
  if (ip) {
    try {
      return localeFromCountry(await getCountryForIp(ip) || "")
    } catch {
      return defaultLocale
    }
  }
  return defaultLocale
}