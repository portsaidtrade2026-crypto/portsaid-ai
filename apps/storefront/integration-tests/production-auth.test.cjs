const assert = require("node:assert/strict")
const { spawn } = require("node:child_process")
const { randomUUID } = require("node:crypto")
const { once } = require("node:events")
const { createServer } = require("node:net")
const { test } = require("node:test")
const WebSocket = require("next/dist/compiled/ws")

const storefront = process.env.AUTH_TEST_STOREFRONT_URL || "http://localhost:5100"
const backend = process.env.AUTH_TEST_BACKEND_URL || "http://127.0.0.1:9100"
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const revocationMode = process.env.REVOCATION_TEST_MODE || "enabled"

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function freePort() {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function until(check, label, timeout = 30000) {
  const deadline = Date.now() + timeout
  let lastError
  while (Date.now() < deadline) {
    try {
      const result = await check()
      if (result) return result
    } catch (error) {
      lastError = error
    }
    await sleep(200)
  }
  throw new Error(`Timed out waiting for ${label}: ${lastError?.message || ""}`)
}

async function connect(url) {
  const ws = new WebSocket(url)
  await new Promise((resolve, reject) => {
    ws.once("open", resolve)
    ws.once("error", reject)
  })
  let id = 0
  const pending = new Map()
  ws.on("message", (raw) => {
    const response = JSON.parse(raw.toString())
    const request = pending.get(response.id)
    if (!request) return
    pending.delete(response.id)
    if (response.error) request.reject(new Error(response.error.message))
    else request.resolve(response.result)
  })
  return {
    close: () => ws.close(),
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id
        pending.set(requestId, { resolve, reject })
        ws.send(JSON.stringify({ id: requestId, method, params }))
      })
    },
  }
}

