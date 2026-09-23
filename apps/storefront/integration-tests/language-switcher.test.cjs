const assert = require("node:assert/strict")
const { spawn } = require("node:child_process")
const { randomUUID } = require("node:crypto")
const http = require("node:http")
const { test } = require("node:test")
const WebSocket = require("next/dist/compiled/ws")

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function until(fn, label, timeout = 30000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    try {
      const value = await fn()
      if (value) return value
    } catch {}
    await sleep(200)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

test("language selection persists inside a cross-site Replit-style preview iframe", { timeout: 120000 }, async () => {
  const domain = process.env.REPLIT_DEV_DOMAIN
  assert.ok(domain, "A running Replit storefront preview is required")

  const parent = http.createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html")
    response.end(`<iframe src="https://${domain}:5000/dk" style="width:100%;height:800px"></iframe>`)
  })
  await new Promise((resolve) => parent.listen(0, "127.0.0.1", resolve))
  const parentPort = parent.address().port
  const chromePort = 9243
  const chrome = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
    "--headless", "--no-sandbox", "--disable-dev-shm-usage",
    "--disable-site-isolation-trials", "--test-third-party-cookie-phaseout",
    "--ignore-certificate-errors", `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=/tmp/locale-switcher-chrome-${randomUUID()}`,
    "about:blank",
  ], { stdio: "ignore" })
  let ws

  try {
    const target = await until(async () => {
      const response = await fetch(`http://127.0.0.1:${chromePort}/json`)
      return (await response.json()).find((page) => page.type === "page")
    }, "Chromium debugger")
    ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.once("open", resolve)
      ws.once("error", reject)
    })

    let nextId = 0
    const waiting = new Map()
    const contexts = new Map()
    ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString())
      if (message.id) {
        const pending = waiting.get(message.id)
        waiting.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
      } else if (message.method === "Runtime.executionContextCreated") {
        contexts.set(message.params.context.id, message.params.context.origin)
      } else if (message.method === "Runtime.executionContextDestroyed") {
        contexts.delete(message.params.executionContextId)
      }
    })
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId
      waiting.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
    const evaluate = async (expression) => {
      const iframeContexts = [...contexts].filter(([, origin]) => origin.includes(domain))
      for (const [contextId] of iframeContexts.reverse()) {
        try {
          const result = await send("Runtime.evaluate", {
            contextId, expression, returnByValue: true, awaitPromise: true,
          })
          if (!result.exceptionDetails) return result.result.value
        } catch {}
      }
      return null
    }

    await send("Page.enable")
    await send("Runtime.enable")
    await send("Page.navigate", { url: `http://127.0.0.1:${parentPort}/` })
    await until(
      () => evaluate("document.readyState === 'complete' && !!document.querySelector('[data-testid=\"language-switcher\"]')"),
      "storefront in preview iframe",
      60000
    )

    for (const [locale, nav, direction] of [
      ["tr", "Ürünler", "ltr"],
      ["bg", "Продукти", "ltr"],
      ["ar", "المنتجات", "rtl"],
      ["en", "Products", "ltr"],
    ]) {
      // Server-rendered selects appear before React attaches the change
      // handler. Wait for hydration after every reload, even on a slow build.
      await until(
        () => evaluate(`(() => {
          const select = document.querySelector('[data-testid="language-switcher"]')
          return !!select && Object.keys(select).some((key) => key.startsWith('__reactProps$'))
        })()`),
        `${locale} selector hydration`,
        30000
      )
      await evaluate(`(() => {
        const select = document.querySelector('[data-testid="language-switcher"]')
        select.value = ${JSON.stringify(locale)}
        select.dispatchEvent(new Event('change', { bubbles: true }))
      })()`)
      try {
        await until(
          () => evaluate(`document.documentElement.lang === ${JSON.stringify(locale)}
          && document.querySelector('[data-testid="language-switcher"]')?.value === ${JSON.stringify(locale)}
          && document.body.textContent.includes(${JSON.stringify(nav)})`),
          `${locale} storefront after changing the selector`,
          25000
        )
      } catch (error) {
        console.log("iframe state", await evaluate("({lang: document.documentElement.lang, select: document.querySelector('[data-testid=language-switcher]')?.value, cookie: document.cookie, url: location.href})"))
        throw error
      }
      assert.equal(await evaluate("document.documentElement.dir"), direction)
      assert.equal(
        await evaluate("document.cookie.includes('medusa_locale_preview=')"),
        true,
        "the iframe must persist its partitioned language preference"
      )
    }

    await until(
      () => evaluate(`(() => {
        const button = document.querySelector('[data-testid="theme-toggle"]')
        return !!button && Object.keys(button).some((key) => key.startsWith('__reactProps$'))
      })()`),
      "theme toggle hydration"
    )
    await evaluate("document.querySelector('[data-testid=theme-toggle]').click()")
    await until(
      () => evaluate("document.documentElement.dataset.mode === 'dark' && document.documentElement.classList.contains('dark')"),
      "dark theme"
    )
    assert.equal(await evaluate("document.cookie.includes('portsaid_theme_preview=dark')"), true)
    assert.equal(await evaluate("localStorage.getItem('portsaid_theme')"), "dark")

    // A full navigation to the unchanged registration URL exercises the
    // server-rendered theme, not only a client-side class change.
    await evaluate("location.assign('/dk/account?view=register')")
    await until(
      () => evaluate("location.pathname === '/dk/account' && document.readyState === 'complete' && !!document.querySelector('[data-testid=register-page]')"),
      "registration page"
    )
    assert.equal(await evaluate("document.documentElement.dataset.mode"), "dark")
    assert.equal(await evaluate("document.documentElement.classList.contains('dark')"), true)
    await until(
      () => evaluate("Object.keys(document.querySelector('[data-testid=theme-toggle]')).some((key) => key.startsWith('__reactProps$'))"),
      "registration theme toggle hydration"
    )
    await evaluate("document.querySelector('[data-testid=theme-toggle]').click()")
    assert.equal(await evaluate("document.documentElement.dataset.mode"), "light")
    await evaluate("location.assign('/dk/store')")
    await until(
      () => evaluate("document.readyState === 'complete' && location.pathname === '/dk/store'"),
      "light theme on the product catalog"
    )
    assert.equal(await evaluate("document.documentElement.dataset.mode"), "light")
    await send("Emulation.setDeviceMetricsOverride", {
      width: 320, height: 720, deviceScaleFactor: 1, mobile: true,
    })
    await until(
      () => evaluate("window.innerWidth === 320"),
      "320px mobile viewport"
    )
    assert.equal(
      await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
      true,
      "mobile navigation must not cause horizontal scrolling at 320px"
    )
  } finally {
    ws?.close()
    chrome.kill("SIGTERM")
    await new Promise((resolve) => parent.close(resolve))
  }
})