"use client"

import { Github } from "@medusajs/icons"
import { Heading } from "@medusajs/ui"
import Button from "@/modules/common/components/button"
import Image from "next/image"
import { useI18n } from "@/lib/i18n/provider"

const Hero = () => {
  const { t } = useI18n()
  return (
    <div className="h-[75vh] w-full border-b border-ui-border-base relative bg-neutral-100">
      <Image
        src="/hero-image.jpg"
        alt="Hero background"
        layout="fill"
        quality={100}
        priority
      />
      <div className="absolute inset-0 z-1 flex flex-col justify-center items-center text-center small:p-32 gap-6">
        <span>
          <p className="text-neutral-600 text-xs uppercase">
            {t("Be light on your feet")}
          </p>

          <Heading
            level="h1"
            className="text-6xl leading-10 text-ui-fg-base font-normal mt-10 mb-5"
          >
            {t("Portable Bestsellers")}
          </Heading>

          <p className="leading-10 text-ui-fg-subtle font-normal text-lg">
            {t("See our widest selection of electronics")}
          </p>
        </span>
        <a
          href="https://github.com/medusajs/b2b-starter-medusa"
          target="_blank"
        >
          <Button variant="secondary" className="rounded-2xl">
            <Github />
            {t("Github Repository")}
          </Button>
        </a>
      </div>
    </div>
  )
}

export default Hero