async function createDevelopmentCustomer(email, password) {
  const headers = {
    "content-type": "application/json",
    "x-publishable-api-key": publishableKey,
  }
  const registration = await fetch(`${backend}/auth/customer/emailpass/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  })
  assert.equal(registration.status, 200, "development-only test registration")
  const { token } = await registration.json()
  assert.ok(token)
  const customer = await fetch(`${backend}/store/customers`, {
    method: "POST",
    headers: { ...headers, authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, first_name: "Auth", last_name: "Test" }),
  })
  assert.equal(customer.status, 200, "development-only test customer")
}

test("production-mode login, JWT validation, logout, and session cookie", { timeout: 120000 }, async () => {
  assert.equal(process.env.REVOCATION_TEST_DATABASE_DISPOSABLE, "1",
    "production-mode auth test requires a disposable local database")
  for (const address of [storefront, backend]) {
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(new URL(address).hostname),
      "auth test targets must be loopback")
  }
  assert.ok(["disabled", "enabled"].includes(revocationMode), "invalid revocation test mode")
  assert.ok(publishableKey, "publishable key is required")
  const email = `production-auth-${randomUUID()}@example.invalid`
  const password = `${randomUUID()}Aa1!`
  await createDevelopmentCustomer(email, password)

  const debugPort = await freePort()
  const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
    "--headless", "--no-sandbox", "--disable-dev-shm-usage",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=/tmp/production-auth-chrome-${randomUUID()}`,
    "about:blank",
  ], { stdio: "ignore" })
  let cdp
  try {
    const target = await until(async () => {
       const response = await fetch(`http://127.0.0.1:${debugPort}/json`)
      return (await response.json()).find((entry) => entry.type === "page")
    }, "test browser")
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
    const visible = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find(el => {
      const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0
    })`
    const click = async (selector) => {
      await evaluate(`${visible(selector)}?.scrollIntoView({ block: 'center' })`)
      const point = await until(() => evaluate(`(() => {
        const el = ${visible(selector)}; if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })()`), `visible ${selector}`)
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1,
      })
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1,
      })
    }
    const fill = async (selector, value) => {
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
      await cdp.send("Input.insertText", { text: value })
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`), value)
    }

    await cdp.send("Page.navigate", { url: `${storefront}/dk/account` })
    await until(() => evaluate("!!document.querySelector('[data-testid=login-page]')"), "login screen", 45000)
    await sleep(1000)
    await fill('[name=email]', email)
    await fill('[name=password]', password)
    await click('[data-testid=sign-in-button]')
    try {
      await until(() => evaluate("!!document.querySelector('[data-testid=overview-page-wrapper]')"), "authenticated account", 45000)
    } catch (error) {
      const state = await evaluate(`({
        path: location.pathname, guest: !!document.querySelector('[data-testid=login-page]'),
        buttonDisabled: document.querySelector('[data-testid=sign-in-button]')?.disabled,
        formError: document.querySelector('[data-testid=login-error-message]')?.textContent?.slice(0, 180)
      })`)
      console.log("Login screen state:", state)
      throw error
    }

    const cookies = await cdp.send("Network.getCookies", { urls: [storefront] })
    const jwtCookie = cookies.cookies.find((cookie) => cookie.name === "_medusa_jwt")
    assert.ok(jwtCookie?.value, "login sets an authentication cookie")
    assert.equal(jwtCookie.httpOnly, true)
    assert.equal(jwtCookie.secure, true)
    assert.equal(jwtCookie.sameSite, "Strict")
    assert.ok(jwtCookie.expires > Date.now() / 1000 + 60 * 60 * 24 * 6)
    assert.equal(await evaluate("document.cookie.includes('_medusa_jwt')"), false)
    await cdp.send("Page.navigate", { url: `${storefront}/dk/account` })
    await until(() => evaluate("!!document.querySelector('[data-testid=overview-page-wrapper]')"), "authenticated account after navigation", 45000)
    console.log("PASS storefront login and persistent HttpOnly, Secure, SameSite=Strict, seven-day cookie")

    const verify = (token) => fetch(`${backend}/store/customers/me`, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-publishable-api-key": publishableKey,
      },
    })
    const valid = await verify(jwtCookie.value)
    assert.equal(valid.status, 200, "valid JWT authorizes the customer")
    const body = await valid.json()
    assert.equal(body.customer.email, email)
    const segments = jwtCookie.value.split(".")
    assert.equal(segments.length, 3, "token has the expected JWT format")
    const changedSignature = `${segments[2][0] === "A" ? "B" : "A"}${segments[2].slice(1)}`
    const invalid = await verify(`${segments[0]}.${segments[1]}.${changedSignature}`)
    assert.equal(invalid.status, 401, "modified signature is rejected")
    const malformed = await verify("not-a-valid-jwt")
    assert.equal(malformed.status, 401, "malformed JWT is rejected")
    console.log("PASS valid JWT accepted; altered-signature and malformed JWTs rejected")

    await click('[data-testid=logout-button]')
    await until(async () => {
      const response = await cdp.send("Network.getCookies", { urls: [storefront] })
      return !response.cookies.some((cookie) => cookie.name === "_medusa_jwt")
    }, "authentication cookie removal", 45000)
    await until(() => evaluate("!!document.querySelector('[data-testid=login-page]')"), "guest login screen", 45000)
    console.log("PASS logout removes the authentication cookie and returns to guest login")
    const oldToken = await verify(jwtCookie.value)
    assert.equal(oldToken.status, revocationMode === "enabled" ? 401 : 200,
      revocationMode === "enabled" ? "logout must revoke the old JWT" : "schema-first logout does not claim server revocation")
    console.log(revocationMode === "enabled"
      ? "PASS previously issued JWT returns 401 after logout"
      : "PASS schema-first logout keeps legacy bearer behavior")
  } finally {
    cdp?.close()
    browser.kill()
    if (browser.exitCode === null) {
      await Promise.race([once(browser, "exit"), sleep(5000)]).catch(() => {})
    }
  }
})