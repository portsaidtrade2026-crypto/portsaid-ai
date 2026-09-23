const assert = require("node:assert/strict")
const { spawn } = require("node:child_process")
const { randomUUID } = require("node:crypto")
const { test } = require("node:test")
const WebSocket = require("next/dist/compiled/ws")

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function until(check, label, timeout = 45000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    try {
      const result = await check()
      if (result) return result
    } catch {}
    await sleep(200)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

test("Portsaid theme persists and navigation fits phone and desktop", { timeout: 150000 }, async () => {
  const port = 9246
  const chrome = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
    "--headless", "--no-sandbox", "--disable-dev-shm-usage",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/portsaid-responsive-${randomUUID()}`,
    "about:blank",
  ], { stdio: "ignore" })
  let socket
  try {
    const target = await until(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json`)
      return (await response.json()).find((page) => page.type === "page")
    }, "Chromium debugger")
    socket = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.once("open", resolve)
      socket.once("error", reject)
    })

    let id = 0
    const pending = new Map()
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString())
      if (!message.id) return
      const waiter = pending.get(message.id)
      if (!waiter) return
      pending.delete(message.id)
      if (message.error) waiter.reject(new Error(message.error.message))
      else waiter.resolve(message.result)
    })
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const next = ++id
      pending.set(next, { resolve, reject })
      socket.send(JSON.stringify({ id: next, method, params }))
    })
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", {
        expression, returnByValue: true, awaitPromise: true,
      })
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    const viewport = (width, height) => send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: width < 600,
    })
    await send("Page.enable")
    await send("Runtime.enable")
    await viewport(390, 844)
    await send("Page.navigate", { url: "http://127.0.0.1:5000/dk" })
    await until(() => evaluate(`document.readyState === "complete"
      && !!document.querySelector(".theme-toggle")
      && document.querySelector(".brand-lockup img")?.complete`), "phone storefront")
    await until(() => evaluate(`Object.keys(document.querySelector(".theme-toggle"))
      .some(key => key.startsWith("__reactProps$"))`), "theme button hydration")

    const phone = await evaluate(`({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      logo: document.querySelector(".brand-lockup img").naturalWidth,
      language: !!document.querySelector('[data-testid="language-switcher"]'),
      theme: !!document.querySelector(".theme-toggle")
    })`)
    assert.ok(phone.scrollWidth <= phone.width + 1, `Phone horizontal overflow: ${JSON.stringify(phone)}`)
    assert.ok(phone.logo > 0 && phone.language && phone.theme, "phone branding and controls visible")

    await evaluate('document.querySelector(".theme-toggle").click()')
    await until(() => evaluate('document.documentElement.classList.contains("dark")'), "dark mode")
    assert.equal(await evaluate('localStorage.getItem("portsaid_theme")'), "dark")
    await send("Page.reload", { ignoreCache: true })
    await until(() => evaluate(`document.readyState === "complete"
      && document.documentElement.classList.contains("dark")
      && !!document.querySelector(".theme-toggle")`), "persisted dark mode")
    await viewport(1280, 720)
    await until(() => evaluate('document.readyState === "complete" && !!document.body'), "desktop storefront")
    const desktop = await evaluate(`({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      background: getComputedStyle(document.body).backgroundColor
    })`)
    assert.ok(desktop.scrollWidth <= desktop.width + 1, `Desktop horizontal overflow: ${JSON.stringify(desktop)}`)
    assert.notEqual(desktop.background, "rgb(255, 255, 255)", "dark background applied")
  } finally {
    socket?.close()
    chrome.kill("SIGTERM")
  }
})