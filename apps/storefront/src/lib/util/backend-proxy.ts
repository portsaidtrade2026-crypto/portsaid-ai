// Generic reverse proxy from the public Storefront to the internal Medusa
// backend (127.0.0.1:9000 in production - not otherwise publicly reachable,
// see .agents/memory/replit-private-service-ports.md). Used by the /app,
// /auth, and /admin route handlers so Ahmed can reach the Medusa Admin
// dashboard through the same published domain as the storefront, the same
// way /replit-storage/:key already proxies image reads.
//
// Forwards method, headers (including cookies/authorization) and body
// as-is, and streams the backend's response straight back - the admin SPA,
// its assets, and its API calls all need this, not just GET/JSON like the
// image route.
const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"

// Hop-by-hop headers a proxy must not forward verbatim (fetch/undici also
// rejects setting some of these directly).
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
])
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "connection",
  "transfer-encoding",
])

export async function proxyToBackend(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const target = `${BACKEND_URL}${url.pathname}${url.search}`

  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  const hasBody = !["GET", "HEAD"].includes(request.method)

  const backendResponse = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  })

  const responseHeaders = new Headers()
  backendResponse.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.append(key, value)
    }
  })

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  })
}
