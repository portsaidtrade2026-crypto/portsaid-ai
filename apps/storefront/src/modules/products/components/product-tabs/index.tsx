"use client"

import { HttpTypes } from "@medusajs/types"
import { Table, Text } from "@medusajs/ui"
import Markdown from "react-markdown"
import Accordion from "./accordion"
import { useI18n } from "@/lib/i18n/provider"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const { t } = useI18n()
  const tabs = [
    {
      label: t("Description"),
      component: <ProductSpecsTab product={product} />,
    },
    {
      label: t("Specifications"),
      component: <ProductSpecificationsTab product={product} />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple" className="flex flex-col gap-y-2">
        {tabs.map((tab, i) => (
          <Accordion.Item
            className="bg-neutral-100 small:px-24 px-6"
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const ProductSpecsTab = ({ product }: ProductTabsProps) => {
  const { t } = useI18n()
  // A lone "-" fed into react-markdown parses as an empty bullet list
  // (<ul><li></li></ul>) - nothing renders at all, not even a dash, so an
  // undescribed product's "Description" tab looked silently broken rather
  // than empty-on-purpose. Skip Markdown entirely when there's no real
  // description instead of handing it placeholder text to parse.
  if (!product.description) {
    return (
      <div className="text-small-regular py-8 medium:w-2/3">
        <Text className="text-neutral-500">{t("No description available")}</Text>
      </div>
    )
  }
  return (
    <div className="text-small-regular py-8 medium:w-2/3">
      <Markdown
        components={{
          p: ({ children }) => (
            <Text className="text-neutral-950 mb-2">{children}</Text>
          ),
          h2: ({ children }) => (
            <Text className="text-xl text-neutral-950 my-4 font-semibold">
              {children}
            </Text>
          ),
          h3: ({ children }) => (
            <Text className="text-lg text-neutral-950 mb-2">{children}</Text>
          ),
        }}
      >
        {product.description}
      </Markdown>
    </div>
  )
}

const ProductSpecificationsTab = ({ product }: ProductTabsProps) => {
  const { t } = useI18n()
  return (
    <div className="text-small-regular py-8">
      <Table className="rounded-lg shadow-borders-base overflow-hidden border-none">
        <Table.Body>
          {product.weight && (
            <Table.Row>
              <Table.Cell className="border-r">
                <span className="font-semibold">{t("Weight")}</span>
              </Table.Cell>
               <Table.Cell className="px-4">{product.weight} {t("grams")}</Table.Cell>
            </Table.Row>
          )}
          {(product.height || product.width || product.length) && (
            <Table.Row>
              <Table.Cell className="border-r">
                <span className="font-semibold">{t("Dimensions (HxWxL)")}</span>
              </Table.Cell>
              <Table.Cell className="px-4">
                {product.height}mm x {product.width}mm x {product.length}mm
              </Table.Cell>
            </Table.Row>
          )}
          {/* product.metadata is import/ERP-sync bookkeeping only
              (source, bizimhesap_category, translations, review flags from
              the various migration-scripts/import-*.ts batches) - there is
              no customer-facing spec field that lives in metadata, those
              are the product's options (thickness/width/length/color),
              rendered separately in the variants table. A previous version
              of this tab dumped every string/number/boolean metadata entry
              here, which surfaced things like "source: bizimhesap_sync"
              as if it were a real specification. */}
        </Table.Body>
      </Table>
    </div>
  )
}

export default ProductTabs
