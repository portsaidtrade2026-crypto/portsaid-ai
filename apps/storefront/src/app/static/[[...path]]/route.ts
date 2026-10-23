import { proxyToBackend } from "@/lib/util/backend-proxy"

// Proxies image reads served by the local file provider's public URL
// (medusa-config.ts -> file-local's backend_url) through to the internal
// backend, the same way /app, /auth, and /admin already do for the Admin
// dashboard - needed because the Admin SPA renders these URLs directly in
// the visitor's browser (unlike the storefront, which rewrites them
// server-side via toStorefrontMediaUrl to /api/medusa-media/...).
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return proxyToBackend(request)
}
