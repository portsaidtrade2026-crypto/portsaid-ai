"use client"

import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"

// The advertisement shown beside the login form. To run a different campaign, change this
// object: `title`/`text`/`button` are English keys looked up in the i18n dictionaries, `image`
// is a white-background product photo from /public, `href` is a path inside the store.
const LOGIN_AD = {
  badge: "New product",
  title: "Plastic pallets",
  text: "PE plastic pallets in two sizes: 1200 x 800 and 1160 x 800 mm.",
  button: "View pallets",
  href: "/categories/palet",
  image: "/promo/dogan-dpp-1208-ns.webp",
  imageWidth: 1201,
  imageHeight: 526,
}

const LoginAd = () => {
  const { t } = useI18n()
  return (
    <div className="relative hidden min-h-[560px] overflow-hidden rounded-3xl bg-[#111214] p-10 text-white small:flex small:flex-col">
      <span className="w-fit rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#111214]">
        {t(LOGIN_AD.badge)}
      </span>
      <h2 className="display-type mt-6 text-5xl font-semibold leading-[1.05] tracking-[-.01em] medium:text-6xl">
        {t(LOGIN_AD.title)}
      </h2>
      <p className="mt-4 max-w-sm text-base leading-7 text-white/75">{t(LOGIN_AD.text)}</p>
      <LocalizedClientLink
        href={LOGIN_AD.href}
        className="mt-7 inline-flex w-fit items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#111214] transition-opacity hover:opacity-85"
      >
        {t(LOGIN_AD.button)}
      </LocalizedClientLink>
      <div className="mt-auto pt-10">
        <div className="rounded-2xl bg-[#f4f4f0] p-6">
          <Image
            src={LOGIN_AD.image}
            alt={t(LOGIN_AD.title)}
            width={LOGIN_AD.imageWidth}
            height={LOGIN_AD.imageHeight}
            sizes="(min-width: 1024px) 40vw, 90vw"
            className="h-auto w-full mix-blend-multiply"
            priority
          />
        </div>
      </div>
    </div>
  )
}

export default LoginAd
