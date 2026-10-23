import { listCategoryHandlesWithProducts } from "@/lib/data/categories"
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
    return await listCategoryHandlesWithProducts()
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
