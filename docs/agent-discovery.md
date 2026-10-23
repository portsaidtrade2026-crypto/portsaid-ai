# Agent discovery (robots, sitemap, Link headers, Markdown, public MCP server)

Added 2026-10-21 for the isitagentready.com checks. All of it lives in `apps/storefront`; nothing touches the backend.

| What | Where | Notes |
|---|---|---|
| `/robots.txt` | `src/app/robots.txt/route.ts` | `User-agent: *`, allow `/`; blocks checkout / cart / account / order, `/app`, `/auth`, `/admin`, `/api/`, `?sortBy=`, `?q=`. **AI policy (default, change it in that file):** AI *search/assistant* crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot, ChatGPT-User, Claude-User, Perplexity-User) are allowed - they decide whether the shop appears in AI answers; AI *training* crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot, Applebot-Extended) get `Disallow: /`. `Content-Signal: search=yes, ai-input=yes, ai-train=no`. A crawler with its own group ignores `*`, so each group repeats the private-path rules. Points at `/sitemap.xml`. (A route handler, not `robots.ts`: `MetadataRoute.Robots` cannot emit `Content-Signal`.) |
| `/sitemap.xml` | `src/app/sitemap.ts` | Built per request from the Medusa Store API, cached 1 h by the fetch cache (so a new product appears within the hour, no redeploy). Default region only (`/tr`). Lists categories that hold products, collections, products and the two real info pages (`hakkimizda`, `bize-ulasin`); the legal pages are placeholders and stay out. If the backend is down it still returns the fixed pages. |
| Link headers (RFC 8288) | `src/middleware.ts` + `src/lib/agent-discovery/link-headers.ts` | On `/` (the redirect) and `/<region>` (GET): `rel="sitemap"`, `rel="api-catalog"` and `rel="ard"`. |
| `/.well-known/api-catalog` | `src/app/.well-known/api-catalog/route.ts` | RFC 9727 linkset. Only entry: the public Medusa Store API (`https://admin.portsaid.com.tr/store`, needs the publishable key) with `service-doc` (Medusa's reference) and `status` (`/health`). No `service-desc`: we host no OpenAPI file. Override with `AGENT_STORE_API_URL`. Delete the route and the `api-catalog` link if you do not want to advertise it. |
| `/.well-known/poppy.json` | `src/app/.well-known/poppy.json/route.ts` | Personal Agent Protocol, website-only declaration: `protocol_version` (the spec read on 2026-10-21 says 0.2; the isitagentready hint says 0.1 - one constant), `organization.{name,domain}`, `web: {}`. No `auth` / issuer (the spec requires one only when agent / apis / feedback / browser sessions are declared). |
| Markdown for Agents | `src/middleware.ts` (negotiation), `src/app/api/markdown/route.ts`, `src/lib/agent-discovery/markdown.ts` | `Accept: text/markdown` (explicitly preferred over HTML) on a public catalogue page returns Markdown + `x-markdown-tokens`. Every other Accept (browsers, `*/*`, none) still gets HTML. Cart / checkout / account / order are never converted. |
| **Public MCP server** `/mcp` | `src/app/mcp/route.ts`, `src/lib/mcp/*` | Read-only catalogue server, **no auth, no prices, no customer data**. Tools: `search_products` (accent-insensitive, ranked), `get_product` (specs, SKU, unit, images, page URL; accepts the handle, a page URL or the accent-less handle), `list_categories` (tree + counts), `get_company_info` (about / products / delivery / payment / quote / contact, from owner-approved facts in `company.ts`). Streamable HTTP, JSON responses only, no sessions (GET/DELETE -> 405). One endpoint speaks both protocol eras: 2026-07-28 stateless (`_meta.io.modelcontextprotocol/protocolVersion`, `server/discover`, header checks -> -32020, bad version -> 400 / -32022) and the older `initialize` handshake (2025-03-26 .. 2025-11-25). Rate limit 60 requests / minute / IP (in memory), 16 KB body cap, CORS `*`. The product index (1.8k rows) is cached 30 min in memory; product details 10 min. **Separate from the private n8n connector** (`mcp-server-for-claude.json`), which is never advertised. `/mcp` is excluded in the middleware matcher. |
| MCP Server Card | `src/app/.well-known/mcp/server-card.json/route.ts` (+ `/mcp/server-card`) | `tr.com.portsaid/catalog`, one `streamable-http` remote `/mcp`, `supportedProtocolVersions` identical to `server/discover`. Validated against the official JSON Schema (`experimental-ext-server-card`). Content in `src/lib/mcp/discovery.ts`. |
| ARD manifest | `/.well-known/ard.json` and `/.well-known/ai-catalog.json` (same document) | `specVersion`, `host` (`did:web:portsaid.com.tr`), two `urn:air:portsaid.com.tr:...` entries (the Server Card and the skill) with `representativeQueries`. |
| Agent Skills index | `/.well-known/agent-skills/index.json` + `portsaid-catalog/SKILL.md` | RFC v0.2.0; the `digest` is the sha256 of the exact served SKILL.md bytes (checked by the tests and the live script). The skill only describes this MCP server. |
| WebMCP | `src/modules/common/components/webmcp/index.tsx` (mounted in `app/layout.tsx`) | Registers the same 4 read-only tools with `document.modelContext.registerTool()` (falls back to `navigator.modelContext`) from the shared `src/lib/mcp/tool-defs.ts`; each `execute` posts to `/mcp`. No-op in browsers without WebMCP. Cannot touch the cart or account. |
| DNS-AID | Cloudflare DNS (zone portsaid.com.tr, added 2026-10-21, not in the repo) | Two unsigned SVCB records, TTL auto: `_index._agents.portsaid.com.tr  1 portsaid.com.tr. alpn=h2 port=443` (organisation entry point) and `_mcp._agents.portsaid.com.tr  1 portsaid.com.tr. alpn=mcp,h2 port=443` (the MCP endpoint, one record per agent protocol as the draft requires). TargetName has no underscores. Details (endpoint path, ARD manifest) are found over HTTPS at `/mcp` and `/.well-known/ard.json`. Check: `curl -s 'https://cloudflare-dns.com/dns-query?name=_mcp._agents.portsaid.com.tr&type=SVCB' -H 'accept: application/dns-json'`. To remove: delete the two records in the Cloudflare dashboard. |

## How the Markdown path works
Middleware sees `Accept: text/markdown` on `/<region>`, `/store`, `/katalog`, `/categories/*`, `/collections/*`, `/products/*`, `/bilgi/*`
and rewrites to `/api/markdown`, passing the path in the `x-agent-md-path` header (a route handler still sees the *original* URL
after a rewrite, so a query parameter would be lost). The route renders the same page over loopback (`127.0.0.1:$PORT`, header
`x-agent-markdown: 1` so it is not rewritten again), forwards the cookie / country / IP headers so the language matches the visitor,
and converts the HTML with a dependency-free converter.

Two things about this storefront's HTML that the converter handles (found by running it on the real pages):
- React streams Suspense boundaries: the product lists arrive after `</main>` in `<div hidden id="S:n">` and are swapped in by a script.
  `resolveSuspense()` does that swap (ids can be hex-like: `S:a`, and `P:n` slots), otherwise lists and menus are missing.
- The layout wraps header, content and footer in ONE `<main>`, so header / footer / aside are dropped explicitly.

## Checks
```
node apps/storefront/test-agent-discovery.mjs                       # unit checks (Node 22.18+ / 24)
node apps/storefront/test-mcp.mjs                                   # MCP protocol / tools / discovery documents (canned Medusa, bundles with the repo's esbuild)
sh apps/storefront/check-agent-discovery.sh https://portsaid.com.tr  # live endpoint checks (GET/HEAD only)
```

## Not done, on purpose
- **OAuth/OIDC discovery, OAuth protected-resource metadata, auth.md**: the site has a customer login (Medusa JWT), not an OAuth/OIDC server and no agent registration. Metadata for endpoints that do not exist would be false.
- **x402, MPP (agent payments, crypto / machine payments), UCP and ACP (agentic checkout)**: PORTSAID has no pay-per-call API and no agent checkout (prices are quotes, mostly unpriced; orders go through the quote / approval flow). A profile or OpenAPI payment extension would declare endpoints that do not exist, and x402 / MPP would mean receiving crypto / machine payments.
- **DNSSEC** for the DNS-AID records: a `.com.tr` needs a DS record at the registry (nic.tr). The records are published unsigned; the draft says SHOULD sign.
- **A2A agent card, OpenAPI file, ordering through MCP**: not offered. The MCP server is read-only; quotes and orders stay in the storefront's quote / approval flow.
- **Cloudflare "Markdown for Agents"** cannot be used (the site is not proxied by Cloudflare), hence the app-level implementation.
- `Vary: Accept` on the HTML responses: Next.js overrides it (a `next.config.js` `headers()` entry had no effect). The Markdown and
  redirect responses carry it. It only matters if a shared cache is ever put in front; then add `header Vary Accept` for the host in Caddy.

## Known unrelated issue seen on the way
Category pages set `alternates.canonical` to the bare handle (`"<handle>"`, no leading `/`), which resolves against `metadataBase`
to `https://portsaid.com.tr/<handle>` - a URL that does not exist. Left as is (not part of this change).
