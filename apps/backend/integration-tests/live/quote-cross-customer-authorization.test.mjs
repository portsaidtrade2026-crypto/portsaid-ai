import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { Client } from "pg"
import { test } from "node:test"

const baseUrl = process.env.BUYER_TEST_BACKEND_URL || "http://127.0.0.1:9000"
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const databaseUrl = process.env.DATABASE_URL
let assertionCount = 0

function check(value, message) {
  assertionCount += 1
  assert.ok(value, message)
}
function equal(actual, expected, message) {
  assertionCount += 1
  assert.equal(actual, expected, message)
}

const backend = new URL(baseUrl)
check(["127.0.0.1", "localhost", "::1"].includes(backend.hostname), "live authorization test only permits a loopback backend")

async function request(method, path, token, body, expected = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(publishableKey && { "x-publishable-api-key": publishableKey }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text.slice(0, 300) }
  }
  const statuses = Array.isArray(expected) ? expected : [expected]
  check(statuses.includes(response.status), `${method} ${path} returned ${response.status}`)
  return { data, status: response.status, text }
}

async function customer(label, id) {
  const email = `quote-auth-${label}-${id}@example.invalid`
  const password = `${randomUUID()}Aa1!`
  const registered = await request("POST", "/auth/customer/emailpass/register", undefined, { email, password })
  check(registered.data.token, `${label} registration returned a token`)
  const created = await request("POST", "/store/customers", registered.data.token, {
    email, first_name: "Quote", last_name: `Customer ${label}`,
  })
  check(created.data.customer?.id, `${label} customer was created`)
  const loggedIn = await request("POST", "/auth/customer/emailpass", undefined, { email, password })
  check(loggedIn.data.token, `${label} login returned a token`)
  const company = await request("POST", "/store/companies", loggedIn.data.token, {
    name: `Quote authorization ${label} ${id}`, email, currency_code: "eur",
  })
  check(company.data.companies?.[0]?.id, `${label} company was created`)
  return { email, token: loggedIn.data.token, customer: created.data.customer, company: company.data.companies[0] }
}

async function waitForBackend() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      if ((await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) })).ok) return
    } catch {
      // The Medusa development watcher can restart after creating an admin.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error("Development backend did not restart after creating the test admin")
}

async function snapshot(client, quoteId) {
  const query = async (sql, values) => (await client.query(sql, values)).rows
  const quote = await query('select row_to_json(row) as record from (select * from "quote" where id = $1) row', [quoteId])
  check(quote.length === 1, "scoped quote exists in the development database")
  const { draft_order_id: orderId, order_change_id: changeId } = quote[0].record
  return {
    quote,
    message: await query('select row_to_json(row) as record from (select * from "message" where quote_id = $1 order by id) row', [quoteId]),
    order: await query('select row_to_json(row) as record from (select * from "order" where id = $1) row', [orderId]),
    order_change: await query('select row_to_json(row) as record from (select * from "order_change" where id = $1) row', [changeId]),
    order_change_actions: await query('select row_to_json(row) as record from (select * from "order_change_action" where order_change_id = $1 order by id) row', [changeId]),
  }
}

