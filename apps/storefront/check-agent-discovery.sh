#!/bin/sh
# Live check of the agent-discovery endpoints (read-only GET/HEAD requests):
#   sh apps/storefront/check-agent-discovery.sh https://portsaid.com.tr
#   sh apps/storefront/check-agent-discovery.sh http://localhost:8000
# Exit code = number of failed checks.
BASE="${1:-https://portsaid.com.tr}"
BASE="${BASE%/}"
REGION="${2:-tr}"
FAIL=0
ok()  { echo "PASS $1"; }
bad() { echo "FAIL $1"; FAIL=$((FAIL + 1)); }
hdr() { curl -s -m 120 -D - -o /dev/null "$@" | tr -d '\r'; }
need() { # need <name> <headers> <regex>
  if printf '%s\n' "$2" | grep -iqE "$3"; then ok "$1"; else bad "$1  (wanted: $3)"; fi
}

H=$(hdr "$BASE/robots.txt")
need "robots.txt -> 200"                  "$H" '^HTTP/[0-9.]+ 200'
need "robots.txt is text/plain"           "$H" '^content-type: text/plain'
R=$(curl -s -m 60 "$BASE/robots.txt")
printf '%s\n' "$R" | grep -qi '^user-agent: \*' && ok "robots.txt has User-agent: *" || bad "robots.txt has User-agent: *"
printf '%s\n' "$R" | grep -qi '^disallow: /\*/checkout' && ok "robots.txt blocks checkout" || bad "robots.txt blocks checkout"
printf '%s\n' "$R" | grep -qiE '^sitemap: https?://[^ ]+/sitemap\.xml' && ok "robots.txt references the sitemap" || bad "robots.txt references the sitemap"
for A in OAI-SearchBot Claude-SearchBot PerplexityBot GPTBot ClaudeBot Google-Extended; do
  printf '%s\n' "$R" | grep -qi "^user-agent: $A\$" && ok "robots.txt has a group for $A" || bad "robots.txt has a group for $A"
done
printf '%s\n' "$R" | grep -qiE '^content-signal: .*ai-train=no' && ok "robots.txt declares Content-Signal (ai-train=no)" || bad "robots.txt declares Content-Signal"
# the training bots are shut out entirely, the search bots are not
printf '%s\n' "$R" | awk 'BEGIN{IGNORECASE=1} /^user-agent: GPTBot/{g=1} g&&/^disallow: \/$/{f=1} /^$/{g=0} END{exit !f}' && ok "GPTBot group disallows /" || bad "GPTBot group disallows /"

H=$(hdr "$BASE/sitemap.xml")
need "sitemap.xml -> 200"                 "$H" '^HTTP/[0-9.]+ 200'
need "sitemap.xml is xml"                 "$H" '^content-type: (application|text)/xml'
S=$(curl -s -m 300 "$BASE/sitemap.xml")
N=$(printf '%s' "$S" | grep -o '<loc>' | wc -l | tr -d ' ')
[ "$N" -ge 100 ] && ok "sitemap.xml lists $N URLs" || bad "sitemap.xml lists only $N URLs"
printf '%s' "$S" | grep -q "/$REGION/products/" && ok "sitemap.xml has product pages" || bad "sitemap.xml has product pages"
printf '%s' "$S" | grep -qE '/(checkout|cart|account)' && bad "sitemap.xml lists a private page" || ok "sitemap.xml lists no private page"

H=$(hdr "$BASE/")
need "/ redirect carries Link: sitemap"       "$H" '^link:.*rel="sitemap"'
H=$(hdr "$BASE/$REGION")
need "/$REGION -> 200"                        "$H" '^HTTP/[0-9.]+ 200'
need "/$REGION carries Link: sitemap"         "$H" '^link:.*rel="sitemap"'
need "/$REGION carries Link: api-catalog"     "$H" '^link:.*rel="api-catalog"'

H=$(hdr "$BASE/.well-known/api-catalog")
need "api-catalog -> 200 linkset+json"        "$H" '^content-type: application/linkset\+json'
C=$(curl -s -m 60 "$BASE/.well-known/api-catalog")
printf '%s' "$C" | grep -q '"linkset"' && ok "api-catalog has a linkset array" || bad "api-catalog has a linkset array"
printf '%s' "$C" | grep -q '"service-doc"' && ok "api-catalog has service-doc" || bad "api-catalog has service-doc"
printf '%s' "$C" | grep -q '"status"' && ok "api-catalog has status" || bad "api-catalog has status"

