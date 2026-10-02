import ShoppingBag from "@/modules/common/icons/shopping-bag"
import { Locale } from "@/lib/i18n/config"
import { translate } from "@/lib/i18n/messages"

export default function SkeletonCartButton({ locale }: { locale?: Locale }) {
  return (
    <button className="transition-fg relative inline-flex w-fit items-center justify-center overflow-hidden outline-none txt-compact-small-plus gap-x-1.5 px-3 py-1.5 rounded-full hover:bg-neutral-100">
      <ShoppingBag />
      <span className="text-sm font-normal hidden small:inline-block">
        {/* Next streams this fallback into the initial HTML while
            CartButton's async cart/customer fetch resolves - both this and
            the real CartDrawer's translated text can briefly coexist in the
            response, so this needs its own locale-aware text rather than a
            hardcoded "Cart" that flashes in English for every locale. */}
        {translate(locale ?? "en", "Cart")}
      </span>
      <div className="bg-blue-500 text-white text-xs px-1.5 py-px rounded-full">
        0
      </div>
    </button>
  )
}
