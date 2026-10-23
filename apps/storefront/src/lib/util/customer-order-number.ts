// Medusa's order.display_id is a single sequence shared by the whole
// store, not per customer - so a B2B customer's very first order could
// read "#47" (counting every other customer's orders too), which Ahmed
// flagged as wrong: he wants "your Nth order," specific to that customer.
// This derives that number from the customer's own order list (position
// when sorted oldest-first) instead of changing display_id itself, which
// Medusa manages internally as a real sequence other systems may rely on.
export const buildCustomerOrderNumberMap = (
  orders: { id: string; created_at: string }[]
): Map<string, number> => {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const map = new Map<string, number>()
  sorted.forEach((order, index) => map.set(order.id, index + 1))
  return map
}
