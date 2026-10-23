export const themeCookie = "portsaid_theme"
export const previewThemeCookie = "portsaid_theme_preview"
export const themeStorageKey = "portsaid_theme"

export type Theme = "light" | "dark"

export function isTheme(value: string | undefined | null): value is Theme {
  return value === "light" || value === "dark"
}