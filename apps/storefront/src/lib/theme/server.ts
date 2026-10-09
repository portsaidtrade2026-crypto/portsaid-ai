import { cookies } from "next/headers"
import { isTheme, previewThemeCookie, themeCookie, Theme } from "./config"

export async function getRequestTheme(): Promise<Theme> {
  const requestCookies = await cookies()
  const previewTheme = requestCookies.get(previewThemeCookie)?.value
  if (isTheme(previewTheme)) return previewTheme

  const savedTheme = requestCookies.get(themeCookie)?.value
  // Ahmed: the site's default should be light mode on every device, until
  // the visitor explicitly flips the toggle - this previously defaulted
  // every first-time visitor (desktop and phone alike) to dark mode.
  return isTheme(savedTheme) ? savedTheme : "light"
}