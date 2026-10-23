import { skillMarkdown } from "@/lib/mcp/discovery"

export const dynamic = "force-static"

export const GET = () =>
  new Response(skillMarkdown(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
  })
