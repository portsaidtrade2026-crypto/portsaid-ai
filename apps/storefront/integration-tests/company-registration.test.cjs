const assert = require("node:assert/strict")
const { spawn } = require("node:child_process")
const { randomUUID } = require("node:crypto")
const { test } = require("node:test")
const WebSocket = require("next/dist/compiled/ws")

const port = 9227
const origin = process.env.REGISTRATION_TEST_URL ||
  `https://${process.env.REPLIT_DEV_DOMAIN}:5000`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function until(fn, label, timeout = 30000) {
  const end = Date.now() + timeout
  let lastError
  while (Date.now() < end) {
    try {
      const value = await fn()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await sleep(200)
  }
  throw new Error(`Timed out waiting for ${label}: ${lastError?.message || ""}`)
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.once("error", reject)
    ws.once("open", () => {
      let id = 0
      const waiting = new Map()
      const events = []
      ws.on("message", (raw) => {
        const message = JSON.parse(raw.toString())
        if (message.id) {
          const pending = waiting.get(message.id)
          waiting.delete(message.id)
          if (message.error) pending.reject(new Error(message.error.message))
          else pending.resolve(message.result)
        } else {
          events.push(message)
        }
      })
      resolve({
        events,
        close: () => ws.close(),
        send(method, params = {}) {
          return new Promise((resolve, reject) => {
            const requestId = ++id
            waiting.set(requestId, { resolve, reject })
            ws.send(JSON.stringify({ id: requestId, method, params }))
          })
        },
      })
    })
  })
}

