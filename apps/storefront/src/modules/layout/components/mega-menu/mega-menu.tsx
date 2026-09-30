"use client"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n/provider"
import { translateCatalogValue } from "@/lib/i18n/catalog"
import MenuIcon from "@/modules/common/icons/menu"
import X from "@/modules/common/icons/x"
import ChevronDown from "@/modules/common/icons/chevron-down"

const MegaMenu = ({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<
    HttpTypes.StoreProductCategory["id"] | null
  >(null)
  const [selectedCategory, setSelectedCategory] = useState<
    HttpTypes.StoreProductCategory["id"] | null
  >(null)
  const { t, locale } = useI18n()
  const categoryName = (category: HttpTypes.StoreProductCategory) =>
    translateCatalogValue(category.name, locale, category.metadata, "name")

  const pathname = usePathname()

  const mainCategories = categories.filter(
    (category) => !category.parent_category_id
  )

  const getSubCategories = (categoryId: string) => {
    return categories.filter(
      (category) => category.parent_category_id === categoryId
    )
  }

  let menuTimeout: NodeJS.Timeout | null = null

  const handleMenuHover = () => {
    if (menuTimeout) {
      clearTimeout(menuTimeout)
    }
    setIsHovered(true)
  }

  const handleMenuLeave = () => {
    menuTimeout = setTimeout(() => {
      setIsHovered(false)
    }, 300)

    return () => {
      if (menuTimeout) {
        clearTimeout(menuTimeout)
      }
    }
  }

  let categoryTimeout: NodeJS.Timeout | null = null

  const handleCategoryHover = (categoryId: string) => {
    categoryTimeout = setTimeout(() => {
      setSelectedCategory(categoryId)
    }, 200)

    return () => {
      if (categoryTimeout) {
        clearTimeout(categoryTimeout)
      }
    }
  }

  const handleCategoryLeave = () => {
    if (categoryTimeout) {
      clearTimeout(categoryTimeout)
    }
  }

  useEffect(() => {
    setIsHovered(false)
    setIsMobileOpen(false)
  }, [pathname])

  return (
    <>
      <button
        type="button"
        className="small:hidden flex items-center justify-center p-2 rounded-full hover:bg-neutral-100"
        onClick={() => setIsMobileOpen(true)}
        aria-label={t("Menu")}
      >
        <MenuIcon />
      </button>

      {isMobileOpen && (
        <div className="small:hidden fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-sm ps-surface overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--ps-line)]">
              <span className="font-medium">{t("Products")}</span>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label={t("Close")}
                className="p-1"
              >
                <X />
              </button>
            </div>
            <div className="flex flex-col p-2">
              <LocalizedClientLink
                href="/store"
                className="px-3 py-3 font-medium"
                onClick={() => setIsMobileOpen(false)}
              >
                {t("All products")}
              </LocalizedClientLink>
              {mainCategories.map((category) => {
                const subs = getSubCategories(category.id)
                const isExpanded = expandedCategory === category.id
                return (
                  <div
                    key={category.id}
                    className="border-t border-[var(--ps-line)]"
                  >
                    <div className="flex items-center justify-between">
                      <LocalizedClientLink
                        href={`/categories/${category.handle}`}
                        className="flex-1 px-3 py-3"
                        onClick={() => setIsMobileOpen(false)}
                      >
                        {categoryName(category)}
                      </LocalizedClientLink>
                      {subs.length > 0 && (
                        <button
                          type="button"
                          className="p-3"
                          onClick={() =>
                            setExpandedCategory(
                              isExpanded ? null : category.id
                            )
                          }
                          aria-label={categoryName(category)}
                        >
                          <ChevronDown
                            className={clx(
                              "transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      )}
                    </div>
                    {isExpanded && subs.length > 0 && (
                      <div className="flex flex-col pb-2 pl-4">
                        {subs.map((subCategory) => (
                          <LocalizedClientLink
                            key={subCategory.id}
                            href={`/categories/${subCategory.handle}`}
                            className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400"
                            onClick={() => setIsMobileOpen(false)}
                          >
                            {categoryName(subCategory)}
                          </LocalizedClientLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div
        onMouseEnter={handleMenuHover}
        onMouseLeave={handleMenuLeave}
        className="z-50 hidden small:block"
      >
        <LocalizedClientLink
          className="hover:text-ui-fg-base hover:bg-neutral-100 rounded-full px-3 py-2"
          href="/store"
        >
          {t("Products")}
        </LocalizedClientLink>
        {isHovered && (
          <div className="fixed left-0 right-0 top-[60px] flex gap-32 py-10 px-20 bg-white border-b border-neutral-200 ">
            <div className="flex flex-col gap-2">
              {mainCategories.map((category) => (
                <LocalizedClientLink
                  key={category.id}
                  href={`/categories/${category.handle}`}
                  className={clx(
                    "hover:bg-neutral-100 hover:cursor-pointer rounded-full px-3 py-2 w-fit font-medium",
                    selectedCategory === category.id && "bg-neutral-100"
                  )}
                  onMouseEnter={() => handleCategoryHover(category.id)}
                  onMouseLeave={handleCategoryLeave}
                >
                  {categoryName(category)}
                </LocalizedClientLink>
              ))}
            </div>
            {selectedCategory && (
              <div className="grid grid-cols-4 gap-16">
                {getSubCategories(selectedCategory).map((category) => (
                  <div key={category.id} className="flex flex-col gap-2">
                    <LocalizedClientLink
                      className="font-medium text-zinc-500 dark:text-zinc-300 hover:underline"
                      href={`/categories/${category.handle}`}
                    >
                      {categoryName(category)}
                    </LocalizedClientLink>
                    <div className="flex flex-col gap-2">
                      {getSubCategories(category.id).map((subCategory) => (
                        <LocalizedClientLink
                          key={subCategory.id}
                          className="text-zinc-700 dark:text-zinc-200 hover:underline"
                          href={`/categories/${subCategory.handle}`}
                        >
                          {categoryName(subCategory)}
                        </LocalizedClientLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {isHovered && (
        <div className="fixed inset-0 mt-[60px] blur-sm backdrop-blur-sm z-[-1]" />
      )}
    </>
  )
}

export default MegaMenu
