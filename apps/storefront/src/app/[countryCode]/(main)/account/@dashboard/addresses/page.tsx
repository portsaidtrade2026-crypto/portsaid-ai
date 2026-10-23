import { retrieveCustomer } from "@/lib/data/customer"
import { getRegion } from "@/lib/data/regions"
import AddressBook from "@/modules/account/components/address-book"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getRequestLocale } from "@/lib/i18n/server"
import { translate } from "@/lib/i18n/messages"

export const metadata: Metadata = {
  title: "Addresses",
  description: "View your addresses",
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)
  const locale = await getRequestLocale()

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{translate(locale, "Shipping Addresses")}</h1>
        <p className="text-base-regular">
          {translate(locale, "View and update your shipping addresses, you can add as many as you like. Saving your addresses will make them available during checkout.")}
        </p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
