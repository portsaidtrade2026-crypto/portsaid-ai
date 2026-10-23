import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { test } from "node:test"

const baseUrl = process.env.BUYER_TEST_BACKEND_URL || "http://127.0.0.1:9000"
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

async function waitForBackend() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) return
    } catch {
      // The Medusa development watcher can briefly restart after its CLI runs.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error("Medusa did not become healthy after creating the test admin")
}

async function request(method, path, body, token, expected = 200) {
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
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { message: text.slice(0, 300) }
  }
  console.log(`${method} ${path.split("?")[0]} -> ${response.status}`)
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(data).slice(0, 900)}`
  )
  return data
}

test("buyer journeys against the running Medusa API", async (t) => {
  assert.ok(publishableKey, "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required")
  const id = randomUUID().slice(0, 12)
  const email = `buyer-e2e-${id}@example.invalid`
  const password = randomUUID() + "Aa1!"
  const ctx = {}

  await t.test("company account login", async () => {
    const registered = await request("POST", "/auth/customer/emailpass/register", {
      email,
      password,
    })
    assert.ok(registered.token)
    const { customer } = await request(
      "POST",
      "/store/customers",
      { email, first_name: "Test", last_name: "Buyer" },
      registered.token
    )
    ctx.customer = customer
    const loggedIn = await request("POST", "/auth/customer/emailpass", {
      email,
      password,
    })
    assert.ok(loggedIn.token)
    ctx.token = loggedIn.token
    const { companies } = await request(
      "POST",
      "/store/companies",
      { name: `Buyer test ${id}`, email, currency_code: "eur" },
      ctx.token
    )
    ctx.company = companies[0]
    assert.ok(ctx.company.id)
    const { customer: account } = await request(
      "GET",
      "/store/customers/me?fields=*employee,*employee.company",
      undefined,
      ctx.token
    )
    const employee = account.employee
    assert.ok(employee?.id, "company creation should automatically add its owner as an employee")
    assert.equal(employee.is_admin, true)
    assert.equal(account.id, customer.id)
    assert.equal(account.employee.company.id, ctx.company.id)
    console.log(`COMPANY LOGIN VERIFIED: ${ctx.company.id} / ${employee.id}`)
  })

  if (!ctx.token) return
  const { regions } = await request("GET", "/store/regions")
  const region = regions.find((r) => r.currency_code === "eur")
  assert.ok(region, "A EUR region is needed for the test")
  const { products } = await request(
    "GET",
    "/store/products?limit=5&fields=id,title,*variants"
  )
  const variant = products.find((p) => p.variants?.length)?.variants[0]
  assert.ok(variant, "An available product variant is needed for the test")
  async function makeCart() {
    const { cart } = await request(
      "POST",
      "/store/carts",
      {
        region_id: region.id,
        email,
        metadata: { company_id: ctx.company.id },
      },
      ctx.token
    )
    const { cart: withItem } = await request(
      "POST",
      `/store/carts/${cart.id}/line-items`,
      { variant_id: variant.id, quantity: 1 },
      ctx.token
    )
    assert.equal(withItem.items?.length, 1)
    return withItem
  }

  await t.test("cart", async () => {
    ctx.cart = await makeCart()
    const { cart } = await request(
      "GET",
      `/store/carts/${ctx.cart.id}`,
      undefined,
      ctx.token
    )
    assert.equal(cart.items[0].variant_id, variant.id)
    console.log(`CART VERIFIED: ${cart.id}, items=${cart.items.length}`)
  })

  await t.test("quote request", async () => {
    const { quote } = await request(
      "POST",
      "/store/quotes",
      { cart_id: ctx.cart.id },
      ctx.token
    )
    ctx.quote = quote
    assert.equal(quote.cart_id, ctx.cart.id)
    assert.ok(quote.draft_order_id)
    const { quote: fetched } = await request(
      "GET",
      `/store/quotes/${quote.id}`,
      undefined,
      ctx.token
    )
    assert.equal(fetched.id, quote.id)
    console.log(`QUOTE VERIFIED: ${quote.id}, draft=${quote.draft_order_id}`)
  })

  await t.test("quote approval (merchant sends, buyer accepts)", async () => {
    const adminEmail = `admin-e2e-${id}@example.invalid`
    const adminPassword = randomUUID() + "Aa1!"
    execFileSync(
      "corepack",
      ["pnpm", "exec", "medusa", "user", "-e", adminEmail, "-p", adminPassword],
      {
        cwd: new URL("../..", import.meta.url),
        stdio: "ignore",
        timeout: 90_000,
      }
    )
    await waitForBackend()
    const admin = await request("POST", "/auth/user/emailpass", {
      email: adminEmail,
      password: adminPassword,
    })
    assert.ok(admin.token)
    const { quote: sent } = await request(
      "POST",
      `/admin/quotes/${ctx.quote.id}/send`,
      {},
      admin.token
    )
    assert.equal(sent.status, "pending_customer")
    const { quote: accepted } = await request(
      "POST",
      `/store/quotes/${ctx.quote.id}/accept`,
      {},
      ctx.token
    )
    assert.equal(accepted.status, "accepted")
    assert.equal(accepted.id, ctx.quote.id)
    console.log(`QUOTE APPROVAL VERIFIED: ${accepted.id}, status=${accepted.status}`)
  })

  await t.test("cart approval", async () => {
    await request(
      "POST",
      `/store/companies/${ctx.company.id}/approval-settings`,
      { requires_admin_approval: true },
      ctx.token,
      201
    )
    const cart = await makeCart()
    const { approvals } = await request(
      "POST",
      `/store/carts/${cart.id}/approvals`,
      {},
      ctx.token
    )
    assert.ok(approvals.length)
    assert.equal(approvals[0].status, "pending")
    const { approval } = await request(
      "POST",
      `/store/approvals/${approvals[0].id}`,
      { status: "approved" },
      ctx.token
    )
    assert.equal(approval.status, "approved")
    console.log(`APPROVAL VERIFIED: ${approval.id}, status=${approval.status}`)
  })

  await t.test("checkout", async () => {
    const cart = await makeCart()
    const country_code = region.countries[0].iso_2
    await request(
      "POST",
      `/store/carts/${cart.id}`,
      {
        shipping_address: {
          first_name: "Test",
          last_name: "Buyer",
          address_1: "1 Test Street",
          city: "Test City",
          postal_code: "10000",
          country_code,
        },
        billing_address: {
          first_name: "Test",
          last_name: "Buyer",
          address_1: "1 Test Street",
          city: "Test City",
          postal_code: "10000",
          country_code,
        },
      },
      ctx.token
    )
    const { shipping_options } = await request(
      "GET",
      `/store/shipping-options?cart_id=${cart.id}`,
      undefined,
      ctx.token
    )
    assert.ok(shipping_options.length, "No shipping options available")
    await request(
      "POST",
      `/store/carts/${cart.id}/shipping-methods`,
      { option_id: shipping_options[0].id },
      ctx.token
    )
    const { payment_providers } = await request(
      "GET",
      `/store/payment-providers?region_id=${region.id}`,
      undefined,
      ctx.token
    )
    assert.ok(payment_providers.length, "No payment providers available")
    const { payment_collection } = await request(
      "POST",
      "/store/payment-collections",
      { cart_id: cart.id },
      ctx.token
    )
    assert.ok(payment_collection?.id)
    await request(
      "POST",
      `/store/payment-collections/${payment_collection.id}/payment-sessions`,
      { provider_id: payment_providers[0].id },
      ctx.token
    )
    const { type, order } = await request(
      "POST",
      `/store/carts/${cart.id}/complete`,
      {},
      ctx.token
    )
    assert.equal(type, "order")
    assert.ok(order.id)
    console.log(`CHECKOUT VERIFIED: cart=${cart.id}, order=${order.id}`)
  })
})