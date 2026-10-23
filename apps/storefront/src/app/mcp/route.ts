import { CORS, handleMcp } from "@/lib/mcp/protocol"
import { clientKey, hit } from "@/lib/mcp/ratelimit"

// Public, read-only MCP server (catalogue search + company info). Streamable HTTP in its simplest valid form: every
// POST gets one JSON reply, there is no session and no server-initiated stream (so GET answers 405, as the spec allows).
// Not behind the locale/region middleware (see its matcher) and not cached.
export const dynamic = "force-dynamic"

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  })

export async function POST(req: Request) {
  const wait = hit(clientKey(req.headers))
  if (wait > 0) {
    return json(429, { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Rate limit exceeded, retry later" } }, { "Retry-After": String(wait) })
  }
  const declared = Number(req.headers.get("content-length") || 0)
  if (declared > 16 * 1024) return json(413, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } })

  const r = await handleMcp({ headers: req.headers, bodyText: await req.text() })
  return new Response(r.body, { status: r.status, headers: r.headers })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

const notAllowed = () =>
  json(
    405,
    { error: "This MCP server answers POST only (streamable HTTP, JSON responses, no sessions).", card: "/.well-known/mcp/server-card.json" },
    { Allow: "POST, OPTIONS" }
  )
export const GET = notAllowed
export const DELETE = notAllowed
