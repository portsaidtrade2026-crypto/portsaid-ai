import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Button from "@/modules/common/components/button"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

// Homepage register-and-save CTA: always-dark panel (same in both themes) with a clean
// studio photo of the product on a light plate, instead of the old blurred warehouse
// photo that had caption text baked into it.
const PromoBanner = async () => {
  const locale = await getRequestLocale()
  const t = (text: string) => translate(locale, text)

  return (
    <div className="content-container py-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--ps-line)] min-h-[280px] small:min-h-[340px] bg-[#111214]">
        <div className="relative z-10 flex flex-col justify-center items-start h-full px-6 xsmall:px-10 small:px-16 py-10 gap-4 max-w-xl small:max-w-[55%]">
          <p className="text-[var(--ps-yellow)] text-xs uppercase tracking-[.24em] font-semibold">
            PS PORT
          </p>
          <h2 className="display-type text-3xl xsmall:text-4xl small:text-5xl font-semibold text-white leading-[1.1]">
            {t("Join us")}
          </h2>
          <p className="text-white/80 text-base xsmall:text-lg leading-7">
            {t("Create an account and get 5% off your first order.")}
          </p>
          <LocalizedClientLink href="/account">
            <Button variant="secondary" className="rounded-2xl mt-2">
              {t("Sign up now")}
            </Button>
          </LocalizedClientLink>
        </div>
        <div className="relative mx-6 mb-6 aspect-[5/3] overflow-hidden rounded-xl bg-[#f4f4f0] small:absolute small:inset-y-6 small:end-6 small:m-0 small:aspect-auto small:w-[38%]">
          <Image
            src="/promo/join-stretch.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, 90vw"
            className="object-contain p-4 mix-blend-multiply"
          />
        </div>
      </div>
    </div>
  )
}

export default PromoBanner
