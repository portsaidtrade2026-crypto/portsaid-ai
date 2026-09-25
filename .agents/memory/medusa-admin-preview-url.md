---
name: Medusa admin API behind preview
description: Keep the dashboard API client reachable when Medusa admin is opened through Replit's proxied preview.
---

When Medusa serves its admin and API from the same origin, configure the admin backend URL as `/` so the SDK resolves it against `window.location.origin`.

**Why:** A compiled absolute URL such as `http://127.0.0.1:9000` targets the remote visitor's own loopback, not the Replit workspace. The dashboard can then misreport a failed provider query as “Register an auth provider” even though the backend has a provider.

**How to apply:** Prefer the relative same-origin URL for an admin served by the same backend. Use an absolute backend URL only when the admin and API are intentionally hosted separately and that URL is reachable from users' browsers.

For local media, the file provider can emit backend-loopback URLs such as `http://localhost:9000/static/...`. Convert those to root-relative paths only in Admin API responses: the Admin shares the backend origin, but the Next.js Storefront is a different origin and would resolve `/static/...` against itself. Keep `/store` responses untouched unless the Storefront also proxies `/static` or receives a browser-reachable absolute URL. Since the built backend starts from `.medusa/server`, media routes must account for files in both the source project's `static` directory and the built server's `static` directory.

**Why:** A relative URL is only same-origin with the page consuming it; the same path has different destinations in the Admin and Storefront.

**How to apply:** Scope relative media rewriting to Admin. For other clients, provide a reachable backend URL or proxy the media path through that client's origin.