"use client"

import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"
import { translateCatalogValue } from "@/lib/i18n/catalog"

// One tile per product line, each linking to the Medusa category (handle - Medusa
// slugifies the title, keeping Turkish letters) that holds it. `handles` lists
// candidates in priority order; a tile shows only if one of them exists in the
// live catalogue AND has at least one product in its subtree, so empty lines
// stay hidden and appear on their own once products are added. Parent
// categories (streç-film, bant, çember, makineler) include their children.
// Images are clean studio photos from catalog-import/portsaid-assets/images/masters.
const CATEGORIES: { image: string; title: string; handles?: string[] }[] = [
  { image: "photo/strec-film.jpg", title: "Streç Film", handles: ["streç-film"] },
  { image: "photo/bant.jpg", title: "Bant", handles: ["bant"] },
  { image: "photo/cember.jpg", title: "Çember", handles: ["çember"] },
  { image: "photo/kosebent.jpg", title: "Köşebent", handles: ["köşebent"] },
  { image: "photo/masura.jpg", title: "Masura", handles: ["masura"] },
  { image: "photo/balonlu-naylon.jpg", title: "Balonlu Naylon", handles: ["balonlu-naylon"] },
  { image: "photo/karton-kutu.jpg", title: "Karton Kutu", handles: ["karton-kutu"] },
  { image: "photo/makineler.jpg", title: "Makineler", handles: ["makineler"] },
  { image: "photo/kirtasiye.jpg", title: "Ofis Kırtasiye", handles: ["ofis-kırtasiye"] },
  { image: "photo/mobilya.jpg", title: "Ofis Mobilya", handles: ["ofis-mobilya"] },
]

const norm = (handle: string) => handle.normalize("NFC")

const CategoryGrid = ({
  availableHandles,
}: {
  // Handles of live categories that have products. Undefined means the lookup
  // failed, in which case the first configured handle is trusted as-is.
  availableHandles?: string[]
}) => {
  const { t, locale } = useI18n()
  const available = availableHandles && new Set(availableHandles.map(norm))
  const tiles = CATEGORIES.flatMap((cat) => {
    const handle = cat.handles?.find((h) => !available || available.has(norm(h)))
    return handle ? [{ ...cat, href: `/categories/${handle}` }] : []
  })

  return (
    <div className="content-container py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[var(--ps-yellow)] text-xs uppercase tracking-[.24em] font-semibold">
            PS PORT
          </p>
          <h2 className="display-type text-3xl small:text-4xl font-semibold mt-1">
            {t("Product Categories")}
          </h2>
        </div>
        <LocalizedClientLink
          href="/katalog"
          className="text-sm font-semibold underline underline-offset-4 whitespace-nowrap"
        >
          {t("Full catalog")}
        </LocalizedClientLink>
      </div>

      <div className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-5 gap-3">
        {tiles.map((cat) => (
          <LocalizedClientLink
            key={cat.image}
            href={cat.href}
            className="group relative block aspect-square overflow-hidden rounded-xl border border-[var(--ps-line)]"
          >
            <Image
              src={`/category-tiles/${cat.image}`}
              alt={cat.title}
              fill
              sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw"
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111214]/90 via-[#111214]/10 to-transparent" />
            <span className="absolute bottom-0 left-0 right-0 px-3 py-2.5 text-white text-xs xsmall:text-sm font-semibold leading-tight">
              {translateCatalogValue(cat.title, locale)}
            </span>
            <span className="absolute inset-0 border-2 border-[var(--ps-yellow)] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}

export default CategoryGrid
