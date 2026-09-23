"use client"

import { useEffect } from "react"
import { isTheme, themeStorageKey } from "./config"

/**
 * The server renders the cookie theme. A stored preview preference may differ
 * when third-party cookies are unavailable, but it must not mutate the HTML
 * before React hydrates that server-rendered markup.
 */
export default function ThemeSync() {
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(themeStorageKey)
      if (!isTheme(saved)) return

      const root = document.documentElement
      root.dataset.mode = saved
      root.classList.toggle("dark", saved === "dark")
      root.style.colorScheme = saved
    } catch {
      // Cookie-rendered theme remains usable when storage is unavailable.
    }
  }, [])

  return null
}