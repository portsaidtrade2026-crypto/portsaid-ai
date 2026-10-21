import { companyInfo } from "./company"
import { getProduct, listCategories, resolveHandle, searchProducts } from "./catalog"
import { TOOL_SPECS, type ToolSpec } from "./tool-defs"

// The four read-only tools of the public PORTSAID catalogue MCP server (descriptions live in tool-defs.ts). A tool never
// changes anything and never touches customer data, orders, carts or prices; a handler returns plain JSON that the
// protocol layer wraps into a result.

export type ToolDef = ToolSpec & { handler: (args: Record<string, unknown>) => Promise<unknown> }

/** Raised for caller mistakes (bad arguments, unknown product): shown to the model as a tool error, not a protocol error. */
export class ToolError extends Error {}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined

const HANDLERS: Record<string, ToolDef["handler"]> = {
  async search_products(a) {
    const query = str(a.query, 200)
    if (!query) throw new ToolError("'query' is required (a few words of the product name).")
    const limit = Math.min(20, Math.max(1, Number.isFinite(Number(a.limit)) ? Math.floor(Number(a.limit)) : 10))
    return searchProducts(query, str(a.category, 100), limit)
  },
  async get_product(a) {
    const handle = str(a.handle, 200)
    if (!handle) throw new ToolError("'handle' is required (use search_products first).")
    const p = await getProduct(await resolveHandle(handle))
    if (!p) throw new ToolError(`No product with handle '${handle}'. Use search_products to find the right handle.`)
    return p
  },
  async list_categories() {
    return listCategories()
  },
  async get_company_info(a) {
    return companyInfo(str(a.topic, 30))
  },
}

export const TOOLS: ToolDef[] = TOOL_SPECS.map((s) => ({ ...s, handler: HANDLERS[s.name] }))

export const toolByName = (name: string) => TOOLS.find((t) => t.name === name)

export const publicTool = ({ handler: _h, ...rest }: ToolDef): ToolSpec => rest
