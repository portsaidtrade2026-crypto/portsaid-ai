import { createHash } from "node:crypto"
import { getBaseURL } from "@/lib/util/env"
import { SERVER_INFO, SUPPORTED } from "./protocol"

// The machine-readable descriptions of the public catalogue MCP server. Each of them only advertises something that
// exists: the MCP endpoint (app/mcp), and the one skill file below.

const base = () => getBaseURL().replace(/\/$/, "")

export const SERVER_DESCRIPTION = "Read-only catalogue search and company info of PORTSAID Plastik, an Istanbul packaging distributor."

/** MCP Server Card (https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json). */
export function serverCard() {
  return {
    $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
    name: SERVER_INFO.name,
    title: SERVER_INFO.title,
    description: SERVER_DESCRIPTION,
    version: SERVER_INFO.version,
    websiteUrl: base(),
    icons: [{ src: `${base()}/portsaid-logo.png`, mimeType: "image/png" }],
    remotes: [{ type: "streamable-http", url: `${base()}/mcp`, supportedProtocolVersions: SUPPORTED }],
  }
}

/** ARD / AI Catalog manifest, served at /.well-known/ard.json and (predecessor path) /.well-known/ai-catalog.json. */
export function ardManifest() {
  const host = new URL(base()).hostname
  return {
    specVersion: "1.0",
    host: { displayName: "PORTSAID Plastik", identifier: `did:web:${host}` },
    entries: [
      {
        identifier: `urn:air:${host}:mcp:catalog`,
        displayName: SERVER_INFO.title,
        type: "application/mcp-server-card+json",
        url: `${base()}/.well-known/mcp/server-card.json`,
        description: SERVER_DESCRIPTION,
        capabilities: ["search_products", "get_product", "list_categories", "get_company_info"],
        representativeQueries: [
          "find stretch film for pallet wrapping in Istanbul",
          "streç film ve balonlu naylon toptan tedarikçisi",
          "does this supplier sell packing tape and what are the delivery times",
          "wholesale packaging materials supplier in Beylikdüzü",
        ],
      },
      {
        identifier: `urn:air:${host}:skill:portsaid-catalog`,
        displayName: "PORTSAID catalogue skill",
        type: "application/agent-skills+md",
        url: `${base()}/.well-known/agent-skills/portsaid-catalog/SKILL.md`,
        description: "How to look up PORTSAID Plastik products and company information with its public MCP server.",
        representativeQueries: [
          "how do I look up packaging products from PORTSAID",
          "how can I request a quote from a Turkish packaging distributor",
        ],
      },
    ],
  }
}

export const SKILL_NAME = "portsaid-catalog"

export function skillMarkdown(): string {
  const site = base()
  return `---
name: ${SKILL_NAME}
description: Look up PORTSAID Plastik packaging products (stretch film, bubble wrap, packing tape, machines, stationery) and company information through its public read-only MCP server. Use when a user asks about this supplier's products, specifications, delivery, payment terms or how to get a quote.
---

# PORTSAID catalogue

PORTSAID Plastik is a B2B packaging distributor in Beylikdüzü, Istanbul. Its catalogue (about 1,800 products, names in Turkish)
is available through a public, read-only MCP server. No sign-in is needed.

- MCP endpoint (streamable HTTP, JSON responses): ${site}/mcp
- Server Card: ${site}/.well-known/mcp/server-card.json

## Tools

| Tool | Use it to |
| --- | --- |
| \`search_products\` | Find products by words of the name (accents optional), optionally within one category. |
| \`get_product\` | Get specifications, SKUs, units, images and the web page of one product (by its handle). |
| \`list_categories\` | Browse the category tree with product counts. |
| \`get_company_info\` | Delivery area and lead times, payment terms, how to request a quote, contact details, opening hours. |

## How to use it

1. Search with the product words, for example \`streç film\`, \`balonlu naylon\`, \`koli bandı\`. Turkish terms work best.
2. Open the best matches with \`get_product\` using the \`handle\` from the search result.
3. Answer questions about delivery, payment or contact with \`get_company_info\` (topics: about, products, delivery, payment, quote, contact).

## Things to know

- **Prices are not published.** Every order is quoted by the sales team. Never invent a price; point the user to the quote process
  (\`get_company_info\` with \`topic: "quote"\`) or to the contact details.
- Delivery is made to the European side of Istanbul; other locations are confirmed after the order.
- The server is read-only: it cannot place orders, create quotes or access customer accounts.
- Product pages for people are at ${site}/tr/products/<handle>.
`
}

export const skillDigest = () => "sha256:" + createHash("sha256").update(skillMarkdown(), "utf8").digest("hex")

/** Agent Skills discovery index (RFC v0.2.0). */
export function skillsIndex() {
  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: SKILL_NAME,
        type: "skill-md",
        description: "Look up PORTSAID Plastik packaging products and company information through its public read-only MCP server.",
        url: `/.well-known/agent-skills/${SKILL_NAME}/SKILL.md`,
        digest: skillDigest(),
      },
    ],
  }
}

const CORS = { "Access-Control-Allow-Origin": "*" }

export function jsonResponse(body: unknown, contentType = "application/json", maxAge = 3600): Response {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": contentType, "Cache-Control": `public, max-age=${maxAge}`, ...CORS },
  })
}
