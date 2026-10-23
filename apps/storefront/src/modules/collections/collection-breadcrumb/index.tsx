"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { useI18n } from "@/lib/i18n/provider"

const CollectionBreadcrumbItem = ({
  title,
  handle,
}: {
  title: string
  handle?: string
}) => {
  return (
    <li className="text-neutral-500">
      <LocalizedClientLink
        className="hover:text-neutral-900"
        href={handle ? `/collections/${handle}` : "/store"}
      >
        {title}
      </LocalizedClientLink>
    </li>
  )
}

const CollectionBreadcrumb = ({
  collection,
}: {
  collection: HttpTypes.StoreCollection
}) => {
  const { t } = useI18n()
  return (
    <ul className="flex items-center gap-x-3 text-sm">
       <CollectionBreadcrumbItem title={t("Products")} key="base" />
      <span className="text-neutral-500">{">"}</span>
      <CollectionBreadcrumbItem
        title={collection.title}
        handle={collection.handle}
        key={collection.id}
      />
    </ul>
  )
}

export default CollectionBreadcrumb
