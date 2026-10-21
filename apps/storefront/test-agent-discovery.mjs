// Unit checks for the agent-discovery helpers (no framework, no install needed):
//   node apps/storefront/test-agent-discovery.mjs        (Node 22.18+ / 24: runs the .ts files directly)
import assert from "node:assert/strict"

const { wantsMarkdown, htmlToMarkdown, estimateTokens } = await import("./src/lib/agent-discovery/markdown.ts")
const { homeLinkHeader, isHomePath } = await import("./src/lib/agent-discovery/link-headers.ts")

let pass = 0
const check = (name, fn) => { fn(); pass++; console.log("PASS", name) }

/* ---------- Accept negotiation: HTML stays the default ---------- */
check("browser Accept -> HTML", () => assert.equal(wantsMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"), false))
check("*/* alone -> HTML", () => assert.equal(wantsMarkdown("*/*"), false))
check("no Accept -> HTML", () => assert.equal(wantsMarkdown(undefined), false))
check("text/markdown -> markdown", () => assert.equal(wantsMarkdown("text/markdown"), true))
check("markdown first, html lower q -> markdown", () => assert.equal(wantsMarkdown("text/markdown, text/html;q=0.8"), true))
check("html preferred over markdown -> HTML", () => assert.equal(wantsMarkdown("text/html, text/markdown;q=0.5"), false))
check("equal q: first listed wins (markdown)", () => assert.equal(wantsMarkdown("text/markdown, text/html"), true))
check("equal q: first listed wins (html)", () => assert.equal(wantsMarkdown("text/html, text/markdown"), false))
check("markdown q=0 is a refusal", () => assert.equal(wantsMarkdown("text/markdown;q=0, text/html"), false))
check("explicit markdown beats a */* wildcard", () => assert.equal(wantsMarkdown("text/markdown, */*;q=0.8"), true))

/* ---------- Link headers ---------- */
check("home paths", () => {
  assert.equal(isHomePath("/", "tr"), true)
  assert.equal(isHomePath("/tr", "tr"), true)
  assert.equal(isHomePath("/tr/", "tr"), true)
  assert.equal(isHomePath("/TR", "tr"), true)
  assert.equal(isHomePath("/tr/store", "tr"), false)
  assert.equal(isHomePath("/bg", "tr"), false)
})
check("Link header carries sitemap + api-catalog (RFC 8288 syntax)", () => {
  const h = homeLinkHeader()
  assert.match(h, /^<\/sitemap\.xml>; rel="sitemap"/)
  assert.match(h, /<\/\.well-known\/api-catalog>; rel="api-catalog"/)
})

/* ---------- HTML -> Markdown ---------- */
const BASE = "https://portsaid.com.tr"
const page = `<!DOCTYPE html><html><head><title>Streç Film | Portsaid</title><style>.x{}</style><script>var a="<b>no</b>"</script></head>
<body><header><nav><a href="/tr/store">Menu junk</a></nav></header>
<main>
<h1>Endüstriyel Streç Film</h1>
<!-- react comment --><!--$-->
<p>El ile sarım için <strong>17 mikron</strong> &amp; <em>23 mikron</em> seçenekleri.&nbsp;Bkz. <a href="/tr/categories/x%C3%A7">kategori</a>.</p>
<a href="/tr/products/p1"><img src="/img/p1.jpg" alt="Ürün 1"></a>
<a href="/tr/empty"><img src="data:image/gif;base64,AAAA"></a>
<a href="#top">anchor only</a> <a href="javascript:void(0)">js link</a>
<ul><li>Hotmelt<ul><li>şeffaf</li><li>kahve</li></ul></li><li>Akrilik</li></ul>
<ol><li>bir</li><li>iki</li></ol>
<table><thead><tr><th>Mikron</th><th>Metre</th></tr></thead><tbody><tr><td>17</td><td>205 | 300</td></tr><tr><td>23</td><td>152</td></tr></tbody></table>
<select><option>Seçiniz</option><option>Kırmızı</option></select><button>Sepete ekle</button>
<pre>satır 1
  satır 2</pre>
<p>Fiyat: <code>600 TL + KDV</code><br>Teslimat 1-3 gün</p>
<hr>
<h2>İletişim</h2><p>Tel: <a href="tel:+902128750605">0212 875 06 05</a> <a href="mailto:info@portsaid.com.tr">info@portsaid.com.tr</a></p>
</main>
<footer>footer junk</footer></body></html>`
const { markdown: md, title } = htmlToMarkdown(page, BASE)

check("title is read from <title>", () => assert.equal(title, "Streç Film | Portsaid"))
check("heading", () => assert.match(md, /^# Endüstriyel Streç Film$/m))
check("only <main> is converted (menu / footer / script / style dropped)", () => {
  assert.doesNotMatch(md, /Menu junk|footer junk|var a=|\.x\{/)
})
check("bold, italic, entities, nbsp", () => assert.match(md, /El ile sarım için \*\*17 mikron\*\* & \*23 mikron\* seçenekleri\. Bkz\./))
check("relative link becomes absolute", () => assert.match(md, /\[kategori\]\(https:\/\/portsaid\.com\.tr\/tr\/categories\/x%C3%A7\)/))
check("image link keeps alt text", () => assert.match(md, /\[!\[Ürün 1\]\(https:\/\/portsaid\.com\.tr\/img\/p1\.jpg\)\]\(https:\/\/portsaid\.com\.tr\/tr\/products\/p1\)/))
check("data: image dropped, empty link not emitted", () => assert.doesNotMatch(md, /data:image|\]\(https:\/\/portsaid\.com\.tr\/tr\/empty\)/))
check("anchor-only and javascript: links keep their text, no href", () => {
  assert.match(md, /anchor only/); assert.match(md, /js link/)
  assert.doesNotMatch(md, /\(#top\)|javascript:/)
})
check("nested list", () => assert.match(md, /- Hotmelt\n {2}- şeffaf\n {2}- kahve\n- Akrilik/))
check("ordered list", () => assert.match(md, /1\. bir\n2\. iki/))
check("table with header row, pipes escaped", () => {
  assert.match(md, /\| Mikron \| Metre \|\n\| --- \| --- \|\n\| 17 \| 205 \\\| 300 \|\n\| 23 \| 152 \|/)
})
check("form controls dropped (select/option/button)", () => assert.doesNotMatch(md, /Seçiniz|Kırmızı|Sepete ekle/))
check("pre block fenced and kept verbatim", () => assert.match(md, /```\nsatır 1\n {2}satır 2\n```/))
check("inline code and <br>", () => assert.match(md, /Fiyat: `600 TL \+ KDV`\nTeslimat 1-3 gün/))
check("hr and second heading", () => { assert.match(md, /\n---\n/); assert.match(md, /^## İletişim$/m) })
check("tel: and mailto: links survive", () => {
  assert.match(md, /\[0212 875 06 05\]\(tel:\+902128750605\)/)
  assert.match(md, /\[info@portsaid\.com\.tr\]\(mailto:info@portsaid\.com\.tr\)/)
})
check("no 3+ blank lines, ends with one newline", () => { assert.doesNotMatch(md, /\n{3,}/); assert.match(md, /[^\n]\n$/) })

check("header / footer INSIDE <main> are dropped, breadcrumb nav and meaningful images kept, decorative ones dropped", () => {
  const r = htmlToMarkdown('<html><head><title>T</title></head><body><main><div><header><nav><a href="/tr/store">Ürünler</a></nav><h1>Brand</h1></header></div><nav aria-label="breadcrumb"><a href="/tr">Ana sayfa</a></nav><h1>Ürün</h1><img src="/a.webp"><img src="/b.webp" alt="Balonlu naylon"><h3></h3><ul><li></li><li>Gerçek</li></ul><footer><p>alt bilgi</p></footer></main></body></html>', BASE)
  assert.doesNotMatch(r.markdown, /Brand|Ürünler\]|alt bilgi|a\.webp/)
  assert.match(r.markdown, /\[Ana sayfa\]\(https:\/\/portsaid\.com\.tr\/tr\)/)
  assert.match(r.markdown, /!\[Balonlu naylon\]\(https:\/\/portsaid\.com\.tr\/b\.webp\)/)
  assert.doesNotMatch(r.markdown, /^#{1,6}\s*$/m)
  assert.match(r.markdown, /^- Gerçek$/m)
  assert.doesNotMatch(r.markdown, /^-\s*$/m)
})
check("no <main>: body kept, site chrome (header/footer) dropped, title becomes the h1", () => {
  const r = htmlToMarkdown("<html><head><title>Hakkımızda</title></head><body><header>menu</header><p>İçerik</p><footer>alt</footer></body></html>", BASE)
  assert.equal(r.markdown, "# Hakkımızda\n\nİçerik\n")
})
check("broken HTML does not throw", () => {
  const r = htmlToMarkdown("<main><table><tr><td>a<td>b</table><ul><li>x<p>unclosed", BASE)
  assert.match(r.markdown, /a/)
})
check("token estimate", () => assert.equal(estimateTokens("x".repeat(400)), 100))

console.log(`\n${pass} passed, 0 failed`)
