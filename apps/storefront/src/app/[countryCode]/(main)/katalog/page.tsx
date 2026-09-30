import { listCategories } from "@/lib/data/categories"
import { listProducts } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import ProductPreview from "@/modules/products/components/product-preview"
import CatalogGuard from "@/modules/catalog/components/catalog-guard"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"
import { translateCatalogValue } from "@/lib/i18n/catalog"
import { HttpTypes } from "@medusajs/types"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Katalog | Portsaid",
  description: "Tüm ürünlerimiz tek sayfada.",
}

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function KatalogPage(props: Props) {
  const { countryCode } = await props.params
  const locale = await getRequestLocale()
  const t = (value: string) => translate(locale, value)

  const region = await getRegion(countryCode)
  if (!region) return null

  const [categories, { response }] = await Promise.all([
    listCategories(),
    listProducts({
      countryCode,
      queryParams: {
        limit: 300,
        fields:
          "*variants.calculated_price,*variants.options,+metadata,*categories",
      } as any,
    }),
  ])

  const products = response.products

  // Group by each product's first (leaf) category, ordered to match the
  // site's own category tree (parents first, each followed by its
  // children) so the catalog reads the same way the sidebar navigation
  // does - not the order products happen to come back from the API in.
  const orderedLeafCategories: HttpTypes.StoreProductCategory[] = []
  const collectLeaves = (category: HttpTypes.StoreProductCategory) => {
    if (category.category_children.length === 0) {
      orderedLeafCategories.push(category)
      return
    }
    for (const ref of category.category_children) {
      const child = categories.find((cat) => cat.id === ref.id)
      if (child) collectLeaves(child)
    }
  }
  categories
    .filter((cat) => cat.parent_category_id === null)
    .forEach(collectLeaves)

  const productsByCategoryId = new Map<string, HttpTypes.StoreProduct[]>()
  const uncategorized: HttpTypes.StoreProduct[] = []
  for (const product of products) {
    const categoryId = (product as any).categories?.[0]?.id
    if (!categoryId) {
      uncategorized.push(product)
      continue
    }
    if (!productsByCategoryId.has(categoryId)) {
      productsByCategoryId.set(categoryId, [])
    }
    productsByCategoryId.get(categoryId)!.push(product)
  }

  const sections = orderedLeafCategories
    .map((category) => ({
      category,
      products: productsByCategoryId.get(category.id) ?? [],
    }))
    .filter((section) => section.products.length > 0)

  return (
    <div className="bg-neutral-100">
      <div className="content-container py-10 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-neutral-950">
          {t("Full catalog")}
        </h1>
        <p className="text-neutral-600 text-sm max-w-2xl">
          {t("All our products, organized by category, in one place.")}
        </p>
      </div>

      <CatalogGuard>
        <div className="content-container flex flex-col gap-12 pb-16">
          {sections.map(({ category, products }) => (
            <section key={category.id} className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-neutral-950 border-b border-neutral-300 pb-2">
                {translateCatalogValue(category.name, locale, category.metadata, "name")}
                <span className="text-neutral-500 font-normal text-sm ml-2">
                  ({products.length})
                </span>
              </h2>
              <ul className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-5 gap-3">
                {products.map((product) => (
                  <li key={product.id}>
                    <ProductPreview product={product} region={region} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {uncategorized.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-neutral-950 border-b border-neutral-300 pb-2">
                {t("Other")}
                <span className="text-neutral-500 font-normal text-sm ml-2">
                  ({uncategorized.length})
                </span>
              </h2>
              <ul className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-5 gap-3">
                {uncategorized.map((product) => (
                  <li key={product.id}>
                    <ProductPreview product={product} region={region} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </CatalogGuard>
    </div>
  )
}
