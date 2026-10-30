import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Button from "@/modules/common/components/button"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

// Homepage brand film: muted autoplay loop (browsers require muted for autoplay), poster
// shown until it loads, native controls so visitors can unmute, pause or go fullscreen.
const PromoVideo = async () => {
  const locale = await getRequestLocale()
  const t = (text: string) => translate(locale, text)

  return (
    <div className="content-container py-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--ps-line)] bg-[#111214]">
        <video
          className="block w-full aspect-video object-cover"
          poster="/promo/portsaid-promo-poster.jpg"
          preload="metadata"
          autoPlay
          muted
          loop
          playsInline
          controls
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          aria-label="PS PORT"
        >
          <source src="/promo/portsaid-promo.mp4" type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden small:flex items-end justify-between gap-4 bg-gradient-to-t from-black/70 to-transparent px-10 pb-14 pt-24">
          <p className="text-[var(--ps-yellow)] text-xs uppercase tracking-[.24em] font-semibold">
            PS PORT
          </p>
          <LocalizedClientLink href="/katalog" className="pointer-events-auto">
            <Button variant="secondary" className="rounded-2xl">
              {t("Browse catalogue")}
            </Button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default PromoVideo
