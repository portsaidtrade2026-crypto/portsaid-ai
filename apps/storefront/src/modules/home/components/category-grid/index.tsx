"use client"

import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"
import { translateCatalogValue } from "@/lib/i18n/catalog"

// One tile per business line Ahmed sent as reference photos. `handles` lists
// the Medusa product-category handles (Medusa slugifies the title, keeping
// Turkish letters) that hold this line's products, in priority order. A tile
// links to the first handle that exists in the live catalogue AND has at least
// one product in its subtree; if none qualifies it sends the visitor to the
// full catalogue instead of an empty or 404 category page. Lines whose
// products are not loaded yet therefore start working the moment products are
// added, with no code change.
const CATEGORIES: { image: string; title: string; handles?: string[] }[] = [
  { image: "endustriyel-strec-film.jpg", title: "Endüstriyel Streç Film", handles: ["endüstriyel-streç-film"] },
  { image: "jumbo-strec-film.jpg", title: "Jumbo Streç Film", handles: ["jumbo-streç-film"] },
  { image: "pre-strec-film.jpg", title: "Pre-Streç Film", handles: ["pre-streç-film"] },
  { image: "gida-strec-film.jpg", title: "Gıda Streç Film", handles: ["gıda-streç-film"] },
  { image: "balonlu-naylon.jpg", title: "Balonlu Naylon", handles: ["balonlu-naylon"] },
  { image: "pe-kopuk.jpg", title: "PE Köpük", handles: ["pe-köpük"] },
  { image: "karton-kutu.jpg", title: "Karton Kutu", handles: ["karton-kutu-ve-kağıt-çantalar"] },
  { image: "kagit-cantalar.jpg", title: "Kağıt Çantalar", handles: ["karton-kutu-ve-kağıt-çantalar"] },
  { image: "alisveris-posetleri.jpg", title: "Alışveriş Poşetleri" },
  { image: "plastik-posetler.jpg", title: "Plastik Poşetler" },
  { image: "cop-torbalari.jpg", title: "Çöp Torbaları", handles: ["çöp-torbaları"] },
  { image: "hotmelt-koli-bandi.jpg", title: "Hotmelt Koli Bandı", handles: ["hotmelt-koli-bandı"] },
  { image: "akrilik-koli-bandi.jpg", title: "Akrilik Koli Bandı", handles: ["akrilik-koli-bandı"] },
  { image: "maskeleme-bandi.jpg", title: "Maskeleme Bandı", handles: ["maskeleme-bandı"] },
  { image: "solvent-bant.jpg", title: "Solvent Bant", handles: ["solvent-bant"] },
  { image: "pp-cember.jpg", title: "PP Çember", handles: ["pp-çember"] },
  { image: "pet-cember.jpg", title: "PET Çember", handles: ["pet-çember"] },
  { image: "celik-cember.jpg", title: "Çelik Çember", handles: ["çelik-çember"] },
  { image: "ambalaj-makineleri.jpg", title: "Ambalaj Makineleri", handles: ["ambalaj-makineleri"] },
  { image: "ikinci-el-makineleri.jpg", title: "İkinci El Makineleri" },
  { image: "fabrika-depo.jpg", title: "Masura ve Paletler", handles: ["masura", "palet"] },
  { image: "ofis-kirtasiye.jpg", title: "Ofis Kırtasiye", handles: ["ofis-kırtasiye"] },
  { image: "ofis-mobilyalari.jpg", title: "Ofis Mobilyaları", handles: ["ofis-mobilya"] },
  { image: "ihracat-lojistik.jpg", title: "İhracat ve Lojistik" },
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
  const hrefFor = (handles?: string[]) => {
    const handle = handles?.find((h) => !available || available.has(norm(h)))
    return handle ? `/categories/${handle}` : "/store"
  }
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

      <div className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-6 gap-3">
        {CATEGORIES.map((cat) => (
          <LocalizedClientLink
            key={cat.image}
            href={hrefFor(cat.handles)}
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
