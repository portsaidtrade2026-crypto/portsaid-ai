import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"

const baseUrl = process.env.BUYER_TEST_BACKEND_URL || "http://127.0.0.1:9000"
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

async function request(method, path, token, body, expected = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": publishableKey,
      ...(token && { authorization: `Bearer ${token}` }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  console.log(`${method} ${path} -> ${response.status}`)
  const allowed = Array.isArray(expected) ? expected : [expected]
  assert.ok(allowed.includes(response.status), `${method} ${path}: ${response.status} ${text.slice(0, 300)}`)
  return data
}

async function createCompanyAdmin(label) {
  const email = `${label}-${randomUUID().slice(0, 12)}@example.invalid`
  const password = randomUUID() + "Aa1!"
  const registration = await request("POST", "/auth/customer/emailpass/register", null, { email, password })
  const { customer } = await request("POST", "/store/customers", registration.token, {
    email,
    first_name: "Isolation",
    last_name: "Test",
  })
  const { token } = await request("POST", "/auth/customer/emailpass", null, { email, password })
  const { companies } = await request("POST", "/store/companies", token, {
    name: `Company ${label}`,
    email,
    currency_code: "eur",
  })
  const company = companies[0]
  const { employee } = await request(
    "POST",
    `/store/companies/${company.id}/employees`,
    token,
    { customer_id: customer.id, is_admin: true }
  )
  assert.ok(employee.id)
  return { token, company, employee }
}

test("company settings isolate two valid company admins", async (t) => {
  assert.ok(publishableKey, "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required")
  const a = await createCompanyAdmin("a")
  const b = await createCompanyAdmin("b")

  await t.test("own company settings read succeeds", async () => {
    const { company } = await request("GET", `/store/companies/${a.company.id}`, a.token)
    assert.equal(company.id, a.company.id)
    console.log("PASS own company settings read")
  })

  await t.test("other company settings read is denied", async () => {
    await request("GET", `/store/companies/${b.company.id}`, a.token, undefined, [403, 404])
    console.log("PASS other company settings read denied")
  })

  await t.test("own company settings update succeeds", async () => {
    const { company } = await request("POST", `/store/companies/${a.company.id}`, a.token, {
      name: "Updated own company",
    })
    assert.equal(company.name, "Updated own company")
    console.log("PASS own company settings update")
  })

  await t.test("other company settings update is denied and unchanged", async () => {
    await request("POST", `/store/companies/${b.company.id}`, a.token, {
      name: "Unauthorized change",
    }, [403, 404])
    const { company } = await request("GET", `/store/companies/${b.company.id}`, b.token)
    assert.equal(company.name, b.company.name)
    console.log("PASS other company settings update denied; data unchanged")
  })

  await t.test("own approval settings update succeeds", async () => {
    await request("POST", `/store/companies/${a.company.id}/approval-settings`, a.token, {
      requires_admin_approval: true,
    }, 201)
    const { company } = await request("GET", `/store/companies/${a.company.id}`, a.token)
    assert.equal(company.approval_settings.requires_admin_approval, true)
    console.log("PASS own approval settings update")
  })

  await t.test("other company approval settings update is denied and unchanged", async () => {
    await request("POST", `/store/companies/${b.company.id}/approval-settings`, a.token, {
      requires_admin_approval: true,
    }, [403, 404])
    const { company } = await request("GET", `/store/companies/${b.company.id}`, b.token)
    assert.notEqual(company.approval_settings.requires_admin_approval, true)
    console.log("PASS other approval settings update denied; data unchanged")
  })

  await t.test("other company employee list, create and company delete are denied", async () => {
    await request("GET", `/store/companies/${b.company.id}/employees`, a.token, undefined, [403, 404])
    await request("POST", `/store/companies/${b.company.id}/employees`, a.token, {
      customer_id: a.employee.customer_id ?? "not-a-customer",
      is_admin: false,
    }, [403, 404])
    await request("DELETE", `/store/companies/${b.company.id}`, a.token, undefined, [403, 404])
    console.log("PASS other company employee list/create and delete denied")
  })

  await t.test("nested employee routes cannot cross company IDs", async () => {
    const own = `/store/companies/${a.company.id}/employees/${a.employee.id}`
    const other = `/store/companies/${b.company.id}/employees/${b.employee.id}`
    const mismatched = `/store/companies/${a.company.id}/employees/${b.employee.id}`
    const { employee } = await request("GET", own, a.token)
    assert.equal(employee.id, a.employee.id)
    await request("GET", other, a.token, undefined, [403, 404])
    await request("GET", mismatched, a.token, undefined, [403, 404])
    await request("POST", mismatched, a.token, { spending_limit: 5 }, [403, 404])
    await request("DELETE", mismatched, a.token, undefined, [403, 404])
    console.log("PASS own employee read; other and mismatched nested employee routes denied")
  })

  await t.test("company admin token cannot access platform admin company routes", async () => {
    await request("GET", `/admin/companies/${b.company.id}`, a.token, undefined, [401, 403])
    await request("POST", `/admin/companies/${b.company.id}`, a.token, {
      name: "Unauthorized admin update",
    }, [401, 403])
    console.log("PASS platform admin company read/update denied to customer admin")
  })

  await t.test("approval actions are scoped to the cart's company", async () => {
    await request("POST", `/store/companies/${b.company.id}/approval-settings`, b.token, {
      requires_admin_approval: true,
    }, 201)
    const { regions } = await request("GET", "/store/regions")
    const region = regions.find((entry) => entry.currency_code === "eur")
    assert.ok(region)
    const { products } = await request("GET", "/store/products?limit=5&fields=id,*variants")
    const variant = products.find((entry) => entry.variants?.length)?.variants[0]
    assert.ok(variant)
    const { cart } = await request("POST", "/store/carts", b.token, {
      region_id: region.id,
      metadata: { company_id: b.company.id },
    })
    await request("POST", `/store/carts/${cart.id}/line-items`, b.token, {
      variant_id: variant.id,
      quantity: 1,
    })
    await request("POST", `/store/carts/${cart.id}/approvals`, a.token, {}, [403, 404])
    const { approvals } = await request("POST", `/store/carts/${cart.id}/approvals`, b.token, {})
    assert.ok(approvals[0]?.id)
    await request("POST", `/store/approvals/${approvals[0].id}`, a.token, {
      status: "approved",
    }, [403, 404])
    const { approval } = await request("POST", `/store/approvals/${approvals[0].id}`, b.token, {
      status: "approved",
    })
    assert.equal(approval.status, "approved")
    console.log("PASS cross-company approval create/update denied; own approval succeeds")
  })
})