// Unit checks for the public catalogue MCP server (protocol, tools, discovery documents). No framework, no network:
// the Medusa Store API is replaced by a canned fetch. Needs only the esbuild that ships with the monorepo (to resolve the
// "@/" imports and extensionless .ts imports the Next.js code uses):
//   node apps/storefront/test-mcp.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const out = mkdtempSync(path.join(tmpdir(), "mcp-test-"))
const entry = path.join(out, "entry.ts")
writeFileSync(
  entry,
  [
    `export * from ${JSON.stringify(path.join(here, "src/lib/mcp/protocol.ts").replace(/\\/g, "/"))}`,
    `export * from ${JSON.stringify(path.join(here, "src/lib/mcp/discovery.ts").replace(/\\/g, "/"))}`,
    `export * from ${JSON.stringify(path.join(here, "src/lib/mcp/ratelimit.ts").replace(/\\/g, "/"))}`,
    `export { fold } from ${JSON.stringify(path.join(here, "src/lib/mcp/catalog.ts").replace(/\\/g, "/"))}`,
    `export { companyInfo } from ${JSON.stringify(path.join(here, "src/lib/mcp/company.ts").replace(/\\/g, "/"))}`,
  ].join("\n")
)
const bundle = path.join(out, "bundle.mjs")
const bin = path.resolve(here, "../../node_modules/.bin", process.platform === "win32" ? "esbuild.CMD" : "esbuild")
execFileSync(bin, [entry, "--bundle", "--platform=node", "--format=esm", `--alias:@=${path.join(here, "src").replace(/\\/g, "/")}`, `--outfile=${bundle}`, "--log-level=error"], {
  shell: process.platform === "win32",
})

process.env.NEXT_PUBLIC_BASE_URL = "https://portsaid.com.tr"
process.env.MEDUSA_BACKEND_URL = "http://medusa.test" // wins over NEXT_PUBLIC_MEDUSA_BACKEND_URL, whatever the shell has exported
process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = "http://medusa.test"
process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test"
process.env.NEXT_PUBLIC_DEFAULT_REGION = "tr"

/* ---------- canned Medusa Store API ---------- */
const cats = [
  { id: "c_strec", name: "Streç Film", handle: "strec-film", parent_category_id: null },
  { id: "c_end", name: "Endüstriyel Streç", handle: "endustriyel-strec", parent_category_id: "c_strec" },
  { id: "c_bant", name: "Koli Bandı", handle: "koli-bandi", parent_category_id: null },
  { id: "c_empty", name: "Boş Kategori", handle: "bos", parent_category_id: null },
]
const products = [
  { id: "p1", title: "Endüstriyel Streç Film 500 mm 23 mic", handle: "endüstriyel-streç-film-500", thumbnail: "https://x/1.webp", categories: [cats[1]] },
  { id: "p2", title: "Şeffaf Koli Bandı 45 mm x 100 m", handle: "seffaf-koli-bandi", thumbnail: null, categories: [cats[2]] },
  { id: "p3", title: "Balonlu Naylon 100 cm 100 m", handle: "balonlu-naylon", thumbnail: null, categories: [] },
]
const detail = {
  id: "p1", title: products[0].title, handle: "endüstriyel-streç-film-500", subtitle: null, description: "<p>Güçlü film</p><p>23 mic</p>", thumbnail: "https://x/1.webp",
  options: [{ id: "o0", title: "Default option", values: [{ value: "Default option value" }] }, { id: "o1", title: "Genişlik", values: [{ value: "500 mm" }] }],
  variants: [{ title: "v", sku: "PMS-001", metadata: { unit: "kg" }, options: [{ option_id: "o1", value: "500 mm" }, { option_id: "o0", value: "Default option value" }] }],
  categories: [cats[1]], images: [{ url: "https://x/1.webp" }, { url: "https://x/2.webp" }],
}
let fetchCalls = 0
globalThis.fetch = async (url) => {
  fetchCalls++
  const u = new URL(url)
  assert.equal(u.origin, "http://medusa.test")
  const json = (b) => ({ ok: true, status: 200, json: async () => b })
  if (u.pathname === "/store/product-categories") return json({ product_categories: cats, count: cats.length })
  if (u.pathname === "/store/products" && u.searchParams.get("handle")) {
    return json({ products: u.searchParams.get("handle") === detail.handle ? [detail] : [] })
  }
  if (u.pathname === "/store/products") return json({ products, count: products.length })
  return { ok: false, status: 404, json: async () => ({}) }
}

const m = await import(pathToFileURL(bundle).href)
let pass = 0
const check = async (name, fn) => { await fn(); pass++; console.log("PASS", name) }

