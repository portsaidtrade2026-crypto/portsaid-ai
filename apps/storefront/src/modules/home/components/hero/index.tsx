"use client"

import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"

// Launch banner for the new plastic pallets (DPP 1208 NS / DPP 11608 NS) in a neutral
// palette: off-white page, black ink, light-grey photo panel. No yellow: it clashed with
// the photos. Colours are fixed hex values, not theme variables, so the banner looks the
// same in dark mode. The pallet photos have white backgrounds, so they use
// mix-blend-mode: multiply to sit directly on the grey panel with no box.
// -mx-2/-mt-2 cancel the home page wrapper's m-2 so the banner runs edge to edge.
const INK = "#111214"
const STAR =
  "50,0 58.4,7.8 69.1,3.8 73.9,14.2 85.4,14.6 85.8,26.1 96.2,30.9 92.2,41.6 100,50 92.2,58.4 96.2,69.1 85.8,73.9 85.4,85.4 73.9,85.8 69.1,96.2 58.4,92.2 50,100 41.6,92.2 30.9,96.2 26.1,85.8 14.6,85.4 14.2,73.9 3.8,69.1 7.8,58.4 0,50 7.8,41.6 3.8,30.9 14.2,26.1 14.6,14.6 26.1,14.2 30.9,3.8 41.6,7.8"

const MODELS = [
  { code: "DPP 1208 NS", size: "1200 × 800 × 140 mm", weight: "5.1 kg", image: "/promo/dogan-dpp-1208-ns.webp", w: 1201, h: 526 },
  { code: "DPP 11608 NS", size: "1160 × 800 × 140 mm", weight: "5 kg", image: "/promo/dogan-dpp-11608-ns.webp", w: 1199, h: 534 },
]

const Hero = () => {
  const { t } = useI18n()
  return (
    <section
      className="relative -mx-2 -mt-2 w-[calc(100%+1rem)] overflow-hidden border-b border-[#d9d9d2] text-[#111214]"
      style={{ background: "linear-gradient(120deg, #fbfaf5 0%, #f1efe6 100%)" }}
    >
      <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-5 xsmall:px-8 small:px-16 medium:px-24 py-10 small:py-14 small:grid-cols-[1fr_1.05fr] min-h-[480px]">
        <div className="min-w-0">
          <span
            className="inline-block px-4 py-1.5 text-sm font-bold uppercase tracking-[.18em] text-white"
            style={{ background: INK }}
          >
            {t("New product")}
          </span>

          <h1 className="display-type mt-6 text-5xl xsmall:text-6xl small:text-7xl font-semibold leading-[1.02] tracking-[-.02em]">
            {t("Plastic pallets")}
          </h1>
          <div className="mt-3 flex w-fit max-w-full flex-wrap gap-x-6 gap-y-1 border-b-2 border-[#111214] pb-2 text-xl font-bold">
            {MODELS.map((m) => (
              <span key={m.code} dir="ltr">
                {m.code}
              </span>
            ))}
          </div>

          <p className="mt-6 max-w-lg text-lg leading-7 text-[#4a4b46]">
            {t("PE plastic pallets in two sizes: 1200 x 800 and 1160 x 800 mm.")}
          </p>

          <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
            {["2000 kg static load", "1000 kg dynamic load", "9-foot open deck", "Nestable"].map(
              (chip) => (
                <li
                  key={chip}
                  className="rounded-full border border-[#111214] bg-white px-3 py-1"
                >
                  {t(chip)}
                </li>
              )
            )}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/categories/palet"
              className="inline-flex items-center rounded-2xl px-6 py-3 font-semibold text-white transition-colors hover:bg-[#2b2c2f]"
              style={{ background: INK }}
            >
              {t("View pallets")}
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/katalog"
              className="inline-flex items-center rounded-2xl border border-[#111214] px-6 py-3 font-semibold transition-colors hover:bg-[#111214] hover:text-white"
            >
              {t("Browse catalogue")}
            </LocalizedClientLink>
          </div>
        </div>

        <div className="relative min-w-0">
          <div
            className="relative overflow-hidden rounded-3xl p-5 xsmall:p-8 shadow-lg"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 38%, #ffffff 0%, #ecebe5 62%, #deddd6 100%)",
            }}
          >
            <div className="flex flex-col gap-6">
              {MODELS.map((m, i) => (
                <figure
                  key={m.code}
                  className={i === 0 ? "w-[88%] self-start" : "w-[76%] self-end"}
                >
                  <Image
                    src={m.image}
                    alt={`${t("Plastic pallets")} ${m.code}`}
                    width={m.w}
                    height={m.h}
                    priority={i === 0}
                    sizes="(min-width: 1024px) 40vw, 85vw"
                    className="h-auto w-full mix-blend-multiply"
                  />
                  <figcaption
                    className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm"
                    dir="ltr"
                  >
                    <b>{m.code}</b>
                    <span>{m.size}</span>
                    <span>PE {m.weight}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <svg
            viewBox="0 0 100 100"
            className="absolute -top-5 end-3 z-10 w-24 small:w-28 drop-shadow-md"
            aria-hidden
          >
            <polygon points={STAR} fill={INK} />
          </svg>
          <span
            className="absolute -top-5 end-3 z-10 flex h-24 w-24 small:h-28 small:w-28 items-center justify-center text-xl small:text-2xl font-extrabold uppercase text-white"
            aria-hidden
          >
            {t("New")}
          </span>
        </div>
      </div>
    </section>
  )
}

export default Hero
