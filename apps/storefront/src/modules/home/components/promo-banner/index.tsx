import Image from "next/image"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Button from "@/modules/common/components/button"

// Homepage register-and-save CTA. Uses Ahmed's own warehouse/forklift photo
// (one of the real category reference photos, not the generic stock art the
// starter template shipped with) - a flat, strong overlay rather than a
// left-to-right gradient because that photo already has its own baked-in
// caption text that needs fully hiding, not just dimming on one side.
const PromoBanner = () => {
  return (
    <div className="content-container py-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--ps-line)] min-h-[280px] small:min-h-[340px] bg-[#111214]">
        <Image
          src="/category-tiles/fabrika-depo.jpg"
          alt=""
          fill
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[#111214]/70" />
        <div className="relative z-10 flex flex-col justify-center items-start h-full px-6 xsmall:px-10 small:px-16 py-10 gap-4 max-w-xl">
          <p className="text-[var(--ps-yellow)] text-xs uppercase tracking-[.24em] font-semibold">
            PS / PORTSAID
          </p>
          <h2 className="display-type text-3xl xsmall:text-4xl small:text-5xl font-semibold text-white leading-[1.1]">
            Bize Katılın
          </h2>
          <p className="text-white/80 text-base xsmall:text-lg leading-7">
            Hesap oluşturun, ilk siparişinizde{" "}
            <span className="text-[var(--ps-yellow)] font-semibold">%5 indirim</span>{" "}
            kazanın.
          </p>
          <LocalizedClientLink href="/account">
            <Button variant="secondary" className="rounded-2xl mt-2">
              Hemen Kaydol
            </Button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default PromoBanner
