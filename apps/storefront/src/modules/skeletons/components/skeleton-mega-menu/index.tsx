import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { Locale } from "@/lib/i18n/config"
import { translate } from "@/lib/i18n/messages"

// See skeleton-cart-button for why this streamed Suspense fallback needs
// its own locale-aware text instead of a hardcoded English string.
export default function SkeletonMegaMenu({ locale }: { locale?: Locale }) {
  return (
    <LocalizedClientLink
      className="hover:text-ui-fg-base hover:bg-neutral-100 rounded-full px-3 py-2"
      href="/store"
    >
      {translate(locale ?? "en", "Products")}
    </LocalizedClientLink>
  )
}
