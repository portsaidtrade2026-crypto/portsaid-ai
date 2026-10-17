import { listCategories } from "@/lib/data/categories"
import CategoryGrid from "@/modules/home/components/category-grid"
import ComingSoonBanner from "@/modules/home/components/coming-soon-banner"
import FeaturedProducts from "@/modules/home/components/featured-products"
import Hero from "@/modules/home/components/hero"
import PromoBanner from "@/modules/home/components/promo-banner"
import SkeletonFeaturedProducts from "@/modules/skeletons/templates/skeleton-featured-products"
import { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "PS PORT — Ambalaj ve Endüstriyel Tedarik",
  description:
    "Reliable packaging, office, and logistics supplies for businesses that keep moving.",
}

// Handles of categories that hold at least one product, counting subcategories,
// so the tile grid never links to an empty or missing category page.
async function getCategoriesWithProducts(): Promise<string[] | undefined> {
  try {
    const categories = await listCategories()
    const childrenOf = new Map<string, string[]>()
    for (const c of categories) {
      if (!c.parent_category_id) continue
      childrenOf.set(c.parent_category_id, [
        ...(childrenOf.get(c.parent_category_id) ?? []),
        c.id,
      ])
    }
    const byId = new Map(categories.map((c) => [c.id, c]))
    const hasProducts = (id: string, seen = new Set<string>()): boolean => {
      if (seen.has(id)) return false
      seen.add(id)
      if ((byId.get(id)?.products?.length ?? 0) > 0) return true
      return (childrenOf.get(id) ?? []).some((child) => hasProducts(child, seen))
    }
    return categories.filter((c) => hasProducts(c.id)).map((c) => c.handle)
  } catch {
    return undefined
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params
  const availableHandles = await getCategoriesWithProducts()

  return (
    <div className="flex flex-col gap-y-2 m-2">
      <Hero />
      <ComingSoonBanner />
      <CategoryGrid availableHandles={availableHandles} />
      <PromoBanner />
      <Suspense fallback={<SkeletonFeaturedProducts />}>
        <FeaturedProducts countryCode={countryCode} />
      </Suspense>
    </div>
  )
}
