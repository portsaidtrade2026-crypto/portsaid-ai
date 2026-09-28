"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { MagnifyingGlassMini } from "@medusajs/icons"
import { useI18n } from "@/lib/i18n/provider"

const HeaderSearch = () => {
  const { t } = useI18n()
  const router = useRouter()
  const { countryCode } = useParams()
  const [value, setValue] = useState("")

  const submit = () => {
    const query = value.trim()
    const params = new URLSearchParams()
    if (query) {
      params.set("q", query)
    }
    const qs = params.toString()
    router.push(`/${countryCode}/store${qs ? `?${qs}` : ""}`)
  }

  return (
    <div className="relative mr-2 hidden small:inline-flex">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
        }}
        placeholder={t("Search for products")}
        className="bg-[var(--ps-paper)] text-[var(--ps-ink)] px-4 py-2 rounded-full pe-10 border border-[var(--ps-line)] hidden small:inline-block"
      />
      <button
        type="button"
        onClick={submit}
        aria-label={t("Search for products")}
        className="absolute inset-y-0 right-0 pr-3 hidden small:flex items-center"
      >
        <MagnifyingGlassMini className="w-4 h-4 text-[var(--ps-muted)]" />
      </button>
    </div>
  )
}

export default HeaderSearch
