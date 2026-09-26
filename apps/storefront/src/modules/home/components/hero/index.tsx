"use client"

import { Heading } from "@medusajs/ui"
import Button from "@/modules/common/components/button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"

// A flat black/gold brand gradient rather than a photo - the starter
// template's hero-image.jpg was generic abstract stock art with no
// connection to the business, and none of the real reference photos are
// wide/clean enough (no baked-in caption text) to fill a banner this shape.
const Hero = () => {
  const { t } = useI18n()
  return (
    <div
      className="min-h-[540px] h-[75vh] w-full border-b border-[var(--ps-line)] relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 85% 20%, rgba(244,233,0,0.14), transparent 60%), linear-gradient(135deg, #17181a 0%, #0d0e0f 100%)",
      }}
    >
      <div className="brand-hero-overlay absolute inset-0 z-1 flex flex-col justify-center items-start text-start px-5 xsmall:px-8 small:px-16 medium:px-24 py-10 gap-6">
        <div className="brand-hero-copy min-w-0 w-full max-w-3xl">
          <p className="text-[var(--ps-yellow)] text-xs uppercase tracking-[.24em] font-semibold">
            PS / PORTSAID
          </p>

          <Heading
            level="h1"
            className="text-4xl xsmall:text-5xl small:text-7xl leading-[1.08] text-white font-semibold mt-7 mb-5 max-w-3xl tracking-[-.04em]"
          >
            {t("Built for the parts that keep moving.")}
          </Heading>

          <p className="leading-7 text-white/75 font-normal text-lg max-w-md">
            {t("Automotive and plastic components, sourced with precision and ready for your next production run.")}
          </p>
        </div>
        <LocalizedClientLink href="/store" className="max-w-full">
          <Button variant="secondary" className="rounded-2xl">
            {t("Browse catalogue")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
