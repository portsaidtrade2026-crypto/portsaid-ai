// Markdown for Agents: content negotiation + a small, dependency-free HTML -> Markdown converter.
//
// A request that asks for `Accept: text/markdown` gets the page as Markdown; browsers (and anything that
// does not ask for it) keep getting HTML. No imports on purpose: the converter is tested with plain node
// (see apps/storefront/test-agent-discovery.mjs) and adds nothing to the lockfile / Docker build.

/** True when the client prefers text/markdown over HTML (explicit mention only; "*" alone means HTML). */
export function wantsMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false
  let md = -1
  let mdIndex = Infinity
  let html = -1
  let htmlIndex = Infinity
  let wild = -1
  accept.split(",").forEach((part, i) => {
    const [type, ...params] = part.trim().toLowerCase().split(";")
    const q = (() => {
      const p = params.map((x) => x.trim()).find((x) => x.startsWith("q="))
      const n = p ? Number(p.slice(2)) : 1
      return Number.isFinite(n) ? n : 1
    })()
    if (type === "text/markdown") { md = Math.max(md, q); mdIndex = Math.min(mdIndex, i) }
    else if (type === "text/html" || type === "application/xhtml+xml") { html = Math.max(html, q); htmlIndex = Math.min(htmlIndex, i) }
    else if (type === "text/*" || type === "*/*") wild = Math.max(wild, q)
  })
  if (md <= 0) return false
  const htmlQ = html >= 0 ? html : Math.max(wild, 0)
  if (md !== htmlQ) return md > htmlQ
  return mdIndex < htmlIndex // same weight: the one listed first wins
}

/** Rough size hint for the x-markdown-tokens header (about 4 characters per token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", copy: "©", reg: "®",
  trade: "™", laquo: "«", raquo: "»", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", euro: "€", times: "×", middot: "·", bull: "•",
}

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      try { return String.fromCodePoint(code) } catch { return m }
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

function attr(attrs: string, name: string): string {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs)
  return m ? decode(m[1] ?? m[2] ?? m[3] ?? "") : ""
}

function absolute(href: string, base: string): string {
  try { return new URL(href, base).toString() } catch { return href }
}

type Table = { rows: string[][]; row: string[] | null }

/**
 * React streams Suspense boundaries: the HTML first holds `<!--$?--><template id="B:n"></template>fallback<!--/$-->`, and the
 * real content arrives later, after </main>, as `<div hidden id="S:n">...</div>` (a script then swaps them in the browser).
 * A text reader has no script, so do the swap here - otherwise product lists and menus are missing from the Markdown.
 */
export function resolveSuspense(html: string): string {
  const segments = new Map<string, string>()
  let out = ""
  let from = 0
  const open = /<div hidden id="S:([0-9a-z]+)">/gi // ids are base-36-ish: S:3, S:a, S:1f ...
  let m: RegExpExecArray | null
  while ((m = open.exec(html))) {
    const start = m.index + m[0].length
    const div = /<(\/?)div\b[^>]*>/gi
    div.lastIndex = start
    let depth = 1
    let end = -1
    for (let d: RegExpExecArray | null; (d = div.exec(html)); ) {
      depth += d[1] ? -1 : 1
      if (depth === 0) { end = d.index; break }
    }
    if (end < 0) break // truncated document: leave the rest as it is
    segments.set(m[1], html.slice(start, end))
    out += html.slice(from, m.index)
    from = end + "</div>".length
    open.lastIndex = from
  }
  if (!segments.size) return html
  out += html.slice(from)

  // B:n = a whole boundary (content replaces the fallback), P:n = a slot inside already-sent content that a later segment fills
  const boundary = /<!--\$\?--><template id="B:([0-9a-z]+)"><\/template>[\s\S]*?<!--\/\$-->/gi
  const slot = /<template id="P:([0-9a-z]+)"><\/template>/gi
  for (let pass = 0; pass < 12; pass++) {
    let changed = false
    const swap = (whole: string, id: string) => {
      const seg = segments.get(id)
      if (seg === undefined) return whole
      changed = true
      return seg
    }
    out = out.replace(boundary, swap).replace(slot, swap)
    if (!changed) break
  }
  return out
}

