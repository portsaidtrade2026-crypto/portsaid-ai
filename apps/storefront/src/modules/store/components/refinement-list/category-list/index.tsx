"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import ChevronDown from "@/modules/common/icons/chevron-down"
import { clx } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { Container, Text } from "@medusajs/ui"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n/provider"
import { translateCatalogValue } from "@/lib/i18n/catalog"

const CategoryList = ({
  categories,
  currentCategory,
}: {
  categories: HttpTypes.StoreProductCategory[]
  currentCategory?: HttpTypes.StoreProductCategory
}) => {
  const { t, locale } = useI18n()
  const categoryName = (category: HttpTypes.StoreProductCategory) =>
    translateCatalogValue(category.name, locale, category.metadata, "name")
  const getCategoriesToExpand = useCallback(
    (category: HttpTypes.StoreProductCategory) => {
      const categoriesToExpand = [category.id]
      let current = category
      while (current.parent_category_id) {
        categoriesToExpand.push(current.parent_category_id)
        current = categories.find(
          (cat) => cat.id === current.parent_category_id
        ) as HttpTypes.StoreProductCategory
      }
      return categoriesToExpand
    },
    [categories]
  )

  const [expandedCategories, setExpandedCategories] = useState<string[]>(() =>
    currentCategory ? getCategoriesToExpand(currentCategory) : []
  )

  const pathname = usePathname()

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const searchParams = useSearchParams()

  const isCurrentCategory = (handle: string) =>
    pathname.split("/").slice(2).join("/") === `categories/${handle}`

  useEffect(() => {
    if (currentCategory) {
      const categoriesToExpand = getCategoriesToExpand(currentCategory)
      setExpandedCategories((prev) => {
        const newCategories = categoriesToExpand.filter(
          (cat) => !prev.includes(cat)
        )
        return newCategories.length ? [...prev, ...newCategories] : prev
      })
    }
  }, [currentCategory, getCategoriesToExpand])

  // Plain name + chevron toggle, no counts and no checkbox/radio markers -
  // matches the same closed-by-default, tap-to-expand pattern as the mobile
  // mega-menu (expand shows a "View all X" link first, then the children),
  // instead of the old flat checkbox-tree-with-counts look.
  const renderCategory = (category: HttpTypes.StoreProductCategory, depth = 0) => {
    const hasChildren = category.category_children.length > 0
    const isExpanded = expandedCategories.includes(category.id)
    const href = `/categories/${category.handle}${
      searchParams.size ? `?${searchParams.toString()}` : ""
    }`

    return (
      <li key={category.id}>
        <div
          className={clx(
            "flex items-center justify-between gap-2",
            depth === 0 ? "py-2" : "py-1.5 ps-4"
          )}
        >
          <LocalizedClientLink
            href={href}
            className={clx(
              "hover:text-neutral-900",
              isCurrentCategory(category.handle) && "font-medium text-neutral-900"
            )}
          >
            {categoryName(category)}
          </LocalizedClientLink>
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              aria-expanded={isExpanded}
              aria-label={categoryName(category)}
              className="p-1 shrink-0"
            >
              <ChevronDown
                className={clx("transition-transform", isExpanded && "rotate-180")}
              />
            </button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <ul className="ps-4">
            <li>
              <LocalizedClientLink
                href={href}
                className="block py-1.5 text-sm font-medium text-[var(--ps-ink)] hover:underline"
              >
                {t("View all {name}", { name: categoryName(category) })} →
              </LocalizedClientLink>
            </li>
            {category.category_children.map((childId) => {
              const childCategory = categories.find(
                (cat) => cat.id === childId.id
              )
              return childCategory
                ? renderCategory(childCategory, depth + 1)
                : null
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <Container className="flex flex-col p-0 divide-y divide-neutral-200">
      <div className="flex justify-between items-center p-3">
        <Text className="text-sm font-medium">{t("Categories")}</Text>
        {pathname.includes("/categories") && (
          <LocalizedClientLink
            href="/store"
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
             {t("Clear")}
          </LocalizedClientLink>
        )}
      </div>
      <ul className="flex flex-col text-sm p-3 text-neutral-500">
        {categories
          .filter((cat) => cat.parent_category_id === null)
          .map((c) => renderCategory(c))}
      </ul>
    </Container>
  )
}

export default CategoryList
