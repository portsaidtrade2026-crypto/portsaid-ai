import { proxyToBackend } from "@/lib/util/backend-proxy"

// Proxies the Medusa Admin dashboard (SPA shell + its JS/CSS/asset files)
// through to the internal backend - see lib/util/backend-proxy.ts.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return proxyToBackend(request)
}
