import { jsonResponse, serverCard } from "@/lib/mcp/discovery"

// MCP Server Card of the public catalogue server (also served at /mcp/server-card).
export const dynamic = "force-static"

export const GET = () => jsonResponse(serverCard())
export const OPTIONS = () => new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "Content-Type, If-None-Match" } })