# a product path from the sitemap, requested on $BASE (the sitemap's own host is the public one, even when testing locally)
H=$(hdr "$BASE/.well-known/poppy.json")
need "poppy.json -> 200 json"                 "$H" '^content-type: application/json'
O=$(curl -s -m 60 "$BASE/.well-known/poppy.json")
printf '%s' "$O" | grep -q '"protocol_version"' && printf '%s' "$O" | grep -q '"domain"' && printf '%s' "$O" | grep -q '"web"' && ok "poppy.json has version, organization.domain and web" || bad "poppy.json has version, organization.domain and web"

PP=$(printf '%s' "$S" | grep -o "<loc>[^<]*/$REGION/products/[^<]*</loc>" | head -1 | sed 's/<[^>]*>//g; s#^https\{0,1\}://[^/]*##')
P="$BASE${PP:-/$REGION/store}"
H=$(hdr -H "Accept: text/markdown" "$P")
need "Accept: text/markdown -> 200"           "$H" '^HTTP/[0-9.]+ 200'
need "Accept: text/markdown -> text/markdown" "$H" '^content-type: text/markdown'
need "markdown has x-markdown-tokens"         "$H" '^x-markdown-tokens: [0-9]+'
need "markdown response varies on Accept"     "$H" '^vary:.*accept'
M=$(curl -s -m 120 -H "Accept: text/markdown" "$P")
printf '%s\n' "$M" | grep -qE '^# ' && ok "markdown body has a heading" || bad "markdown body has a heading"
printf '%s' "$M" | grep -qiE '<(div|span|script|html)' && bad "markdown body still has HTML tags" || ok "markdown body has no HTML tags"
H=$(hdr -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" "$P")
need "browser Accept still gets HTML"         "$H" '^content-type: text/html'
H=$(hdr "$P")
need "no Accept header still gets HTML"       "$H" '^content-type: text/html'
H=$(hdr -H "Accept: text/markdown" "$BASE/$REGION/cart")
need "private page ignores text/markdown"     "$H" '^content-type: text/html'

# ---- public read-only MCP server (/mcp) and the documents that advertise it
H=$(hdr "$BASE/mcp")
need "GET /mcp -> 405 (POST only)"            "$H" '^HTTP/[0-9.]+ 405'
need "GET /mcp advertises Allow: POST"        "$H" '^allow:.*POST'
H=$(hdr -X OPTIONS -H "Origin: https://example.com" "$BASE/mcp")
need "OPTIONS /mcp -> 204 with CORS"          "$H" '^HTTP/[0-9.]+ 204'
need "OPTIONS /mcp allows any origin"         "$H" '^access-control-allow-origin: \*'
mcp() { curl -s -m 120 -X POST "$BASE/mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' "$@"; }
META='"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"check","version":"1"},"io.modelcontextprotocol/clientCapabilities":{}}'
O=$(mcp -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"server/discover\",\"params\":{$META}}")
printf '%s' "$O" | grep -q '"resultType":"complete"' && printf '%s' "$O" | grep -q '"supportedVersions":\["2026-07-28"' && ok "server/discover answers with versions and capabilities" || bad "server/discover answers with versions and capabilities"
printf '%s' "$O" | grep -q 'tr.com.portsaid/catalog' && ok "server/discover names the server" || bad "server/discover names the server"
O=$(mcp -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"check","version":"1"}}}')
printf '%s' "$O" | grep -q '"protocolVersion":"2025-06-18"' && ok "legacy initialize handshake works" || bad "legacy initialize handshake works"
C=$(mcp -o /dev/null -w '%{http_code}' -d '{"jsonrpc":"2.0","method":"notifications/initialized"}')
[ "$C" = "202" ] && ok "notification -> 202" || bad "notification -> $C (wanted 202)"
O=$(mcp -w '\n%{http_code}' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2031-01-01"}}}')
printf '%s' "$O" | grep -q '"code":-32022' && printf '%s' "$O" | tail -1 | grep -q '^400$' && ok "unsupported protocol version -> 400 / -32022" || bad "unsupported protocol version -> 400 / -32022"
O=$(mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')
N=0; for T in search_products get_product list_categories get_company_info; do printf '%s' "$O" | grep -q "\"name\":\"$T\"" && N=$((N + 1)); done
[ "$N" = "4" ] && ok "tools/list has the 4 tools" || bad "tools/list has $N of the 4 tools"
printf '%s' "$O" | grep -q '"readOnlyHint":true' && ok "tools are annotated read-only" || bad "tools are annotated read-only"
O=$(mcp -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_products","arguments":{"query":"strec film","limit":3}}}')
printf '%s' "$O" | grep -q '"isError":false' && printf '%s' "$O" | grep -q "/$REGION/products/" && ok "search_products finds products with page links" || bad "search_products finds products with page links"
O=$(mcp -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_products","arguments":{"query":"balonlu naylon","limit":10}}}')
# an ASCII-only handle, so the check does not depend on the shell passing UTF-8 through
HANDLE=$(printf '%s' "$O" | grep -o '"structuredContent".*' | grep -o '"handle":"[A-Za-z0-9-]*"' | head -1 | sed 's/^"handle":"//; s/"$//')
if [ -n "$HANDLE" ]; then
  O=$(mcp -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"get_product\",\"arguments\":{\"handle\":\"$HANDLE\"}}}")
  printf '%s' "$O" | grep -q '"isError":false' && printf '%s' "$O" | grep -q '"variants"' && ok "get_product returns details for a found handle" || bad "get_product returns details for a found handle"
else
  bad "get_product (no handle found in the search result)"
fi
O=$(mcp -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"list_categories","arguments":{}}}')
printf '%s' "$O" | grep -q '"isError":false' && printf '%s' "$O" | grep -q '"product_count"' && ok "list_categories returns the tree" || bad "list_categories returns the tree"
O=$(mcp -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_company_info","arguments":{}}}')
printf '%s' "$O" | grep -q 'info@portsaid.com.tr' && ok "get_company_info returns contact details" || bad "get_company_info returns contact details"
printf '%s' "$O" | grep -qE '[0-9] ?(TL|₺)' && bad "get_company_info exposes a price" || ok "get_company_info exposes no price"

for U in /.well-known/mcp/server-card.json /mcp/server-card; do
  H=$(hdr "$BASE$U")
  need "$U -> 200 json"                     "$H" '^content-type: application/json'
  need "$U allows any origin"               "$H" '^access-control-allow-origin: \*'
done
O=$(curl -s -m 60 "$BASE/.well-known/mcp/server-card.json")
printf '%s' "$O" | grep -q 'server-card.schema.json' && printf '%s' "$O" | grep -q '"streamable-http"' && printf '%s' "$O" | grep -q '/mcp"' && ok "server card declares the streamable-http remote /mcp" || bad "server card declares the streamable-http remote /mcp"

for U in /.well-known/ard.json /.well-known/ai-catalog.json; do
  H=$(hdr "$BASE$U")
  need "$U -> 200 json"                     "$H" '^content-type: application/json'
done
O=$(curl -s -m 60 "$BASE/.well-known/ard.json")
printf '%s' "$O" | grep -q '"specVersion"' && printf '%s' "$O" | grep -q '"host"' && printf '%s' "$O" | grep -q 'urn:air:' && printf '%s' "$O" | grep -q 'application/mcp-server-card+json' && ok "ard.json has specVersion, host and urn:air entries" || bad "ard.json has specVersion, host and urn:air entries"
printf '%s' "$O" | grep -q 'representativeQueries' && ok "ard.json entries carry representativeQueries" || bad "ard.json entries carry representativeQueries"

I=$(curl -s -m 60 "$BASE/.well-known/agent-skills/index.json")
printf '%s' "$I" | grep -q 'agentskills.io/discovery/0.2.0/schema.json' && ok "agent-skills index has the v0.2.0 \$schema" || bad "agent-skills index has the v0.2.0 \$schema"
DIG=$(printf '%s' "$I" | grep -o '"digest": *"sha256:[0-9a-f]*"' | head -1 | sed 's/.*sha256://; s/"//')
SKILL=$(printf '%s' "$I" | grep -o '"url": *"[^"]*SKILL.md"' | head -1 | sed 's/.*: *"//; s/"$//')
H=$(hdr "$BASE$SKILL")
need "SKILL.md -> 200 text/markdown"          "$H" '^content-type: text/markdown'
REAL=$(curl -s -m 60 "$BASE$SKILL" | { sha256sum 2>/dev/null || shasum -a 256; } | cut -d' ' -f1)
[ -n "$DIG" ] && [ "$DIG" = "$REAL" ] && ok "index digest equals sha256 of the served SKILL.md" || bad "index digest ($DIG) differs from the served SKILL.md ($REAL)"

H=$(curl -s -m 120 -D - -o /dev/null "$BASE/$REGION" | tr -d '\r')
need "/$REGION carries Link: ard"             "$H" '^link:.*rel="ard"'

echo; echo "$FAIL failed"
exit "$FAIL"
