"use client"

import { useEffect, useRef, useState } from "react"
import { MagnifyingGlassMini } from "@medusajs/icons"
import { useI18n } from "@/lib/i18n/provider"
import { translateCatalogValue } from "@/lib/i18n/catalog"

const SearchInResults = ({
  listName,
  defaultValue = "",
  onSearch,
}: {
  listName?: string
  defaultValue?: string
  onSearch: (value: string) => void
}) => {
  const { t, locale } = useI18n()
  const [value, setValue] = useState(defaultValue)
  const isFirstRender = useRef(true)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timeout = setTimeout(() => onSearch(value.trim()), 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const placeholder = listName
    ? t("Search in {listName}", {
        listName: translateCatalogValue(listName, locale),
      })
    : t("Search in products")

  return (
    <div className="group relative text-sm focus-within:border-neutral-500 rounded-t-lg focus-within:outline focus-within:outline-neutral-500">
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full p-2 pr-8 focus:outline-none rounded-lg"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <MagnifyingGlassMini className="w-4 h-4 text-neutral-500" />
      </div>
    </div>
  )
}

export default SearchInResults
