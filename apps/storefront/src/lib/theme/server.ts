import { cookies } from "next/headers"
import { isTheme, previewThemeCookie, themeCookie, Theme } from "./config"

export async function getRequestTheme(): Promise<Theme> {
  const requestCookies = await cookies()
  const previewTheme = requestCookies.get(previewThemeCookie)?.value
  if (isTheme(previewTheme)) return previewTheme

  const savedTheme = requestCookies.get(themeCookie)?.value
  return isTheme(savedTheme) ? savedTheme : "light"
}