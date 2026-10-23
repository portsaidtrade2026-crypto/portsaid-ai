import { getBaseURL } from "@/lib/util/env"

// /robots.txt (RFC 9309) with AI-crawler groups and Content Signals (contentsignals.org).
//
// POLICY (2026-10-21, a default Ahmed can change in this file):
//   - AI SEARCH / ASSISTANT crawlers are allowed: they fetch the pages AI answers are built from, so blocking them
//     means PORTSAID does not show up when a buyer asks an AI assistant for packaging suppliers.
//   - AI TRAINING crawlers are blocked: they only collect model-training data and do not affect appearing in answers.
// A crawler that has its own group ignores the "*" group, so every group repeats the private-path rules.
export const dynamic = "force-static"

const PRIVATE = [
  "/*/checkout",
  "/*/cart",
  "/*/account",
  "/*/order/",
  "/app",
  "/auth",
  "/admin",
  "/api/",
  "/*?*sortBy=",
  "/*?*q=",
]

// crawl for AI search results and on behalf of a user's request
const SEARCH_AGENTS = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "ChatGPT-User", "Claude-User", "Perplexity-User"]
// collect training data
const TRAINING_AGENTS = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "Applebot-Extended"]

const group = (agents: string[], lines: string[]) => [...agents.map((a) => `User-agent: ${a}`), ...lines, ""].join("\n")

export function GET() {
  const base = getBaseURL().replace(/\/$/, "")
  const open = ["Allow: /", ...PRIVATE.map((p) => `Disallow: ${p}`)]
  const body = [
    "# PORTSAID robots.txt",
    group(["*"], ["Content-Signal: search=yes, ai-input=yes, ai-train=no", ...open]),
    "# AI search and assistant crawlers: allowed",
    group(SEARCH_AGENTS, ["Content-Signal: search=yes, ai-input=yes, ai-train=no", ...open]),
    "# AI training crawlers: not allowed",
    group(TRAINING_AGENTS, ["Content-Signal: search=no, ai-input=no, ai-train=no", "Disallow: /"]),
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n")
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  })
}
