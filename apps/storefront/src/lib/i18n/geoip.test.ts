import test from "node:test"
import assert from "node:assert/strict"
import {
  extractPublicClientIp,
  getCountryForIp,
  ipv6ToBigInt,
  lookupCountry,
  parseCountryDatabase,
} from "./geoip"

test("extracts the first public proxy address and ignores private hops", () => {
  assert.equal(
    extractPublicClientIp({
      forwardedFor: "10.0.0.4, 203.0.113.42",
      realIp: "192.168.1.2",
    }),
    "203.0.113.42"
  )
  assert.equal(extractPublicClientIp({ forwardedFor: "127.0.0.1", realIp: "::1" }), undefined)
})

test("supports IPv4-mapped IPv6 and IPv6 database binary search", () => {
  assert.equal(ipv6ToBigInt("2001:db8::1") !== undefined, true)
  const database = parseCountryDatabase(
    "167772160\t184549375\tUS\n3232235520\t3232301055\tTR\n",
    "2001:db8::\t2001:db8::ffff\tBG\n"
  )
  assert.equal(lookupCountry("10.0.0.1", database), undefined)
  assert.equal(lookupCountry("192.168.1.1", database), undefined)
  assert.equal(lookupCountry("::ffff:192.0.2.1", database), undefined)
  assert.equal(lookupCountry("2001:db8::42", database), "BG")
})

test("bundled ranges cover localized countries and default others to English", async () => {
  assert.equal(await getCountryForIp("2.17.224.1"), "TR")
  assert.equal(await getCountryForIp("2.56.12.1"), "BG")
  assert.equal(await getCountryForIp("2.59.52.1"), "SA")
  assert.equal(await getCountryForIp("8.8.8.8"), undefined)
})