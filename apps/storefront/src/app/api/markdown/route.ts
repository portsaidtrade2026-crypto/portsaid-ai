import { NextRequest } from "next/server"
import { estimateTokens, htmlToMarkdown } from "@/lib/agent-discovery/markdown"
import { getBaseURL } from "@/lib/util/env"

// Markdown for Agents. The middleware rewrites a GET with `Accept: text/markdown` on a public catalogue page to this
// route and passes the page path in the x-agent-md-path header (?p=<path> works too, for a direct call); this renders the
// same page as HTML (internally, over loopback) and converts it. Browsers never get here: HTML stays the default for
// every other Accept header.
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const target = request.headers.get("x-agent-md-path") || request.nextUrl.searchParams.get("p") || "/"
  const origin = `http://127.0.0.1:${process.env.PORT || 8000}`
  let url: URL
  try {
    url = new URL(target, origin)
  } catch {
    return new Response("Bad request", { status: 400 })
  }
  // same-site paths only, and never this route itself
  if (url.origin !== origin || target.startsWith("//") || url.pathname.startsWith("/api/")) {
    return new Response("Bad request", { status: 400 })
  }

  const headers: Record<string, string> = {
    accept: "text/html",
    "x-agent-markdown": "1", // tells the middleware not to rewrite this inner request again
  }
  // The UI language comes from the medusa_locale cookie, else from the visitor's country / IP (lib/i18n/server.ts); the inner
  // request is a loopback call, so hand over what that lookup reads or every agent would get the default language.
  for (const h of ["cookie", "accept-language", "x-forwarded-for", "x-real-ip", "cf-ipcountry", "x-vercel-ip-country"]) {
    const v = request.headers.get(h)
    if (v) headers[h] = v
  }
  const inner = await fetch(url, { headers, redirect: "manual", cache: "no-store" })

  if (inner.status >= 300 && inner.status < 400) {
    // the inner request saw the loopback origin: hand the client a path, not an internal URL
    const location = (inner.headers.get("location") || "/").replace(origin, "")
    return new Response(null, { status: inner.status, headers: { Location: location, Vary: "Accept" } })
  }
  const html = await inner.text()
  const { markdown } = htmlToMarkdown(html, getBaseURL())
  return new Response(markdown, {
    status: inner.status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(markdown)),
      Vary: "Accept, Cookie",
      "Cache-Control": "private, no-store",
    },
  })
}
