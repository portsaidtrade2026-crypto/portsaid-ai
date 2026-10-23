"use client"

import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { useI18n } from "@/lib/i18n/provider"

const StoreBreadcrumbItem = ({
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
        href={handle ? `${handle}` : "/store"}
      >
        {title}
      </LocalizedClientLink>
    </li>
  )
}

const StoreBreadcrumb = () => {
  const { t } = useI18n()
  return (
    <ul className="flex items-center gap-x-3 text-sm">
      <StoreBreadcrumbItem title={t("Products")} key="base" />
      <span className="text-neutral-500">{">"}</span>
      <StoreBreadcrumbItem title={t("All products")} handle="/store" />
    </ul>
  )
}

export default StoreBreadcrumb
