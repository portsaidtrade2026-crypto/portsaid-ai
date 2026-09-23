const assert = require("node:assert/strict")
const { test } = require("node:test")

const origin = process.env.LOCALE_TEST_URL || "http://127.0.0.1:5000"
const productPath =
  "/dk/products/1080p-hd-pro-webcam-superior-video-privacy-enabled"

async function visit(path, country, preference, forwardedFor) {
  const cookies = ["_medusa_cache_id=locale-integration-test"]
  if (preference) cookies.push(`medusa_locale=${preference}`)
  const headers = { cookie: cookies.join("; ") }
  if (country) headers["cf-ipcountry"] = country
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor
  const response = await fetch(`${origin}${path}`, {
    headers,
    redirect: "manual",
  })
  assert.equal(response.status, 200, `${country}: ${path}`)
  return response.text()
}

test("visitor country selects Turkish, Bulgarian, Arabic or English without changing the store region", { timeout: 120000 }, async () => {
  for (const [country, locale, direction, nav] of [
    ["TR", "tr", "ltr", "Ürünler"],
    ["BG", "bg", "ltr", "Продукти"],
    ["SA", "ar", "rtl", "المنتجات"],
    ["US", "en", "ltr", "Products"],
    ["DE", "en", "ltr", "Products"],
  ]) {
    const html = await visit("/dk", country)
    assert.match(html, new RegExp(`<html lang="${locale}" dir="${direction}"`))
    assert.ok(html.includes(nav), `${country} should show ${nav}`)
    assert.ok(html.includes('value="ar"'), "language switcher should offer Arabic")
    assert.ok(html.includes('value="bg"'), "language switcher should offer Bulgarian")
  }

  const overridden = await visit("/dk", "US", "ar")
  assert.match(overridden, /<html lang="ar" dir="rtl"/)
  assert.ok(overridden.includes("المنتجات"))
})

test("the bundled IP country database detects location without geo headers", { timeout: 120000 }, async () => {
  for (const [country, ip, locale] of [
    ["TR", "2.17.224.1", "tr"],
    ["BG", "2.56.12.1", "bg"],
    ["SA", "2.59.52.1", "ar"],
  ]) {
    const html = await visit("/dk", null, null, ip)
    assert.match(html, new RegExp(`<html lang="${locale}"`), country)
  }
})

test("unknown geography stays English and a manual preference wins over location", { timeout: 120000 }, async () => {
  for (const [country, preference, ip, locale] of [
    [null, null, null, "en"],
    [null, null, "127.0.0.1", "en"],
    ["TR", "en", null, "en"],
    [null, "ar", "2.17.224.1", "ar"],
  ]) {
    const html = await visit("/dk", country, preference, ip)
    assert.match(html, new RegExp(`<html lang="${locale}"`))
  }
})

test("product names and descriptions follow the visitor language", { timeout: 120000 }, async () => {
  for (const [country, title, description] of [
    ["TR", "1080p HD Pro Web Kamerası", "Standart dizüstü kameralarından"],
    ["BG", "1080p HD Pro уеб камера", "Висококачествена"],
    ["SA", "كاميرا ويب", "تمنحك فيديو وصوتًا أفضل"],
  ]) {
    const html = await visit(productPath, country)
    assert.ok(html.includes(title), `${country}: translated product title`)
    assert.ok(html.includes(description), `${country}: translated product description`)
  }
})