test("development-only quote authorization is isolated between customers", async () => {
  check(publishableKey, "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required")
  check(databaseUrl, "DATABASE_URL is required for scoped state snapshots")
  const id = randomUUID().slice(0, 10)
  const a = await customer("a", id)
  const b = await customer("b", id)
  const regions = await request("GET", "/store/regions")
  const region = regions.data.regions?.find((entry) => entry.currency_code === "eur")
  check(region, "an existing EUR region is required")
  const products = await request("GET", "/store/products?limit=20&fields=id,*variants")
  const variant = products.data.products?.find((entry) => entry.variants?.length)?.variants[0]
  check(variant, "an existing development product variant is required")

  async function makeQuote(owner) {
    const cart = await request("POST", "/store/carts", owner.token, {
      region_id: region.id, email: owner.email, metadata: { company_id: owner.company.id },
    })
    check(cart.data.cart?.id, "cart was created")
    const item = await request("POST", `/store/carts/${cart.data.cart.id}/line-items`, owner.token, {
      variant_id: variant.id, quantity: 1,
    })
    check(item.data.cart?.items?.length === 1, "cart has one line item")
    const quote = await request("POST", "/store/quotes", owner.token, { cart_id: cart.data.cart.id })
    check(quote.data.quote?.id, "quote was created")
    check(quote.data.quote.customer_id === owner.customer.id, "quote belongs to its customer")
    return quote.data.quote
  }

  const aQuote = await makeQuote(a)
  const bAccept = await makeQuote(b)
  const bReject = await makeQuote(b)
  const adminEmail = `quote-auth-admin-${id}@example.invalid`
  const adminPassword = `${randomUUID()}Aa1!`
  execFileSync("corepack", ["pnpm", "exec", "medusa", "user", "-e", adminEmail, "-p", adminPassword], {
    cwd: new URL("../..", import.meta.url), stdio: "ignore", timeout: 90_000,
  })
  await waitForBackend()
  const admin = await request("POST", "/auth/user/emailpass", undefined, { email: adminEmail, password: adminPassword })
  check(admin.data.token, "development admin login returned a token")
  for (const quote of [aQuote, bAccept, bReject]) {
    const sent = await request("POST", `/admin/quotes/${quote.id}/send`, admin.data.token, {})
    equal(sent.data.quote?.status, "pending_customer", "quote is pending customer")
  }

  const db = new Client({ connectionString: databaseUrl })
  await db.connect()
  try {
    const nonexistent = randomUUID()
    const denialCases = [
      ["GET detail", "GET", `/store/quotes/${bAccept.id}`, undefined],
      ["GET preview", "GET", `/store/quotes/${bAccept.id}/preview`, undefined],
      ["POST accept", "POST", `/store/quotes/${bAccept.id}/accept`, {}],
      ["POST reject", "POST", `/store/quotes/${bAccept.id}/reject`, {}],
      ["POST message", "POST", `/store/quotes/${bAccept.id}/messages`, { text: "unauthorized internal test message" }],
    ]
    for (const [label, method, path, body] of denialCases) {
      const missing = await request(method, path.replace(bAccept.id, nonexistent), a.token, body, 404)
      const before = await Promise.all([snapshot(db, bAccept.id), snapshot(db, aQuote.id), snapshot(db, bReject.id)])
      const denied = await request(method, path, a.token, body, 404)
      equal(denied.status, missing.status, `${label} uses the same status as nonexistent quote`)
      equal(denied.data.type, missing.data.type, `${label} uses the same error type as nonexistent quote`)
      equal(denied.data.message, missing.data.message, `${label} uses the same message as nonexistent quote`)
      check(!denied.text.includes(bAccept.id) && !denied.text.includes(b.customer.id), `${label} response has no sensitive B identifiers`)
      const after = await Promise.all([snapshot(db, bAccept.id), snapshot(db, aQuote.id), snapshot(db, bReject.id)])
      equal(JSON.stringify(after), JSON.stringify(before), `${label} leaves every scoped quote, message, order and order change unchanged`)
    }

    const detail = await request("GET", `/store/quotes/${bAccept.id}`, b.token)
    equal(detail.data.quote?.id, bAccept.id, "B can read its quote")
    const preview = await request("GET", `/store/quotes/${bAccept.id}/preview`, b.token)
    equal(preview.data.quote?.id, bAccept.id, "B can preview its quote")
    const message = await request("POST", `/store/quotes/${bAccept.id}/messages`, b.token, { text: "internal development authorization message" })
    check(message.data.quote?.messages?.some((entry) => entry.text === "internal development authorization message"), "B can add an internal quote message")
    const accepted = await request("POST", `/store/quotes/${bAccept.id}/accept`, b.token, {})
    equal(accepted.data.quote?.status, "accepted", "B can accept its quote")
    const rejected = await request("POST", `/store/quotes/${bReject.id}/reject`, b.token, {})
    equal(rejected.data.quote?.status, "customer_rejected", "B can reject its second quote")
  } finally {
    await db.end()
  }
  console.log(`QUOTE AUTHORIZATION ASSERTIONS: ${assertionCount}`)
})