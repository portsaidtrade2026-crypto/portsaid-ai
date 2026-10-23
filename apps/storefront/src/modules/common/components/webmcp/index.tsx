"use client"

import { useEffect } from "react"
import { TOOL_SPECS } from "@/lib/mcp/tool-defs"

// WebMCP (document.modelContext): offers the same four read-only catalogue tools as the public /mcp server to an AI agent
// running in the visitor's browser. Each tool just forwards to /mcp (same origin), so there is one implementation, no
// access to the visitor's cart or account, and nothing can be changed from here. Browsers without WebMCP do nothing.

type Registration = { unregister?: () => void } | (() => void) | void
type ModelContext = { registerTool?: (tool: Record<string, unknown>) => Registration }

async function callMcp(name: string, args: unknown) {
  const res = await fetch("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args ?? {} } }),
  })
  const body = await res.json().catch(() => null)
  if (body?.result) return body.result
  return { content: [{ type: "text", text: body?.error?.message || "The catalogue is temporarily unavailable." }], isError: true }
}

const WebMcp = () => {
  useEffect(() => {
    const ctx: ModelContext | undefined =
      (document as unknown as { modelContext?: ModelContext }).modelContext ??
      (navigator as unknown as { modelContext?: ModelContext }).modelContext
    if (typeof ctx?.registerTool !== "function") return

    const registrations: Registration[] = []
    for (const spec of TOOL_SPECS) {
      try {
        registrations.push(
          ctx.registerTool({
            name: spec.name,
            description: spec.description,
            inputSchema: spec.inputSchema,
            annotations: { readOnlyHint: true },
            execute: (args: unknown) => callMcp(spec.name, args),
          })
        )
      } catch {
        // already registered (e.g. a remount) or refused by the browser: the other tools can still be offered
      }
    }
    return () => {
      for (const r of registrations) {
        try {
          if (typeof r === "function") r()
          else r?.unregister?.()
        } catch {}
      }
    }
  }, [])
  return null
}

export default WebMcp
