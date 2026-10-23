import { getProductByHandle } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import ProductTemplate from "@/modules/products/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamicParams = true

const decodeProductHandle = (handle: string) => {
  try {
    return decodeURIComponent(handle)
  } catch {
    return handle
  }
}

type Props = {
  params: { countryCode: string; handle: string }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const handle = decodeProductHandle(params.handle)
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await getProductByHandle(handle, region.id)

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Portsaid`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Portsaid`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const handle = decodeProductHandle(params.handle)
  const pricedProduct = await getProductByHandle(handle, region.id)
  if (!pricedProduct) {
    notFound()
  }

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
    />
  )
}
