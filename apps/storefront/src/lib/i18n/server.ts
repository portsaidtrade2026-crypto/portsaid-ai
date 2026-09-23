import { cookies, headers } from "next/headers"
import { defaultLocale, isLocale, localeFromCountry, Locale, localeCookie } from "./config"
import { extractPublicClientIp, getCountryForIp } from "./geoip"

export async function getRequestLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(localeCookie)?.value
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