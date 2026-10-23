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
  const dkRegion = dkRegions.find((region) => region.currency_code === "eur")
  const productsResponse = await fetch(
    `${backend}/store/products?limit=1&region_id=${encodeURIComponent(dkRegion.id)}&fields=handle`,
    { headers: { "x-publishable-api-key": publishableKey } }
  )
  assert.equal(productsResponse.status, 200, "A real product must be available")
  const { products: seedProducts } = await productsResponse.json()
  const productHandle = seedProducts?.[0]?.handle
  assert.ok(productHandle, "The product API must provide a real product handle")
  const productPath = `/dk/products/${productHandle}`

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
    await send("Page.enable")
    await send("Runtime.enable")
    await send("Network.enable")
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

    const assertCatalogueUi = async (locale, path) => {
      const leakage = await evaluate(`(() => {
        const selectors = [
          "button", "label", "option", "[role=button]", "[aria-label]",
          "nav a", "nav span", "select", "input[placeholder]",
          "[data-testid*=breadcrumb]", "[data-testid*=pagination]",
          ".text-neutral-500", ".text-neutral-600", "table th"
        ]
        return [...document.querySelectorAll(selectors.join(","))]
          .filter((element) => {
            // Product titles and real business data are deliberately excluded.
            if (element.closest('[data-testid="product-wrapper"],[data-testid="product-title"],[data-testid="product-description"]')) return false
            const rect = element.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          })
          .map((element) => (element.getAttribute("aria-label") || element.textContent || element.getAttribute("placeholder") || "").trim())
          .filter(Boolean)
      })()`)
      const interfacePhrases = {
        en: ["All products", "Search in products", "Latest Arrivals", "Storage", "Color", "Memory", "Availability on request", "Products", "Categories", "Quantity", "Price", "SKU", "Log in"],
        tr: ["Tüm ürünler", "Ürünlerde ara", "Son Eklenenler", "Depolama", "Renk", "Bellek", "Talep üzerine temin edilir", "Ürünler", "Kategoriler", "Adet", "Fiyat", "Stok kodu", "Giriş yap"],
        bg: ["Всички продукти", "Търсене в продуктите", "Най-нови", "Съхранение", "Цвят", "Памет", "Наличност при запитване", "Продукти", "Категории", "Количество", "Цена", "Артикулен номер", "Вход"],
        ar: ["جميع المنتجات", "البحث في المنتجات", "أحدث المنتجات", "التخزين", "اللون", "الذاكرة", "التوفر عند الطلب", "المنتجات", "الفئات", "الكمية", "السعر", "رمز المنتج", "تسجيل الدخول"],
      }
      for (const [otherLocale, phrases] of Object.entries(interfacePhrases)) {
        if (otherLocale === locale) continue
        for (const phrase of phrases) {
          assert.equal(
            leakage.some((text) => text === phrase || text.startsWith(`${phrase} `) || text.includes(` ${phrase} `)),
            false,
            `${locale} ${path}: ${otherLocale} interface text remains: ${phrase}; visible UI=${JSON.stringify(leakage)}`
          )
        }
      }
    }

    const switchLocale = async (locale, path, width) => {
      const navigationStart = await evaluate("performance.timeOrigin")
      await until(() => evaluate(`!!document.querySelector('[data-testid="language-switcher"]')`), "language switcher")
      await until(() => evaluate(`(() => {
        const select = document.querySelector('[data-testid="language-switcher"]')
        return !!select && Object.keys(select).some((key) => key.startsWith('__reactProps$'))
      })()`), "language switcher hydration")
      await evaluate(`(() => {
        const select = document.querySelector('[data-testid="language-switcher"]')
        select.value = ${JSON.stringify(locale)}
        select.dispatchEvent(new Event("change", { bubbles: true }))
      })()`)
      await until(
        () => evaluate(`location.pathname === ${JSON.stringify(path)} &&
          document.documentElement.lang === ${JSON.stringify(locale)} &&
          document.querySelector('[data-testid="language-switcher"]')?.value === ${JSON.stringify(locale)}`),
        `${locale} immediate switch on ${path}`
      )
      assert.equal(await evaluate("performance.timeOrigin"), navigationStart, `${path}: language switch must not reload the document`)
      assert.equal(await evaluate("document.cookie.includes('medusa_locale=')"), true)
      const expectedNav = { en: "Products", tr: "Ürünler", bg: "Продукти", ar: "المنتجات" }
      await until(
        () => evaluate(`document.body.innerText.includes(${JSON.stringify(expectedNav[locale])})`),
        `${locale} rendered interface on ${path}`
      )
      await until(async () => {
        await assertCatalogueUi(locale, path)
        return true
      }, `${locale} fully refreshed interface on ${path}`)
      // A real reload tests persistence without rewriting the preference cookie.
      await send("Page.reload")
      await until(
        () => evaluate(`performance.timeOrigin !== ${navigationStart} &&
          document.readyState === "complete" &&
          location.pathname === ${JSON.stringify(path)} &&
          document.documentElement.lang === ${JSON.stringify(locale)} &&
          !!document.querySelector(".brand-lockup img")`),
        `${locale} persisted after reload on ${path}`
      )
      await sleep(350)
      await assertCatalogueUi(locale, path)
      assert.equal(await evaluate("location.pathname"), path)
      assert.equal(await evaluate("document.documentElement.lang"), locale)
    }

    for (const locale of ["en", "tr", "bg", "ar"]) {
      for (const path of ["/dk", "/dk/store", "/dk/account", "/dk/categories/laptops", productPath]) {
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
          if (path === "/dk/store" || path === "/dk/categories/laptops" || path === productPath) {
            await assertCatalogueUi(locale, path)
            if (path !== productPath) {
              const availability = {
                en: "Availability on request",
                tr: "Talep üzerine temin edilir",
                bg: "Наличност при запитване",
                ar: "التوفر عند الطلب",
              }
              assert.ok(
                await evaluate(`document.querySelector('[data-testid="product-wrapper"]')?.textContent.includes(${JSON.stringify(availability[locale])})`),
                `${locale} ${path}: demo stock must be unknown, not zero`
              )
            }
            if (path === productPath) {
              const headings = await evaluate(`[...document.querySelectorAll("table th")].map((el) => el.textContent.trim())`)
              const expected = {
                en: ["SKU", "Price", "Quantity"],
                tr: ["Stok kodu", "Fiyat", "Adet"],
                bg: ["Артикулен номер", "Цена", "Количество"],
                ar: ["رمز المنتج", "السعر", "الكمية"],
              }
              for (const heading of expected[locale]) {
                assert.ok(headings.includes(heading), `${locale} product table missing translated ${heading}: ${JSON.stringify(headings)}`)
              }
            }
            assert.ok(
              await evaluate(`document.body.innerText.includes("€")`),
              `${locale} ${path}: Denmark prices must remain EUR`
            )
          }
        }
      }
    }

    for (const path of ["/dk/store", "/dk/categories/laptops", productPath, "/dk/account"]) {
      await navigate(path, "en", 1280)
      for (const locale of ["tr", "bg", "ar", "en"]) {
        await switchLocale(locale, path, 1280)
      }
    }
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