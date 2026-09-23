"use client"

import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Image from "next/image"
import { useI18n } from "@/lib/i18n/provider"

const Hero = () => {
  const { t } = useI18n()
  return (
    <section className="w-full border-b border-ui-border-base bg-[#171715] text-white">
      <div className="content-container grid min-h-[530px] items-center gap-10 py-16 small:grid-cols-[1fr_.75fr] small:py-24">
        <div className="relative z-10 flex flex-col items-start gap-7">
          <div>
          <p className="text-[#e5c126] text-xs uppercase tracking-[.3em] font-semibold">
            {t("Plastik ve Otomotiv")}
          </p>

          <Heading
            level="h1"
            className="text-5xl small:text-7xl leading-[1.04] text-[#f9f8f4] font-semibold mt-6 mb-5 max-w-xl"
          >
            {t("Parts that keep business moving")}
          </Heading>

          <p className="leading-8 text-[#d8d5cb] font-normal text-base small:text-lg max-w-lg">
            {t("Reliable plastics and automotive essentials, ready for efficient B2B ordering.")}
          </p>
          </div>
        <LocalizedClientLink href="/store" className="inline-flex items-center rounded-md bg-[#e5c126] px-6 py-3 font-semibold text-[#121212] hover:bg-[#f2d44d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5c126]">
          {t("Browse products")}
        </LocalizedClientLink>
        </div>
        <div className="hidden small:flex items-center justify-center">
          <Image src="/portsaid-logo.png" alt="PORTSAID" width={362} height={221} priority className="h-auto w-full max-w-[440px] object-contain" />
        </div>
      </div>
    </section>
  )
}

export default Hero