/** Converts the main content of an HTML page to Markdown. */
export function htmlToMarkdown(html: string, baseUrl: string): { markdown: string; title: string } {
  const title = decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ")).trim()

  let body = resolveSuspense(html).replace(/<!--[\s\S]*?-->/g, "")
  const mainOpen = /<main[\s>]/i.exec(body)
  if (mainOpen) {
    // (not body.toLowerCase().lastIndexOf: lower-casing "İ" changes the string length and shifts every index)
    let end = -1
    for (const c of body.matchAll(/<\/main>/gi)) end = c.index!
    body = body.slice(mainOpen.index, end > mainOpen.index ? end + 7 : undefined)
  } else {
    body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(body)?.[1] ?? body
  }
  // Site chrome. Not only outside <main>: this storefront wraps header, page content and footer in one <main>.
  body = body.replace(/<(header|footer|aside)\b[\s\S]*?<\/\1>/gi, "")
  body = body.replace(/<(script|style|noscript|svg|template|head|iframe|button|select|textarea)\b[\s\S]*?<\/\1>/gi, "")

  const bufs: string[] = [""]
  const top = () => bufs.length - 1
  const add = (s: string) => { bufs[top()] += s }
  const ends = (re: RegExp) => re.test(bufs[top()])
  const block = () => { if (bufs[top()] && !ends(/\n\n$/)) bufs[top()] = bufs[top()].replace(/[ \t]+$/, "").replace(/\n?$/, "\n\n") }
  const line = () => { if (bufs[top()] && !ends(/\n$/)) bufs[top()] = bufs[top()].replace(/[ \t]+$/, "") + "\n" }

  const lists: { ordered: boolean; n: number }[] = []
  const links: { pos: number; href: string }[] = []
  const tables: Table[] = []
  let pre = 0
  let skip = 0 // inside an element whose text must not be output (e.g. <option>)

  const tag = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+|<)/g
  let m: RegExpExecArray | null
  while ((m = tag.exec(body))) {
    if (m[4] !== undefined) { // text
      if (skip) continue
      const raw = decode(m[4])
      if (pre) { add(raw); continue }
      const t = raw.replace(/\s+/g, " ")
      if (!t.trim()) { if (bufs[top()] && !ends(/[\s\[(]$/)) add(" "); continue }
      add(ends(/(^|\s)$/) ? t.replace(/^ /, "") : t)
      continue
    }
    const closing = !!m[1]
    const name = m[2].toLowerCase()
    const attrs = m[3] || ""
    if (/\/\s*$/.test(attrs) && !closing && !["br", "hr", "img", "input"].includes(name)) continue // self-closed foreign element

    switch (name) {
      case "option": case "optgroup": case "input": case "label":
        if (name === "option" || name === "optgroup") skip += closing ? -1 : 1
        break
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
        block()
        if (!closing) add("#".repeat(Number(name[1])) + " ")
        else block()
        break
      case "p": case "div": case "section": case "article": case "header": case "footer": case "aside": case "main": case "figure":
      case "figcaption": case "form": case "fieldset": case "details": case "summary": case "address": case "blockquote": case "dl":
        block()
        break
      case "br":
        add("\n")
        break
      case "hr":
        block(); add("---"); block()
        break
      case "strong": case "b":
        add("**")
        break
      case "em": case "i":
        add("*")
        break
      case "code":
        if (!pre) add("`")
        break
      case "pre":
        if (!closing) { block(); add("```\n"); pre++ } else { pre = Math.max(0, pre - 1); line(); add("```"); block() }
        break
      case "ul": case "ol":
        if (!closing) { lists.length ? line() : block(); lists.push({ ordered: name === "ol", n: 0 }) }
        else { lists.pop(); lists.length ? line() : block() }
        break
      case "li":
        if (!closing) {
          line()
          const l = lists[lists.length - 1]
          const depth = Math.max(0, lists.length - 1)
          add("  ".repeat(depth) + (l?.ordered ? `${++l.n}. ` : "- "))
        } else line()
        break
      case "dt": case "dd":
        line()
        break
      case "span": case "small":
        // label / value pairs are adjacent <span>s styled apart by CSS ("Stok kodu" "PMBLF-003"): keep them apart in text
        if (closing && bufs[top()] && !ends(/\s$/)) add(" ")
        break
      case "a": {
        if (!closing) {
          const href = attr(attrs, "href")
          links.push({ pos: bufs[top()].length, href: !href || href.startsWith("#") || /^(javascript|mailto|tel):/i.test(href) ? (/^(mailto|tel):/i.test(href) ? href : "") : absolute(href, baseUrl) })
        } else {
          const l = links.pop()
          if (!l || !l.href) break
          const inner = bufs[top()].slice(l.pos)
          if (!inner.trim()) break
          const flat = inner.replace(/\s*\n+\s*/g, " ").trim()
          bufs[top()] = bufs[top()].slice(0, l.pos) + `[${flat}](${l.href})`
        }
        break
      }
      case "img": {
        const src = attr(attrs, "src") || attr(attrs, "data-src")
        const alt = attr(attrs, "alt").trim()
        // decorative or generic images ("Thumbnail", no alt) say nothing to a text reader: the link text names the product
        if (src && alt && !/^(thumbnail|image|logo|icon)$/i.test(alt) && !src.startsWith("data:")) {
          // /_next/image?url=<original>&w=3840 -> the original file
          const real = /^\/_next\/image\?/.test(src) ? new URLSearchParams(src.split("?")[1]).get("url") : null
          add(`![${alt}](${absolute(real || src, baseUrl)})`)
        }
        break
      }
      case "table":
        if (!closing) { block(); tables.push({ rows: [], row: null }) }
        else {
          const t = tables.pop()
          if (t && t.rows.length) {
            const cols = Math.max(...t.rows.map((r) => r.length))
            const row = (r: string[]) => "| " + Array.from({ length: cols }, (_, i) => r[i] ?? "").join(" | ") + " |"
            add([row(t.rows[0]), "| " + Array(cols).fill("---").join(" | ") + " |", ...t.rows.slice(1).map(row)].join("\n"))
          }
          block()
        }
        break
      case "tr":
        if (tables.length) {
          const t = tables[tables.length - 1]
          if (!closing) t.row = []
          else if (t.row) { if (t.row.some((c) => c)) t.rows.push(t.row); t.row = null }
        }
        break
      case "td": case "th":
        if (tables.length) {
          if (!closing) bufs.push("")
          else if (bufs.length > 1) {
            const cell = bufs.pop()!.replace(/\s*\n+\s*/g, " ").replace(/\|/g, "\\|").trim()
            tables[tables.length - 1].row?.push(cell)
          }
        }
        break
      default:
        break
    }
  }
  while (bufs.length > 1) { const x = bufs.pop()!; add(x) } // unclosed cell: keep its text

  let markdown = bufs[0]
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/^#{1,6}[ \t]*$/gm, "") // headings and list items whose content was dropped
    .replace(/^[ \t]*(?:-|\d+\.)[ \t]*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  if (title && !/^# /m.test(markdown)) markdown = `# ${title}\n\n${markdown}`.trim()
  return { markdown: markdown + "\n", title }
}
