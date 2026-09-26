import { getCategoryByHandle, listCategories } from "@/lib/data/categories"
import CategoryTemplate from "@/modules/categories/templates"
import { SortOptions } from "@/modules/store/components/refinement-list/sort-products"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

export const dynamicParams = true

const decodeCategorySegments = (segments: string[]) =>
  segments.map((segment) => {
    try {
      return decodeURIComponent(segment)
    } catch {
      return segment
    }
  })

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const locale = await getRequestLocale()

  try {
    const product_category = await getCategoryByHandle(
      decodeCategorySegments(params.category)
    )

    const title = product_category.name

    const description = product_category.description ?? `${title} ${translate(locale, "Category")}.`

    return {
      title: `${title} | Portsaid`,
      description,
      alternates: {
        canonical: `${params.category.join("/")}`,
      },
    }
  } catch (error) {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const handle = decodeCategorySegments(params.category).join("/")

  const categories = await listCategories()

  const currentCategory = categories.find(
    (category) => category.handle === handle
  )

  if (!currentCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      categories={categories}
      currentCategory={currentCategory}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
    />
  )
}