const META = "io.modelcontextprotocol/"
const modernMeta = { _meta: { [META + "protocolVersion"]: "2026-07-28", [META + "clientInfo"]: { name: "t", version: "1" }, [META + "clientCapabilities"]: {} } }
const rpc = async (method, params, { headers = {}, id = 1, raw } = {}) => {
  const body = raw ?? JSON.stringify({ jsonrpc: "2.0", id, method, params })
  const r = await m.handleMcp({ headers: new Headers(headers), bodyText: body })
  return { status: r.status, headers: r.headers, json: r.body ? JSON.parse(r.body) : null }
}
const call = (name, args, modern = true) => rpc("tools/call", { name, arguments: args, ...(modern ? modernMeta : {}) })

/* ---------- accent folding ---------- */
await check("fold: Turkish letters and dotted/dotless i", () => {
  assert.equal(m.fold("Streç İşlem ŞEFFAF Ğ Ö Ü ı"), "strec islem seffaf g o u i")
  assert.equal(m.fold("STREÇ"), m.fold("strec"))
})

/* ---------- JSON-RPC envelope ---------- */
await check("parse error -> 400 / -32700", async () => {
  const r = await rpc("x", {}, { raw: "{nope" })
  assert.equal(r.status, 400); assert.equal(r.json.error.code, -32700)
})
await check("batch rejected", async () => {
  const r = await rpc("x", {}, { raw: "[]" })
  assert.equal(r.status, 400); assert.equal(r.json.error.code, -32600)
})
await check("notification -> 202, no body", async () => {
  const r = await rpc("x", {}, { raw: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) })
  assert.equal(r.status, 202); assert.equal(r.json, null)
})
await check("oversized body -> 413", async () => {
  const r = await rpc("x", {}, { raw: "x".repeat(20000) })
  assert.equal(r.status, 413)
})

/* ---------- legacy era (initialize handshake) ---------- */
await check("legacy initialize echoes a supported version", async () => {
  const r = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } })
  assert.equal(r.status, 200); assert.equal(r.json.result.protocolVersion, "2025-06-18")
  assert.equal(r.json.result.serverInfo.name, "tr.com.portsaid/catalog")
  assert.ok(r.json.result.capabilities.tools); assert.equal(r.json.result.resultType, undefined)
})
await check("legacy initialize with an unknown version falls back to the newest legacy one", async () => {
  const r = await rpc("initialize", { protocolVersion: "1999-01-01" })
  assert.equal(r.json.result.protocolVersion, "2025-11-25")
})
await check("legacy ping + unknown method (200 with -32601)", async () => {
  assert.deepEqual((await rpc("ping", {})).json.result, {})
  const r = await rpc("resources/list", {})
  assert.equal(r.status, 200); assert.equal(r.json.error.code, -32601)
})

/* ---------- modern era (stateless, per-request _meta) ---------- */
await check("server/discover", async () => {
  const r = await rpc("server/discover", modernMeta)
  const res = r.json.result
  assert.equal(r.status, 200); assert.equal(res.resultType, "complete")
  assert.ok(res.supportedVersions.includes("2026-07-28")); assert.ok(res.capabilities.tools)
  assert.equal(res._meta[META + "serverInfo"].name, "tr.com.portsaid/catalog")
  assert.equal(res.cacheScope, "public"); assert.ok(res.ttlMs > 0); assert.ok(res.instructions.length > 20)
})
await check("unsupported protocolVersion -> 400 / -32022 with supported list", async () => {
  const r = await rpc("tools/list", { _meta: { [META + "protocolVersion"]: "2031-01-01" } })
  assert.equal(r.status, 400); assert.equal(r.json.error.code, -32022)
  assert.ok(r.json.error.data.supported.includes("2026-07-28")); assert.equal(r.json.error.data.requested, "2031-01-01")
})
await check("header mismatch -> 400 / -32020 (Mcp-Method, MCP-Protocol-Version, Mcp-Name)", async () => {
  for (const headers of [{ "Mcp-Method": "tools/call" }, { "MCP-Protocol-Version": "2025-06-18" }]) {
    const r = await rpc("tools/list", modernMeta, { headers })
    assert.equal(r.status, 400); assert.equal(r.json.error.code, -32020)
  }
  const r = await rpc("tools/call", { name: "search_products", arguments: { query: "x" }, ...modernMeta }, { headers: { "Mcp-Method": "tools/call", "Mcp-Name": "get_product" } })
  assert.equal(r.status, 400); assert.equal(r.json.error.code, -32020)
})
await check("matching headers are accepted", async () => {
  const r = await rpc("tools/list", modernMeta, { headers: { "Mcp-Method": "tools/list", "MCP-Protocol-Version": "2026-07-28" } })
  assert.equal(r.status, 200)
})
await check("unknown method in the modern era -> 404 / -32601", async () => {
  const r = await rpc("prompts/list", modernMeta)
  assert.equal(r.status, 404); assert.equal(r.json.error.code, -32601)
})

