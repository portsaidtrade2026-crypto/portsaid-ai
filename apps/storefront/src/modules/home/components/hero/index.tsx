"use client"

import { Heading } from "@medusajs/ui"
import Button from "@/modules/common/components/button"
import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"

const Hero = () => {
  const { t } = useI18n()
  return (
    <div className="min-h-[540px] h-[75vh] w-full border-b border-[var(--ps-line)] relative bg-[#e9e9df] overflow-hidden">
      <Image
        src="/hero-image.jpg"
        alt=""
        fill
        className="object-cover"
        priority
      />
      <div className="brand-hero-overlay absolute inset-0 z-1 flex flex-col justify-center items-start text-start px-5 xsmall:px-8 small:px-16 medium:px-24 py-10 gap-6 bg-gradient-to-r from-[#111214]/80 via-[#111214]/35 to-transparent">
        <div className="brand-hero-copy min-w-0 w-full max-w-3xl">
          <p className="text-[var(--ps-yellow)] text-xs uppercase tracking-[.24em] font-semibold">
            FS / PORTSAID — {t("Industrial supply")}
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
