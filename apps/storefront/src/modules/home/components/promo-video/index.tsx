import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Button from "@/modules/common/components/button"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

// Homepage brand film (same file as the login page): muted autoplay loop (browsers require muted for autoplay), poster
// shown until it loads, native controls so visitors can unmute, pause or go fullscreen.
// Layout (Ahmed 2026-10-31: "I want it the full height of the page, not short"): a full-width dark band whose film fills the
// screen height under the header (100svh minus the ~130 px of menu + yellow strip). The film keeps its 16:9 shape, so its width
// is min(page width, available height x 16/9): on a wide screen it is full height with dark bars on the sides, on a narrower
// one it is full width and a little shorter - never cropped (the title text is in the picture) and never a dark strip
// above or below the picture.
// -mx-2/-mt-2 cancel the home page wrapper's m-2 so the band runs edge to edge and touches the yellow strip above it.
const FILM_WIDTH = "w-[min(100%,calc((100svh-130px)*1.7778))]"

const PromoVideo = async () => {
  const locale = await getRequestLocale()
  const t = (text: string) => translate(locale, text)

  return (
    <section className="relative -mx-2 -mt-2 w-[calc(100%+1rem)] bg-[#0b0b0c]">
      <div className={`relative mx-auto ${FILM_WIDTH}`}>
        <video
          className="block aspect-video w-full object-contain"
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden small:flex items-end justify-end gap-4 bg-gradient-to-t from-black/70 to-transparent px-10 pb-14 pt-24">
          <LocalizedClientLink href="/katalog" className="pointer-events-auto">
            <Button variant="secondary" className="rounded-2xl">
              {t("Browse catalogue")}
            </Button>
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}

export default PromoVideo
