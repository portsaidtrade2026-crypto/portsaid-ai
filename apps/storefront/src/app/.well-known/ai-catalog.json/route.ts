import { ardManifest, jsonResponse } from "@/lib/mcp/discovery"

// ARD (Agentic Resource Discovery) manifest: what an agent can use on this site. /.well-known/ard.json is the current
// path, /.well-known/ai-catalog.json the predecessor path (same document).
export const dynamic = "force-static"

export const GET = () => jsonResponse(ardManifest())
