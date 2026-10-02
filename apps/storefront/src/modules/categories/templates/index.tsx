import CategoryBreadcrumb from "@/modules/categories/category-breadcrumb"
import Button from "@/modules/common/components/button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import SkeletonProductGrid from "@/modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@/modules/store/components/refinement-list"
import { SortOptions } from "@/modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@/modules/store/templates/paginated-products"
import { ArrowUturnLeft } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Container, Text } from "@medusajs/ui"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { translateCatalogValue } from "@/lib/i18n/catalog"
import { translate } from "@/lib/i18n/messages"
import { Locale, defaultLocale } from "@/lib/i18n/config"

export default function CategoryTemplate({
  categories,
  currentCategory,
  sortBy,
  page,
  countryCode,
  locale,
  q,
}: {
  categories: HttpTypes.StoreProductCategory[]
  currentCategory: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  locale?: Locale
  q?: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!currentCategory || !countryCode) notFound()

  const description = translateCatalogValue(
    currentCategory.description,
    locale,
    currentCategory.metadata,
    "description"
  )

  // A parent category (e.g. "Ambalaj Malzemeleri") has no products directly
  // assigned to it - they all live on its children (e.g. "Balonlu Naylon")
  // - so querying by currentCategory.id alone always came back empty for
  // any parent, even though the sidebar's own recursive count showed it had
  // products. Collect every descendant id (including its own) so the page
  // pulls in the whole subtree.
  const collectCategoryIds = (
    category: HttpTypes.StoreProductCategory
  ): string[] => [
    category.id,
    ...category.category_children.flatMap((ref) => {
      const child = categories.find((cat) => cat.id === ref.id)
      return child ? collectCategoryIds(child) : []
    }),
  ]

  const categoryIds = collectCategoryIds(currentCategory)

  const hasAnyProducts = (category: HttpTypes.StoreProductCategory): boolean =>
    (category.products?.length ?? 0) > 0 ||
    category.category_children.some((ref) => {
      const child = categories.find((cat) => cat.id === ref.id)
      return child ? hasAnyProducts(child) : false
    })

  return (
    <div className="bg-neutral-100">
      <div
        className="flex flex-col py-6 content-container gap-4"
        data-testid="category-container"
      >
        <CategoryBreadcrumb
          categories={categories}
          category={currentCategory}
        />
        {description && (
          <Text className="text-neutral-600 max-w-3xl text-sm">
            {description}
          </Text>
        )}
        <div className="flex flex-col small:flex-row small:items-start gap-3">
          <RefinementList
            sortBy={sort}
            categories={categories}
            currentCategory={currentCategory}
            listName={currentCategory.name}
            data-testid="sort-by-container"
            hideOptionsPicker
          />
          <div className="w-full">
            {!hasAnyProducts(currentCategory) ? (
              <Container className="flex flex-col gap-2 justify-center text-center items-center text-sm text-neutral-500">
                <Text className="font-medium">
                  {translate(locale ?? defaultLocale, "No products found for this category.")}
                </Text>
                <LocalizedClientLink
                  href="/store"
                  className="flex gap-2 items-center"
                >
                  <Button variant="secondary">
                    {translate(locale ?? defaultLocale, "Back to all products")}
                    <ArrowUturnLeft className="w-4 h-4" />
                  </Button>
                </LocalizedClientLink>
              </Container>
            ) : (
              <Suspense
                fallback={
                  <SkeletonProductGrid
                    count={currentCategory.products?.length}
                  />
                }
              >
                <PaginatedProducts
                  sortBy={sort}
                  page={pageNumber}
                  categoryId={categoryIds}
                  countryCode={countryCode}
                  q={q}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