/* ---------- tools ---------- */
await check("tools/list: 4 read-only tools, schemas, no handler leaked", async () => {
  const r = await rpc("tools/list", modernMeta)
  const tools = r.json.result.tools
  assert.deepEqual(tools.map((t) => t.name), ["search_products", "get_product", "list_categories", "get_company_info"])
  for (const t of tools) {
    assert.equal(t.annotations.readOnlyHint, true); assert.equal(t.annotations.openWorldHint, false)
    assert.equal(t.inputSchema.type, "object"); assert.ok(t.description.length > 20); assert.equal(t.handler, undefined)
  }
  assert.equal(r.json.result.resultType, "complete")
  assert.equal((await rpc("tools/list", {})).json.result.resultType, undefined) // legacy shape has no resultType
})
await check("search_products: accent-insensitive, ranked, links, no price", async () => {
  const r = await call("search_products", { query: "STREC film 500" })
  const res = r.json.result
  assert.equal(res.isError, false)
  assert.equal(res.structuredContent.total, 1)
  const hit = res.structuredContent.results[0]
  assert.equal(hit.handle, "endüstriyel-streç-film-500")
  assert.equal(hit.url, "https://portsaid.com.tr/tr/products/end%C3%BCstriyel-stre%C3%A7-film-500")
  assert.deepEqual(hit.categories, ["Endüstriyel Streç"])
  assert.ok(!/price|fiyat\b/i.test(JSON.stringify(res.structuredContent)))
  assert.equal(JSON.parse(res.content[0].text).total, 1)
})
await check("search_products: category filter, limit, empty result", async () => {
  assert.equal((await call("search_products", { query: "bandi", category: "koli-bandi" })).json.result.structuredContent.total, 1)
  assert.equal((await call("search_products", { query: "bandi", category: "strec-film" })).json.result.structuredContent.total, 0)
  assert.equal((await call("search_products", { query: "nonexistentthing" })).json.result.structuredContent.results.length, 0)
  assert.equal((await call("search_products", { query: "naylon", limit: 999 })).json.result.isError, false)
})
await check("search_products: missing query is a tool error, not a protocol error", async () => {
  const r = await call("search_products", {})
  assert.equal(r.status, 200); assert.equal(r.json.result.isError, true); assert.match(r.json.result.content[0].text, /query/)
})
await check("get_product: specs, variants, images; Default option hidden", async () => {
  const p = (await call("get_product", { handle: "endüstriyel-streç-film-500" })).json.result.structuredContent
  assert.equal(p.title, "Endüstriyel Streç Film 500 mm 23 mic")
  assert.deepEqual(p.specifications, { Genişlik: ["500 mm"] })
  assert.deepEqual(p.variants[0], { title: "v", sku: "PMS-001", unit: "kg", options: { Genişlik: "500 mm" } })
  assert.equal(p.description, "Güçlü film\n23 mic")
  assert.equal(p.images.length, 2); assert.equal(p.categories[0].handle, "endustriyel-strec")
  assert.match(p.pricing, /teklif/i)
})
await check("get_product: accepts the page URL, the percent-encoded handle and the accent-less handle", async () => {
  for (const h of [
    "https://portsaid.com.tr/tr/products/end%C3%BCstriyel-stre%C3%A7-film-500",
    "end%C3%BCstriyel-stre%C3%A7-film-500",
    "endustriyel-strec-film-500",
  ]) {
    const r = await call("get_product", { handle: h })
    assert.equal(r.json.result.isError, false, h)
    assert.equal(r.json.result.structuredContent.handle, "endüstriyel-streç-film-500")
  }
})
await check("get_product: unknown handle -> isError with guidance", async () => {
  const r = await call("get_product", { handle: "yok" })
  assert.equal(r.json.result.isError, true); assert.match(r.json.result.content[0].text, /search_products/)
})
await check("list_categories: tree with roll-up counts, empty categories hidden", async () => {
  const t = (await call("list_categories", {})).json.result.structuredContent
  const names = t.categories.map((c) => c.name)
  assert.deepEqual(names, ["Koli Bandı", "Streç Film"]) // "Boş Kategori" has no products; sorted in Turkish order
  const strec = t.categories.find((c) => c.handle === "strec-film")
  assert.equal(strec.product_count, 1); assert.equal(strec.subcategories[0].name, "Endüstriyel Streç")
  assert.equal(t.product_count, 3)
})
await check("get_company_info: topics and full dump", async () => {
  const c = (await call("get_company_info", { topic: "contact" })).json.result.structuredContent
  assert.equal(c.phone, "+90 212 875 06 05"); assert.equal(c.email, "info@portsaid.com.tr")
  assert.match(JSON.stringify((await call("get_company_info", { topic: "delivery" })).json.result.structuredContent), /Avrupa yakası/)
  const all = (await call("get_company_info", {})).json.result.structuredContent
  for (const k of ["about", "products", "delivery", "payment", "quote", "contact"]) assert.ok(all[k], k)
  assert.ok(!/\b\d+[.,]?\d*\s*(TL|₺|\$)/.test(JSON.stringify(all)), "no prices in company info")
})
await check("unknown tool -> -32602", async () => {
  const r = await call("delete_everything", {})
  assert.equal(r.json.error.code, -32602)
})
await check("backend failure -> generic isError, no internals leaked", async () => {
  const real = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => ({}) })
  const r = await call("get_product", { handle: "another-uncached" })
  globalThis.fetch = real
  assert.equal(r.json.result.isError, true); assert.ok(!/502|medusa|store/i.test(r.json.result.content[0].text))
})
await check("catalogue index is cached (searches don't re-fetch)", async () => {
  await call("search_products", { query: "naylon" })
  const before = fetchCalls
  await call("search_products", { query: "bant" }); await call("list_categories", {})
  assert.equal(fetchCalls, before)
})

