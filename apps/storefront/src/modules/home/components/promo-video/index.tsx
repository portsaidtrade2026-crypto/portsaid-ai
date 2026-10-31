import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Button from "@/modules/common/components/button"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

// Homepage brand film (same file as the login page): muted autoplay loop (browsers require muted for autoplay), poster
// shown until it loads, native controls so visitors can unmute, pause or go fullscreen.
// Layout (Ahmed 2026-10-31, "needs formatting in length and width"): a full-width dark band, edge to edge like the pallet banner
// under it. On phones the film keeps its 16:9 shape. From the "small" breakpoint the band has a capped height (76% of the
// screen, at most 720 px) and the whole frame is shown inside it (object-contain, never cropped - the title text is in the
// picture), so on a big monitor the film no longer pushes everything else a full screen down.
// -mx-2/-mt-2 cancel the home page wrapper's m-2 so the band runs edge to edge and touches the yellow strip above it.
const PromoVideo = async () => {
  const locale = await getRequestLocale()
  const t = (text: string) => translate(locale, text)

  return (
    <section className="relative -mx-2 -mt-2 w-[calc(100%+1rem)] bg-[#0b0b0c]">
      <div className="relative mx-auto max-w-[1700px]">
        <video
          className="mx-auto block aspect-video w-full small:aspect-auto small:h-[min(76vh,720px)] object-contain"
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
