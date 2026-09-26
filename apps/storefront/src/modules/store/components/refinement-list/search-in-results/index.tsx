"use client"

import { MagnifyingGlassMini } from "@medusajs/icons"
import { useI18n } from "@/lib/i18n/provider"

const SearchInResults = ({ listName }: { listName?: string }) => {
  const { t } = useI18n()
  const placeholder = listName
    ? t("Search in {listName}", { listName: t(listName) })
    : t("Search in products")

  return (
    <div className="group relative text-sm focus-within:border-neutral-500 rounded-t-lg focus-within:outline focus-within:outline-neutral-500">
      <input
        placeholder={placeholder}
        disabled
        className="w-full p-2 pr-8 focus:outline-none rounded-lg hover:cursor-not-allowed"
        title={t("Install a search provider to enable product search")}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <MagnifyingGlassMini className="w-4 h-4 text-neutral-500" />
      </div>
    </div>
  )
}

export default SearchInResults
