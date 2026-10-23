import { publicTool, TOOLS, toolByName, ToolError } from "./tools"

// Dependency-free Streamable-HTTP MCP handler (JSON responses only, no sessions, no server-initiated messages), so it can
// run as a plain Next.js route handler. It speaks both protocol eras on the same endpoint:
//   - 2026-07-28 "stateless": every request carries the protocol version in params._meta, `server/discover` is mandatory;
//   - the earlier `initialize` handshake (2025-03-26 .. 2025-11-25), answered without keeping any session state.
// Both eras are served by the same stateless code, which is why the one list of supported versions applies to both.

export const MODERN = "2026-07-28"
export const SUPPORTED = [MODERN, "2025-11-25", "2025-06-18", "2025-03-26"]
export const SERVER_INFO = {
  name: "tr.com.portsaid/catalog",
  title: "PORTSAID Plastik Catalogue",
  version: "1.0.0",
} as const
export const INSTRUCTIONS =
  "Read-only catalogue of PORTSAID Plastik, an Istanbul packaging distributor. Use search_products to find products by name, get_product for specifications, list_categories to browse, get_company_info for delivery, payment and contact details. Prices are not published: every order is quoted by the sales team (see get_company_info topic=quote). Product names are in Turkish."

const META = "io.modelcontextprotocol/"
const MAX_BODY = 16 * 1024
const MAX_TEXT = 60_000

export const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "Retry-After",
  "Access-Control-Max-Age": "86400",
}

export type McpResponse = { status: number; headers: Record<string, string>; body: string | null }

type Id = string | number | null
const rpcError = (id: Id, code: number, message: string, data?: unknown) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message, ...(data === undefined ? {} : { data }) },
})
const out = (status: number, payload: unknown, extra: Record<string, string> = {}): McpResponse => ({
  status,
  headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  body: payload === null ? null : JSON.stringify(payload),
})

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v)

export async function handleMcp(input: { headers: Headers; bodyText: string }): Promise<McpResponse> {
  const { headers, bodyText } = input
  if (bodyText.length > MAX_BODY) return out(413, rpcError(null, -32600, "Request too large"))

  let msg: unknown
  try {
    msg = JSON.parse(bodyText)
  } catch {
    return out(400, rpcError(null, -32700, "Parse error: body must be a single JSON-RPC message"))
  }
  if (Array.isArray(msg)) return out(400, rpcError(null, -32600, "JSON-RPC batching is not supported"))
  if (!isObj(msg) || typeof msg.method !== "string") {
    // a response from the client to something we never sent, or garbage: nothing to do for the former
    if (isObj(msg) && ("result" in msg || "error" in msg)) return out(202, null)
    return out(400, rpcError(null, -32600, "Invalid Request"))
  }
  if (!("id" in msg)) return out(202, null) // notification (initialized, cancelled, ...): accepted, no reply

  const id: Id = msg.id ?? null
  const method: string = msg.method
  const params = isObj(msg.params) ? msg.params : {}
  const meta = isObj(params._meta) ? params._meta : {}
  const requested = meta[META + "protocolVersion"]
  const modern = typeof requested === "string"

  if (modern) {
    if (!SUPPORTED.includes(requested)) {
      return out(400, rpcError(id, -32022, "Unsupported protocol version", { supported: SUPPORTED, requested }))
    }
    const mismatch = (name: string, header: string | null, expected: unknown) =>
      header !== null && header !== expected ? rpcError(id, -32020, `Header ${name} does not match the request body`, { header: name }) : null
    const bad =
      mismatch("MCP-Protocol-Version", headers.get("mcp-protocol-version"), requested) ||
      mismatch("Mcp-Method", headers.get("mcp-method"), method) ||
      (method === "tools/call" ? mismatch("Mcp-Name", headers.get("mcp-name"), params.name) : null)
    if (bad) return out(400, bad)
  }
  const done = <T extends Record<string, unknown>>(result: T) =>
    out(200, { jsonrpc: "2.0", id, result: modern ? { resultType: "complete", ...result } : result })

  switch (method) {
    case "server/discover":
      return done({
        supportedVersions: SUPPORTED,
        capabilities: { tools: {} },
        _meta: { [META + "serverInfo"]: SERVER_INFO },
        instructions: INSTRUCTIONS,
        ttlMs: 3_600_000,
        cacheScope: "public",
      })

    case "initialize": {
      const want = params.protocolVersion
      return done({
        protocolVersion: typeof want === "string" && SUPPORTED.includes(want) ? want : SUPPORTED[1],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      })
    }

    case "ping":
      return done({})

    case "tools/list":
      return done({ tools: TOOLS.map(publicTool), ...(modern ? { ttlMs: 3_600_000, cacheScope: "public" } : {}) })

    case "tools/call": {
      const tool = typeof params.name === "string" ? toolByName(params.name) : undefined
      if (!tool) return out(200, rpcError(id, -32602, `Unknown tool: ${String(params.name).slice(0, 80)}`))
      const args = isObj(params.arguments) ? params.arguments : {}
      try {
        const data = await tool.handler(args)
        const text = JSON.stringify(data, null, 2)
        return done({
          content: [{ type: "text", text: text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + "\n…(truncated)" : text }],
          structuredContent: data,
          isError: false,
        })
      } catch (e) {
        if (!(e instanceof ToolError)) console.error(`mcp tool ${tool.name} failed`, e)
        const message = e instanceof ToolError ? e.message : "The catalogue is temporarily unavailable. Please try again in a moment."
        return done({ content: [{ type: "text", text: message }], isError: true })
      }
    }

    default:
      return out(modern ? 404 : 200, rpcError(id, -32601, `Method not found: ${method.slice(0, 80)}`))
  }
}