test("Register submits a company in Germany with EUR and opens the account", { timeout: 120000 }, async () => {
  assert.ok(process.env.REPLIT_DEV_DOMAIN || process.env.REGISTRATION_TEST_URL, "Storefront URL required")
  assert.ok(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, "Publishable key required")

  const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
    "--headless", "--no-sandbox", "--disable-dev-shm-usage",
    "--ignore-certificate-errors", `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/registration-chrome-${randomUUID()}`,
    "about:blank",
  ], { stdio: "ignore" })
  let cdp
  try {
    const target = await until(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json`)
      return (await response.json()).find((entry) => entry.type === "page")
    }, "Chromium debugger")
    cdp = await connect(target.webSocketDebuggerUrl)
    await cdp.send("Page.enable")
    await cdp.send("Runtime.enable")
    await cdp.send("Network.enable")
    const evaluate = async (expression) => {
      const result = await cdp.send("Runtime.evaluate", {
        expression, returnByValue: true, awaitPromise: true,
      })
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
      return result.result.value
    }
    const element = (selector) => `document.querySelector(${JSON.stringify(selector)})`
    const click = async (selector) => {
      await evaluate(`${element(selector)}?.scrollIntoView({block: 'center'})`)
      const coords = await until(
        () => evaluate(`(() => { const el = ${element(selector)}; if (!el) return null;
          const r = el.getBoundingClientRect(); return r.width && r.height
            ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null })()`),
        selector
      )
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: coords.x, y: coords.y, button: "left", clickCount: 1 })
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: coords.x, y: coords.y, button: "left", clickCount: 1 })
    }
    const fill = async (name, value) => {
      await evaluate(`${element(`[name="${name}"]`)}.focus()`)
      await cdp.send("Input.insertText", { text: value })
      const actual = await evaluate(`${element(`[name="${name}"]`)}.value`)
      assert.equal(actual, value, `${name}: focused=${await evaluate("document.activeElement?.getAttribute('name')")}`)
    }

    const url = `${origin}/dk/account?view=register`
    await cdp.send("Page.navigate", { url })
    await until(() => evaluate(`!!${element('[data-testid="register-page"]')}`), "registration form", 45000)
    await until(() => evaluate("location.search === ''"), "login view URL update")
    await sleep(500)
    console.log("GET /dk/account?view=register -> registration form visible")

    const suffix = randomUUID().slice(0, 12)
    const email = `register-flow-${suffix}@example.invalid`
    const companyName = `Registration Test ${suffix}`
    await fill("email", email)
    await fill("first_name", "Test")
    await fill("last_name", "Buyer")
    await fill("company_name", companyName)
    await fill("password", `${randomUUID()}Aa1!`)
    await fill("company_address", "Sample Street 1")
    await fill("company_zip", "34520")
    await click('[data-testid="company-country-input"]')
    await until(() => evaluate(`!![...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Germany')`), "Germany option")
    const countryOptions = await evaluate(`[...document.querySelectorAll('[role="option"]')].map(el => el.textContent.trim())`)
    assert.equal(countryOptions.length, 250)
    assert.equal(new Set(countryOptions).size, 250)
    assert.ok(countryOptions.includes("Türkiye"))
    assert.ok(countryOptions.includes("United States"))
    console.log("COUNTRIES -> 250 unique countries and territories, including Germany, Türkiye, United States")
    await evaluate(`[...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Türkiye').setAttribute('data-registration-option', 'turkey')`)
    await click('[data-registration-option="turkey"]')
    await until(() => evaluate(`document.querySelector('[data-testid="company-state-input"]')?.disabled === false`), "Turkish provinces")
    await click('[data-testid="company-state-input"]')
    await until(() => evaluate(`!![...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Istanbul')`), "Istanbul province")
    await evaluate(`[...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Istanbul').setAttribute('data-registration-option', 'istanbul')`)
    await click('[data-registration-option="istanbul"]')
    await until(() => evaluate(`document.querySelector('[data-testid="company-city-input"]')?.disabled === false`), "Istanbul districts")
    await click('[data-testid="company-city-input"]')
    await until(() => evaluate(`!![...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Kadıköy')`), "Kadıköy district")
    await evaluate(`[...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Kadıköy').setAttribute('data-registration-option', 'kadikoy')`)
    await click('[data-registration-option="kadikoy"]')
    assert.equal(await evaluate(`document.querySelector('[name="company_city"]').value`), "Kadıköy")
    await click('[data-testid="company-country-input"]')
    await until(() => evaluate(`!![...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Germany')`), "Germany option after Türkiye")
    await evaluate(`[...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Germany').setAttribute('data-registration-option', 'country')`)
    await click('[data-registration-option="country"]')
    assert.equal(await evaluate(`document.querySelector('[name="company_state"]').value`), "")
    assert.equal(await evaluate(`document.querySelector('[data-testid="company-city-input"]').disabled`), true)
    await until(
      () => evaluate(`[...document.querySelectorAll('#company-state-trigger ~ * [role="option"]')].length || document.querySelector('[data-testid="company-state-input"]')?.disabled === false`),
      "provinces for Germany"
    )
    await click('[data-testid="company-state-input"]')
    await until(() => evaluate(`!![...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Berlin')`), "Berlin province")
    await evaluate(`[...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Berlin').setAttribute('data-registration-option', 'province')`)
    await click('[data-registration-option="province"]')
    assert.equal(await evaluate(`document.querySelector('[name="company_state"]').value`), "Berlin")
    await until(() => evaluate(`document.querySelector('[data-testid="company-city-input"]')?.disabled === false`), "Berlin districts")
    await click('[data-testid="company-city-input"]')
    await until(() => evaluate(`!![...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Berlin')`), "Berlin district")
    await evaluate(`[...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Berlin').setAttribute('data-registration-option', 'district')`)
    await click('[data-registration-option="district"]')
    assert.equal(await evaluate(`document.querySelector('[name="company_city"]').value`), "Berlin")
    await click('[data-testid="company-area-manual-toggle"]')
    await fill("company_city", "Kavaklı")
    assert.equal(await evaluate(`document.querySelector('[name="company_city"]').value`), "Kavaklı")
    await click('[data-testid="company-area-manual-toggle"]')
    assert.equal(await evaluate(`document.querySelector('[name="company_city"]').value`), "")
    await click('[data-testid="company-city-input"]')
    await until(() => evaluate(`!![...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Berlin')`), "Berlin district after manual entry")
    await evaluate(`[...document.querySelectorAll('[role="option"]')].find(el => el.textContent.trim() === 'Berlin').setAttribute('data-registration-option', 'district-again')`)
    await click('[data-registration-option="district-again"]')
    console.log("LOCATION -> Türkiye → Istanbul → Kadıköy, changing country resets selections; Germany → Berlin → Berlin; manual entry available")

    for (const currency of ["TRY", "USD", "EUR"]) {
      await click('[data-testid="company-currency-trigger"]')
      await until(() => evaluate(`!![...document.querySelectorAll('[role="option"]')].find(el => el.textContent.includes('${currency}'))`), `${currency} option`)
      const currencyOptions = await evaluate(`[...document.querySelectorAll('[role="option"]')].map(el => el.textContent.trim())`)
      assert.deepEqual(currencyOptions, ["TRY (₺)", "USD ($)", "EUR (€)"])
      await evaluate(`[...document.querySelectorAll('[role="option"]')].find(el => el.textContent.includes('${currency}')).setAttribute('data-registration-option', 'currency')`)
      await click('[data-registration-option="currency"]')
      assert.ok(await evaluate(`document.querySelector('[data-testid="company-currency-trigger"]').textContent.includes('${currency}')`))
    }
    console.log("CURRENCIES -> TRY (₺), USD ($), EUR (€) all selectable")
    await click('[data-testid="terms-checkbox"]')
    assert.equal(await evaluate(`${element('[data-testid="register-button"]')}.disabled`), false)
    console.log("FORM last_name=Buyer company=Registration Test country=Germany province=Berlin district=Berlin zip=34520 currency=EUR -> valid")

    const before = cdp.events.length
    await click('[data-testid="register-button"]')
    await until(
      () => evaluate(`!!${element('[data-testid="account-page"]')} && location.pathname === '/dk/account'`),
      "account dashboard after Register",
      60000
    )
    assert.ok(await evaluate(`document.body.textContent.includes('Hello Test')`), "greeting should interpolate the new customer's name")
    const errors = cdp.events.slice(before).filter((event) =>
      event.method === "Runtime.exceptionThrown" ||
      (event.method === "Network.responseReceived" && event.params.response.status >= 500)
    )
    assert.deepEqual(errors.map((event) => event.params.exceptionDetails?.text || `${event.params.response.status} ${event.params.response.url}`), [])
    console.log("POST /dk/account -> account dashboard visible; no browser exception or HTTP 5xx")

    const cookies = await cdp.send("Network.getCookies", { urls: [origin] })
    const token = cookies.cookies.find((cookie) => cookie.name === "_medusa_jwt")?.value
    assert.ok(token, "registration must authenticate the new customer")
    const backend = process.env.BUYER_TEST_BACKEND_URL || "http://127.0.0.1:9000"
    const headers = {
      authorization: `Bearer ${token}`,
      "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    }
    const customerResponse = await fetch(`${backend}/store/customers/me?fields=*employee,*employee.company`, { headers })
    assert.equal(customerResponse.status, 200)
    const { customer } = await customerResponse.json()
    assert.equal(customer.email, email)
    assert.equal(customer.employee.is_admin, true)
    const companyResponse = await fetch(`${backend}/store/companies/${customer.employee.company.id}`, { headers })
    assert.equal(companyResponse.status, 200)
    const { company } = await companyResponse.json()
    assert.equal(company.name, companyName)
    assert.equal(company.city, "Berlin")
    assert.equal(company.state, "Berlin")
    assert.equal(company.zip, "34520")
    assert.equal(company.country, "Germany")
    assert.equal(company.currency_code, "eur")
    console.log("GET registered company -> 200; admin=true, Germany, Berlin, 34520, eur verified")
  } finally {
    cdp?.close()
    browser.kill()
  }
})