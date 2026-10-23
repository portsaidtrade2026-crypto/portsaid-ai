import { jsonResponse, serverCard } from "@/lib/mcp/discovery"

// Same Server Card as /.well-known/mcp/server-card.json, at the path the spec defines relative to the MCP endpoint.
export const dynamic = "force-static"

export const GET = () => jsonResponse(serverCard())
export const OPTIONS = () => new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "Content-Type, If-None-Match" } })
