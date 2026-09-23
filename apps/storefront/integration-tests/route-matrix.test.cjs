const assert = require("node:assert/strict")
const { spawn } = require("node:child_process")
const { randomUUID } = require("node:crypto")
const { test } = require("node:test")
const WebSocket = require("next/dist/compiled/ws")

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function until(check, label, timeout = 30000) {
  const end = Date.now() + timeout
  let lastError
  while (Date.now() < end) {
    try {
      const value = await check()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await sleep(200)
  }
  throw new Error(`Timed out waiting for ${label}: ${lastError?.message || ""}`)
}

test("PORTSAID route, locale, region, and responsive matrix", { timeout: 360000 }, async () => {
  const port = 9257
  const origin = process.env.ROUTE_MATRIX_URL || "http://127.0.0.1:5000"
  const backend = process.env.BUYER_TEST_BACKEND_URL || "http://127.0.0.1:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  assert.ok(publishableKey, "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required")

  const regionsResponse = await fetch(`${backend}/store/regions`, {
    headers: { "x-publishable-api-key": publishableKey },
  })
  assert.equal(regionsResponse.status, 200, "Medusa regions endpoint must be available")
  const { regions } = await regionsResponse.json()
  const dkRegions = regions.filter((region) =>
    region.countries?.some((country) => country.iso_2 === "dk")
  )
  assert.ok(dkRegions.length > 0, "Denmark must belong to a Medusa region")
  assert.ok(
    dkRegions.some((region) => region.currency_code === "eur"),
    "The Denmark region must use EUR"
  )

  const chrome = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--ignore-certificate-errors",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/portsaid-route-matrix-${randomUUID()}`,
    "about:blank",
  ], { stdio: "ignore" })
  let socket
  const failures = []
  const runtimeErrors = []
  const consoleErrors = []

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
      if (message.id) {
        const waiter = pending.get(message.id)
        if (!waiter) return
        pending.delete(message.id)
        if (message.error) waiter.reject(new Error(message.error.message))
        else waiter.resolve(message.result)
        return
      }
      if (message.method === "Runtime.exceptionThrown") {
        runtimeErrors.push({
          url: message.params.exceptionDetails?.url,
          text: message.params.exceptionDetails?.text,
          description: message.params.exceptionDetails?.exception?.description,
        })
      }
      if (
        message.method === "Runtime.consoleAPICalled" &&
        message.params.type === "error"
      ) {
        consoleErrors.push({
          url: message.params.stackTrace?.description,
          text: message.params.args
            ?.map((argument) => argument.value ?? argument.description ?? "")
            .join(" "),
        })
      }
    })

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id
      pending.set(requestId, { resolve, reject })
      socket.send(JSON.stringify({ id: requestId, method, params }))
    })
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text || "Runtime evaluation failed")
      }
      return result.result.value
    }
    const viewport = (width) => send("Emulation.setDeviceMetricsOverride", {
      width,
      height: width < 600 ? 900 : 820,
      deviceScaleFactor: 1,
      mobile: width < 600,
    })
    const setLocaleCookie = async (locale) => {
      await send("Network.setCookie", {
        url: origin,
        name: "medusa_locale",
        value: locale,
        path: "/",
        sameSite: "Lax",
      })
    }
    const navigate = async (path, locale, width, loadPage = true) => {
      await viewport(width)
      const beforeRuntime = runtimeErrors.length
      const beforeConsole = consoleErrors.length
      if (loadPage) {
        await setLocaleCookie(locale)
        await send("Page.navigate", { url: `${origin}${path}` })
        await until(
          () => evaluate(`location.pathname === ${JSON.stringify(path.split("?")[0])} &&
            document.readyState === "complete" && !!document.querySelector(".brand-lockup img")`),
          `${locale} ${path} at ${width}px`
        )
      }
      // Wait for hydration on navigation, or for responsive layout on resize.
      await sleep(loadPage ? 350 : 100)
      const state = await evaluate(`(() => {
        const body = document.body?.innerText || ""
          const overlay = !!document.querySelector(
            "[data-nextjs-dialog], [data-nextjs-toast]"
          ) || /Runtime Error|Application error|Unhandled Runtime Error/.test(body)
        return {
          route: location.pathname,
          lang: document.documentElement.lang,
          dir: document.documentElement.dir,
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          overlay,
          hasHeader: !!document.querySelector("header"),
          hasLogo: !!document.querySelector(".brand-lockup img"),
          logo: (() => {
            const image = document.querySelector(".brand-lockup img")
            if (!image) return null
            const rect = image.getBoundingClientRect()
            return {
              src: image.currentSrc || image.src,
              naturalWidth: image.naturalWidth,
              naturalHeight: image.naturalHeight,
              width: rect.width,
              height: rect.height,
            }
          })(),
        }
      })()`)
      const newRuntime = runtimeErrors.slice(beforeRuntime)
      const newConsole = consoleErrors.slice(beforeConsole)
      assert.equal(state.route, path.split("?")[0], `${locale} ${path}: route changed`)
      assert.equal(state.lang, locale, `${locale} ${path}: language mismatch`)
      assert.equal(state.dir, locale === "ar" ? "rtl" : "ltr", `${locale} ${path}: direction mismatch`)
      assert.ok(state.hasHeader && state.hasLogo, `${locale} ${path}: header/logo missing`)
      assert.ok(state.scrollWidth <= state.width + 1, `${locale} ${path}: horizontal overflow ${JSON.stringify(state)}`)
      assert.equal(state.overlay, false, `${locale} ${path}: runtime overlay visible`)
      assert.deepEqual(newRuntime, [], `${locale} ${path}: runtime exception`)
      assert.deepEqual(newConsole, [], `${locale} ${path}: console error`)
      assert.ok(state.logo.src.includes("portsaid-logo.png"), `${locale} ${path}: transparent logo not used`)
      assert.ok(state.logo.naturalWidth > 0 && state.logo.naturalHeight > 0, `${locale} ${path}: logo not loaded`)
      assert.ok(
        Math.abs(state.logo.width / state.logo.height - state.logo.naturalWidth / state.logo.naturalHeight) < 0.03,
        `${locale} ${path}: logo proportions changed`
      )
      return state
    }

    for (const locale of ["en", "tr", "bg", "ar"]) {
      for (const path of ["/dk", "/dk/account", "/dk/categories/laptops"]) {
        for (const width of [320, 375, 768, 1024, 1280]) {
          const state = await navigate(path, locale, width, width === 320)
          if (path === "/dk" && locale === "ar") {
          const hero = await evaluate(`(() => {
            const root = document.querySelector(".brand-hero-overlay")
            const elements = [
              root?.querySelector("h1"),
              root?.querySelector("p"),
              root?.querySelector("a"),
            ]
            const bounds = root?.getBoundingClientRect()
            return {
              root: bounds && { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
              elements: elements.map((element) => {
                const rect = element?.getBoundingClientRect()
                return rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
              }),
            }
          })()`)
          for (const rect of hero.elements) {
            assert.ok(rect, `Arabic hero element missing at ${width}px`)
            assert.ok(rect.left >= hero.root.left - 1 && rect.right <= hero.root.right + 1, `Arabic hero horizontal clipping at ${width}px: ${JSON.stringify(hero)}`)
            assert.ok(rect.top >= hero.root.top - 1 && rect.bottom <= hero.root.bottom + 1, `Arabic hero vertical clipping at ${width}px: ${JSON.stringify(hero)}`)
          }
            assert.ok(state.route === "/dk")
            if (width === 375 && process.env.ROUTE_MATRIX_SCREENSHOT) {
              const { data } = await send("Page.captureScreenshot", { format: "png" })
              require("node:fs").writeFileSync(process.env.ROUTE_MATRIX_SCREENSHOT, Buffer.from(data, "base64"))
            }
          }
          if (path === "/dk/account") {
            assert.equal(await evaluate(`!!document.querySelector('[data-testid="login-page"], input[type="email"]')`), true, `${locale} account should render guest login UI`)
          }
          if (path === "/dk/categories/laptops") {
            assert.equal(await evaluate(`!!document.querySelector("main, [data-testid]")`), true, `${locale} category page should render`)
          }
        }
      }
    }

    await navigate("/dk", "en", 1280)
    await until(() => evaluate(`!!document.querySelector('[data-testid="language-switcher"]')`), "language switcher")
    await evaluate(`(() => {
      const select = document.querySelector('[data-testid="language-switcher"]')
      select.value = "tr"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })()`)
    await until(
      () => evaluate(`location.pathname === "/dk" && document.documentElement.lang === "tr" && document.querySelector('[data-testid="language-switcher"]')?.value === "tr"`),
      "language switch preserving Denmark route"
    )
    assert.equal(await evaluate("location.pathname"), "/dk")
    assert.equal(await evaluate("document.documentElement.dir"), "ltr")
    assert.equal(
      await evaluate(`document.cookie.includes("medusa_locale=tr")`),
      true,
      "language preference cookie should be set independently of region"
    )
    const dkRegion = regions.find((region) =>
      region.countries?.some((country) => country.iso_2 === "dk")
    )
    assert.equal(dkRegion.currency_code, "eur")
    // The homepage doesn't show guest prices; the category card does.
    await navigate("/dk/categories/laptops", "tr", 1280)
    assert.ok(
      await evaluate(`document.body.innerText.includes("€")`),
      "Denmark category prices should still use EUR after changing language"
    )
  } catch (error) {
    failures.push({
      message: error.message,
      runtimeErrors,
      consoleErrors,
    })
    throw error
  } finally {
    if (failures.length) {
      console.error("route-matrix failures", JSON.stringify(failures, null, 2))
    }
    socket?.close()
    chrome.kill("SIGTERM")
  }
})