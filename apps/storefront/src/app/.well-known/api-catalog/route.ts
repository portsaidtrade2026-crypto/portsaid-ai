import { getBaseURL } from "@/lib/util/env"

// RFC 9727 API catalogue (linkset, RFC 9264). The only public API is the Medusa Store API the storefront itself uses
// (catalogue, regions, carts, quote requests); it needs the publishable key header and has no per-agent access.
export const dynamic = "force-static"

export function GET() {
  const base = getBaseURL().replace(/\/$/, "")
  const store = process.env.AGENT_STORE_API_URL || "https://admin.portsaid.com.tr/store"
  const body = {
    linkset: [
      {
        anchor: `${base}/.well-known/api-catalog`,
        item: [{ href: store, type: "application/json", title: "PORTSAID storefront (Medusa Store API)" }],
      },
      {
        anchor: store,
        "service-doc": [{ href: "https://docs.medusajs.com/api/store", type: "text/html", title: "Medusa Store API reference" }],
        // liveness of the same backend (GET /health -> 200). There is no OpenAPI file of our own, so no service-desc.
        status: [{ href: new URL("/health", store).toString(), title: "Backend health" }],
      },
    ],
  }
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
      "Cache-Control": "public, max-age=3600",
    },
  })
}
