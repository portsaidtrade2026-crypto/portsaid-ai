import { Metadata } from "next"

import { retrieveCustomer } from "@/lib/data/customer"
import { listOrders, listOrderIdsForNumbering } from "@/lib/data/orders"
import Overview from "@/modules/account/components/overview"
import { buildCustomerOrderNumberMap } from "@/lib/util/customer-order-number"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) {
    notFound()
  }

  const orders = await listOrders().catch(() => null)
  // listOrders() only returns the 10 most recent - not enough to number
  // this customer's orders correctly (their 1st order could easily be
  // outside that window), so the ranking is built from a separate,
  // lightweight full-history fetch instead.
  const allOrderIds = await listOrderIdsForNumbering()
  // Overview is a client component - a Map can't cross the server/client
  // prop boundary (Next's RSC serialization doesn't carry it), so this
  // goes over as a plain object instead.
  const orderNumbers = Object.fromEntries(buildCustomerOrderNumberMap(allOrderIds))

  return <Overview customer={customer} orders={orders} orderNumbers={orderNumbers} />
}
