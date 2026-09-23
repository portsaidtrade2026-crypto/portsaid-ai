"use client"

import { useI18n } from "@/lib/i18n/provider"
import {
  previewThemeCookie,
  themeCookie,
  themeStorageKey,
  Theme,
} from "@/lib/theme/config"

const labels = {
  en: { light: "Switch to light mode", dark: "Switch to dark mode" },
  tr: { light: "Açık temaya geç", dark: "Koyu temaya geç" },
  bg: { light: "Светла тема", dark: "Тъмна тема" },
  ar: { light: "التبديل إلى الوضع الفاتح", dark: "التبديل إلى الوضع الداكن" },
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.mode = theme
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

export default function ThemeToggle() {
  const { locale } = useI18n()

  const toggleTheme = () => {
    const next: Theme = document.documentElement.dataset.mode === "dark" ? "light" : "dark"
    applyTheme(next)
    try {
      window.localStorage.setItem(themeStorageKey, next)
    } catch {
      // Cookie persistence is still available if local storage is blocked.
    }
    document.cookie = `${themeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`
    if (window.location.protocol === "https:") {
      document.cookie = `${previewThemeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=None; Secure; Partitioned`
    }
  }

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      onClick={toggleTheme}
      className="theme-toggle shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
    >
      <span className="sr-only dark:hidden">{labels[locale].dark}</span>
      <span className="sr-only hidden dark:inline">{labels[locale].light}</span>
      <svg className="hidden dark:block" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </svg>
      <svg className="dark:hidden" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />
      </svg>
    </button>
  )
}