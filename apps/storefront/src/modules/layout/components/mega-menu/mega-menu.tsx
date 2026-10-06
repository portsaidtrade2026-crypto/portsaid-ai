"use client"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n/provider"
import { translateCatalogValue } from "@/lib/i18n/catalog"
import MenuIcon from "@/modules/common/icons/menu"
import X from "@/modules/common/icons/x"
import ChevronDown from "@/modules/common/icons/chevron-down"

// One row of the mobile accordion, recursing into its own children when
// expanded - a category can now nest two levels deep (e.g. Makineler >
// Ambalaj Makineleri > İkinci), and a flat one-level list can't reach the
// bottom one. Every level starts closed; toggling a row only touches its
// own id in the shared expandedIds set, so a parent and child can be open
// independently of each other.
const MobileCategoryRow = ({
  category,
  depth,
  getSubCategories,
  categoryName,
  expandedIds,
  setExpandedIds,
  onNavigate,
}: {
  category: HttpTypes.StoreProductCategory
  depth: number
  getSubCategories: (id: string) => HttpTypes.StoreProductCategory[]
  categoryName: (category: HttpTypes.StoreProductCategory) => string
  expandedIds: Set<string>
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>
  onNavigate: () => void
}) => {
  const subs = getSubCategories(category.id)
  const isExpanded = expandedIds.has(category.id)
  const toggle = () =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(category.id) ? next.delete(category.id) : next.add(category.id)
      return next
    })

  return (
    <div className={depth === 0 ? "border-t border-[var(--ps-line)]" : ""}>
      <div className="flex items-center justify-between">
        <LocalizedClientLink
          href={`/categories/${category.handle}`}
          className={clx("flex-1 py-3", depth === 0 ? "px-3 font-medium" : "ps-6 pe-3 text-sm text-neutral-500 dark:text-neutral-400")}
          onClick={onNavigate}
        >
          {categoryName(category)}
        </LocalizedClientLink>
        {subs.length > 0 && (
          <button
            type="button"
            className="p-3"
            onClick={toggle}
            aria-expanded={isExpanded}
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
        <div className="flex flex-col pb-2 ps-4">
          {subs.map((sub) => (
            <MobileCategoryRow
              key={sub.id}
              category={sub}
              depth={depth + 1}
              getSubCategories={getSubCategories}
              categoryName={categoryName}
              expandedIds={expandedIds}
              setExpandedIds={setExpandedIds}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const MegaMenu = ({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  // Any number of branches can be open at once, at any depth (a category can
  // now nest two levels deep, e.g. Makineler > Ambalaj Makineleri > İkinci) -
  // a single expandedCategory id can't represent that, so this is a set of
  // every currently-open id instead. Starts empty (closed) every time the
  // mobile panel opens.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
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

  const triggerRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [panelTop, setPanelTop] = useState(60)
  const [openGroups, setOpenGroups] = useState<string[]>([])

  // Sub-groups start collapsed every time the panel opens or the main category changes.
  useEffect(() => {
    setOpenGroups([])
  }, [isHovered, selectedCategory])

  // The first category that actually has children is pre-selected so the panel
  // is never opened empty.
  const defaultCategory =
    mainCategories.find((c) => getSubCategories(c.id).length > 0) ??
    mainCategories[0]
  const activeCategory =
    mainCategories.find((c) => c.id === selectedCategory) ?? defaultCategory

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    const header = triggerRef.current?.closest("header")?.parentElement
    if (header) setPanelTop(Math.round(header.getBoundingClientRect().bottom))
    setIsHovered(true)
  }

  const scheduleClose = () => {
    if (selectTimer.current) clearTimeout(selectTimer.current)
    closeTimer.current = setTimeout(() => setIsHovered(false), 250)
  }

  const closeNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setIsHovered(false)
  }

  // A short intent delay stops the right-hand panel from flickering while the
  // pointer travels diagonally from the list into the panel.
  const previewCategory = (categoryId: string) => {
    if (selectTimer.current) clearTimeout(selectTimer.current)
    selectTimer.current = setTimeout(() => setSelectedCategory(categoryId), 90)
  }

  useEffect(() => {
    setIsHovered(false)
    setIsMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isHovered) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeNow()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isHovered])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
      if (selectTimer.current) clearTimeout(selectTimer.current)
    },
    []
  )

  const activeSubs = activeCategory ? getSubCategories(activeCategory.id) : []
  const groupedSubs = activeSubs.filter(
    (sub) => getSubCategories(sub.id).length > 0
  )
  const leafSubs = activeSubs.filter(
    (sub) => getSubCategories(sub.id).length === 0
  )

  return (
    <>
      <button
        type="button"
        className="small:hidden flex items-center justify-center p-2 rounded-full hover:bg-neutral-100"
        onClick={() => {
          setExpandedIds(new Set())
          setIsMobileOpen(true)
        }}
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
              <span className="font-medium text-lg">{t("Categories")}</span>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
              >
                {t("Close")}
                <X size={16} />
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
              {mainCategories.map((category) => (
                <MobileCategoryRow
                  key={category.id}
                  category={category}
                  depth={0}
                  getSubCategories={getSubCategories}
                  categoryName={categoryName}
                  expandedIds={expandedIds}
                  setExpandedIds={setExpandedIds}
                  onNavigate={() => setIsMobileOpen(false)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        ref={triggerRef}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        className="z-50 hidden small:block"
      >
        <LocalizedClientLink
          className={clx(
            "hover:text-ui-fg-base hover:bg-neutral-100 rounded-full px-3 py-2",
            isHovered && "bg-neutral-100"
          )}
          href="/store"
          aria-expanded={isHovered}
          aria-haspopup="true"
        >
          {t("Products")}
        </LocalizedClientLink>
        {isHovered && activeCategory && (
          <div
            className="fixed inset-x-0 z-50 ps-surface border-b border-[var(--ps-line)] shadow-2xl flex"
            style={{
              top: panelTop,
              height: `min(640px, calc(100vh - ${panelTop}px - 24px))`,
            }}
          >
            <div className="mx-auto flex w-full max-w-[1440px] min-h-0">
              <ul className="w-72 shrink-0 overflow-y-auto border-e border-[var(--ps-line)] py-6 px-4 flex flex-col gap-1">
                {mainCategories.map((category) => {
                  const hasSubs = getSubCategories(category.id).length > 0
                  const isActive = activeCategory.id === category.id
                  const rowClass = clx(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-start font-medium transition-colors",
                    "hover:bg-[color-mix(in_srgb,var(--ps-yellow)_30%,transparent)]",
                    isActive &&
                      "bg-[color-mix(in_srgb,var(--ps-yellow)_30%,transparent)]"
                  )
                  return (
                    <li key={category.id}>
                      {hasSubs ? (
                        <button
                          type="button"
                          className={rowClass}
                          onMouseEnter={() => previewCategory(category.id)}
                          onFocus={() => setSelectedCategory(category.id)}
                          onClick={() => setSelectedCategory(category.id)}
                          aria-current={isActive}
                        >
                          <span>{categoryName(category)}</span>
                          <ChevronDown className="-rotate-90 rtl:rotate-90 shrink-0" />
                        </button>
                      ) : (
                        <LocalizedClientLink
                          href={`/categories/${category.handle}`}
                          className={rowClass}
                          onMouseEnter={() => previewCategory(category.id)}
                        >
                          <span>{categoryName(category)}</span>
                        </LocalizedClientLink>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="relative flex-1 min-w-0 overflow-y-auto p-8">
                <button
                  type="button"
                  onClick={closeNow}
                  className="absolute top-4 end-6 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
                >
                  {t("Close")}
                  <X size={16} />
                </button>

                <LocalizedClientLink
                  href={`/categories/${activeCategory.handle}`}
                  className="inline-block font-semibold underline decoration-[var(--ps-yellow)] decoration-2 underline-offset-4 hover:opacity-80"
                >
                  {t("View all {name}", {
                    name: categoryName(activeCategory),
                  })}
                </LocalizedClientLink>

                <div className="mt-8 grid grid-cols-2 medium:grid-cols-3 large:grid-cols-4 gap-x-10 gap-y-10">
                  {leafSubs.length > 0 && (
                    <div className="col-span-full">
                      <h3 className="mb-3 font-semibold">
                        {groupedSubs.length > 0
                          ? t("Categories")
                          : categoryName(activeCategory)}
                      </h3>
                      <ul className="columns-2 medium:columns-3 large:columns-4 gap-x-10">
                        {leafSubs.map((sub) => (
                          <li key={sub.id} className="break-inside-avoid">
                            <LocalizedClientLink
                              href={`/categories/${sub.handle}`}
                              className="block py-1.5 text-[var(--ps-muted)] hover:text-[var(--ps-ink)] hover:underline"
                            >
                              {categoryName(sub)}
                            </LocalizedClientLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {groupedSubs.map((sub) => {
                    const isOpen = openGroups.includes(sub.id)
                    return (
                      <div key={sub.id} className="min-w-0 self-start">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenGroups((prev) =>
                              prev.includes(sub.id)
                                ? prev.filter((id) => id !== sub.id)
                                : [...prev, sub.id]
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 border-b border-[var(--ps-line)] pb-2 text-start font-semibold hover:opacity-80"
                        >
                          <span>{categoryName(sub)}</span>
                          <ChevronDown
                            className={clx(
                              "shrink-0 transition-transform",
                              isOpen && "rotate-180"
                            )}
                          />
                        </button>
                        {isOpen && (
                          <ul className="mt-2 flex flex-col">
                            <li>
                              <LocalizedClientLink
                                href={`/categories/${sub.handle}`}
                                className="block py-1.5 font-medium underline decoration-[var(--ps-yellow)] decoration-2 underline-offset-4 hover:opacity-80"
                              >
                                {t("View all {name}", {
                                  name: categoryName(sub),
                                })}
                              </LocalizedClientLink>
                            </li>
                            {getSubCategories(sub.id).map((leaf) => (
                              <li key={leaf.id}>
                                <LocalizedClientLink
                                  href={`/categories/${leaf.handle}`}
                                  className="block py-1.5 text-[var(--ps-muted)] hover:text-[var(--ps-ink)] hover:underline"
                                >
                                  {categoryName(leaf)}
                                </LocalizedClientLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {isHovered && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 bg-black/30"
          style={{ top: panelTop }}
          onClick={closeNow}
        />
      )}
    </>
  )
}

export default MegaMenu