/* ---------- rate limit ---------- */
await check("rate limiter: 60 per minute per key, then Retry-After, window resets", () => {
  const t0 = 1_000_000
  for (let i = 0; i < 60; i++) assert.equal(m.hit("1.2.3.4", t0), 0)
  assert.ok(m.hit("1.2.3.4", t0 + 1000) > 0)
  assert.equal(m.hit("5.6.7.8", t0 + 1000), 0)
  assert.equal(m.hit("1.2.3.4", t0 + 61_000), 0)
  assert.equal(m.clientKey(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" })), "9.9.9.9")
})

/* ---------- discovery documents ---------- */
await check("server card: required fields, name pattern, remote matches server/discover", async () => {
  const c = m.serverCard()
  assert.equal(c.$schema, "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json")
  assert.match(c.name, /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/)
  assert.ok(c.description.length <= 100, `description ${c.description.length} chars`)
  assert.equal(c.remotes[0].type, "streamable-http"); assert.equal(c.remotes[0].url, "https://portsaid.com.tr/mcp")
  const live = (await rpc("server/discover", modernMeta)).json.result
  assert.deepEqual(c.remotes[0].supportedProtocolVersions, live.supportedVersions)
  assert.equal(c.name, live._meta[META + "serverInfo"].name); assert.equal(c.version, live._meta[META + "serverInfo"].version)
})
await check("ARD manifest: urn:air ids, exactly one of url/data, 2-5 queries, absolute URLs", () => {
  const a = m.ardManifest()
  assert.equal(a.specVersion, "1.0"); assert.ok(a.host.displayName && a.host.identifier)
  assert.ok(a.entries.length >= 2)
  for (const e of a.entries) {
    assert.match(e.identifier, /^urn:air:portsaid\.com\.tr:[a-z0-9-]+:[a-z0-9-]+$/)
    assert.ok(e.displayName && e.type)
    assert.equal(Number("url" in e) + Number("data" in e), 1)
    assert.ok(e.representativeQueries.length >= 2 && e.representativeQueries.length <= 5)
    assert.match(e.url, /^https:\/\/portsaid\.com\.tr\//)
  }
  assert.equal(a.entries[0].type, "application/mcp-server-card+json")
})
await check("agent skills index: digest is the sha256 of the served SKILL.md bytes", () => {
  const idx = m.skillsIndex()
  assert.equal(idx.$schema, "https://schemas.agentskills.io/discovery/0.2.0/schema.json")
  const s = idx.skills[0]
  assert.equal(s.type, "skill-md"); assert.equal(s.name, "portsaid-catalog")
  assert.equal(s.digest, "sha256:" + createHash("sha256").update(Buffer.from(m.skillMarkdown(), "utf8")).digest("hex"))
  assert.match(s.digest, /^sha256:[0-9a-f]{64}$/)
  assert.equal(s.url, "/.well-known/agent-skills/portsaid-catalog/SKILL.md")
})
await check("SKILL.md: frontmatter name matches, mentions every tool and the no-price rule", () => {
  const md = m.skillMarkdown()
  const fm = md.match(/^---\nname: (.+)\ndescription: (.+)\n---\n/)
  assert.ok(fm); assert.equal(fm[1], "portsaid-catalog"); assert.ok(fm[2].length > 40 && fm[2].length <= 1024)
  for (const t of ["search_products", "get_product", "list_categories", "get_company_info"]) assert.ok(md.includes(t), t)
  assert.match(md, /Prices are not published/)
})

console.log(`\n${pass} checks passed`)
