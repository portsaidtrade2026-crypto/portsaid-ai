import { TOPICS } from "./company"

// Static descriptions (name, text, JSON Schema) of the public MCP tools. Pure data with no server imports, so the browser
// (WebMCP registration) and the server (tools/list) both read the same single definition.

export type ToolSpec = {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: { readOnlyHint: true; destructiveHint: false; idempotentHint: true; openWorldHint: false }
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "search_products",
    title: "Search products",
    description:
      "Search the PORTSAID Plastik packaging catalogue (stretch film, bubble wrap, packing tape, machines, stationery…) by words in the product name, e.g. 'streç film 500 mm' or 'balonlu naylon'. Turkish accents are optional. Returns product names, handles and links; call get_product for specifications. Prices are not listed (quote-based).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to look for in the product name or category (Turkish or English product terms).", maxLength: 200 },
        category: { type: "string", description: "Optional category handle or name from list_categories to restrict the search.", maxLength: 100 },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 10, description: "Maximum number of results." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "get_product",
    title: "Get product details",
    description:
      "Details of one product by its handle (from search_products): title, categories, specifications (width, length, weight…), variants with SKU and unit, images and the web page URL. No price: PORTSAID quotes every order.",
    inputSchema: {
      type: "object",
      properties: { handle: { type: "string", description: "Product handle, exactly as returned by search_products.", maxLength: 200 } },
      required: ["handle"],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "list_categories",
    title: "List categories",
    description: "The catalogue's category tree with product counts and page links. Use a category handle as the 'category' filter of search_products.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: "get_company_info",
    title: "Company information",
    description:
      "Facts about PORTSAID Plastik (Beylikdüzü / Istanbul packaging distributor): what it sells, delivery area and lead times, payment terms, how to request a quote, contact details and opening hours.",
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", enum: [...TOPICS], description: "One topic; omit for everything." } },
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
]
