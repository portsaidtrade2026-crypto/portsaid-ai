"use client"

import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"

// One tile per business line Ahmed sent as reference photos. `handle` is the
// Medusa product-category handle for lines that already have live products in
// the catalog - Medusa slugifies the category title (lowercase, spaces to
// dashes, Turkish letters kept as-is) so these were computed to match that
// pattern. Lines without a `handle` don't have products loaded yet, so their
// tile sends the visitor to the full catalogue instead of a dead link.
const CATEGORIES: { image: string; title: string; handle?: string }[] = [
  { image: "endustriyel-strec-film.jpg", title: "Endüstriyel Streç Film", handle: "endüstriyel-streç-film" },
  { image: "jumbo-strec-film.jpg", title: "Jumbo Streç Film", handle: "jumbo-streç-film" },
  { image: "pre-strec-film.jpg", title: "Pre-Streç Film", handle: "pre-streç-film" },
  { image: "gida-strec-film.jpg", title: "Gıda Streç Film", handle: "gıda-streç-film" },
  { image: "balonlu-naylon.jpg", title: "Balonlu Naylon", handle: "balonlu-naylon" },
  { image: "pe-kopuk.jpg", title: "PE Köpük", handle: "pe-köpük" },
  { image: "karton-kutu.jpg", title: "Karton Kutu", handle: "karton-kutu-ve-kağıt-çantalar" },
  { image: "kagit-cantalar.jpg", title: "Kağıt Çantalar", handle: "karton-kutu-ve-kağıt-çantalar" },
  { image: "alisveris-posetleri.jpg", title: "Alışveriş Poşetleri" },
  { image: "plastik-posetler.jpg", title: "Plastik Poşetler" },
  { image: "cop-torbalari.jpg", title: "Çöp Torbaları" },
  { image: "hotmelt-koli-bandi.jpg", title: "Hotmelt Koli Bandı", handle: "hotmelt-koli-bandı" },
  { image: "akrilik-koli-bandi.jpg", title: "Akrilik Koli Bandı", handle: "akrilik-koli-bandı" },
  { image: "maskeleme-bandi.jpg", title: "Maskeleme Bandı", handle: "maskeleme-bandı" },
  { image: "solvent-bant.jpg", title: "Solvent Bant" },
  { image: "pp-cember.jpg", title: "PP Çember", handle: "pp-çember" },
  { image: "pet-cember.jpg", title: "PET Çember" },
  { image: "celik-cember.jpg", title: "Çelik Çember" },
  { image: "ambalaj-makineleri.jpg", title: "Ambalaj Makineleri", handle: "ambalaj-makineleri" },
  { image: "ikinci-el-makineleri.jpg", title: "İkinci El Makineleri" },
  { image: "fabrika-depo.jpg", title: "Fabrika ve Depo Malzemeleri", handle: "fabrika-ve-depo-malzemeleri" },
  { image: "ofis-kirtasiye.jpg", title: "Ofis Kırtasiye" },
  { image: "ofis-mobilyalari.jpg", title: "Ofis Mobilyaları" },
  { image: "ihracat-lojistik.jpg", title: "İhracat ve Lojistik" },
]

const CategoryGrid = () => {
  return (
    <div className="content-container py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[var(--ps-yellow)] text-xs uppercase tracking-[.24em] font-semibold">
            PS / PORTSAID
          </p>
          <h2 className="display-type text-3xl small:text-4xl font-semibold mt-1">
            Ürün Kategorileri
          </h2>
        </div>
        <LocalizedClientLink
          href="/store"
          className="text-sm font-semibold underline underline-offset-4 whitespace-nowrap"
        >
          Tüm Katalog
        </LocalizedClientLink>
      </div>

      <div className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-6 gap-3">
        {CATEGORIES.map((cat) => (
          <LocalizedClientLink
            key={cat.image}
            href={cat.handle ? `/categories/${cat.handle}` : "/store"}
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
              {cat.title}
            </span>
            <span className="absolute inset-0 border-2 border-[var(--ps-yellow)] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}

export default CategoryGrid
