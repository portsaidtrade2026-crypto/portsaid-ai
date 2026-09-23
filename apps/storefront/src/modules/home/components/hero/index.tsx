"use client"

import { Heading } from "@medusajs/ui"
import Button from "@/modules/common/components/button"
import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"

const Hero = () => {
  const { t } = useI18n()
  return (
    <div className="h-[75vh] w-full border-b border-[var(--ps-line)] relative bg-[#e9e9df] overflow-hidden">
      <Image
        src="/hero-image.jpg"
        alt="Hero background"
        layout="fill"
        quality={100}
        priority
      />
      <div className="brand-hero-overlay absolute inset-0 z-1 flex flex-col justify-center items-start text-start small:p-32 p-8 gap-6 bg-gradient-to-r from-[#111214]/80 via-[#111214]/35 to-transparent">
        <span>
          <p className="text-[var(--ps-yellow)] text-xs uppercase tracking-[.24em] font-semibold">
            FS / PORTSAID — {t("Industrial supply")}
          </p>

          <Heading
            level="h1"
            className="text-5xl small:text-7xl leading-[.95] text-white font-semibold mt-7 mb-5 max-w-3xl tracking-[-.04em]"
          >
            {t("Built for the parts that keep moving.")}
          </Heading>

          <p className="leading-7 text-white/75 font-normal text-lg max-w-md">
            {t("Automotive and plastic components, sourced with precision and ready for your next production run.")}
          </p>
        </span>
        <LocalizedClientLink href="/store">
          <Button variant="secondary" className="rounded-2xl">
            {t("Browse catalogue")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
