import { proxyToBackend } from "@/lib/util/backend-proxy"

// Proxies Medusa's admin API (everything the Admin dashboard's browser-side
// code calls directly, e.g. /admin/products) through to the internal
// backend - see lib/util/backend-proxy.ts.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return proxyToBackend(request)
}
export async function POST(request: Request) {
  return proxyToBackend(request)
}
export async function PUT(request: Request) {
  return proxyToBackend(request)
}
export async function PATCH(request: Request) {
  return proxyToBackend(request)
}
export async function DELETE(request: Request) {
  return proxyToBackend(request)
}
export async function OPTIONS(request: Request) {
  return proxyToBackend(request)
}
