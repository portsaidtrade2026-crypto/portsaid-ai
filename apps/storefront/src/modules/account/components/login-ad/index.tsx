"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"

// The panel shown beside the login form: the PS PORT promo film (same file as the homepage section) instead of the earlier
// plastic-pallet advertisement. Muted autoplay loop (browsers only autoplay muted video), poster until it loads, native controls
// so a visitor can unmute or go fullscreen. 16:9 file, shown whole (no cropping) with a catalogue button under it.
const LoginAd = () => {
  const { t } = useI18n()
  return (
    <div className="relative hidden min-h-[560px] overflow-hidden rounded-3xl bg-[#111214] p-8 text-white small:flex small:flex-col small:justify-center small:gap-6">
      <span className="w-fit rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#111214]">
        PS PORT
      </span>
      <div className="overflow-hidden rounded-2xl bg-black">
        <video
          className="block aspect-video w-full object-cover"
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
      </div>
      <LocalizedClientLink
        href="/katalog"
        className="inline-flex w-fit items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#111214] transition-opacity hover:opacity-85"
      >
        {t("Browse catalogue")}
      </LocalizedClientLink>
    </div>
  )
}

export default LoginAd
