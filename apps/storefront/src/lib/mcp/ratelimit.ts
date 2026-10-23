// Tiny in-memory fixed-window limiter for the public MCP endpoint (one storefront process; resets on restart, which is
// fine for abuse protection). Keyed by client IP as set by the reverse proxy.

const WINDOW_MS = 60_000
const LIMIT = 60
const buckets = new Map<string, { start: number; n: number }>()

export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return fwd || headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown"
}

/** Returns 0 when allowed, otherwise the seconds to wait. */
export function hit(key: string, now = Date.now()): number {
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (now - b.start > WINDOW_MS) buckets.delete(k)
    })
  }
  const b = buckets.get(key)
  if (!b || now - b.start >= WINDOW_MS) {
    buckets.set(key, { start: now, n: 1 })
    return 0
  }
  if (b.n >= LIMIT) return Math.max(1, Math.ceil((b.start + WINDOW_MS - now) / 1000))
  b.n++
  return 0
}

export const RATE_LIMIT_PER_MINUTE = LIMIT
