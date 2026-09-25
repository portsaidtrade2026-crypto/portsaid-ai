---
name: Medusa admin API behind preview
description: Keep the dashboard API client reachable when Medusa admin is opened through Replit's proxied preview.
---

When Medusa serves its admin and API from the same origin, configure the admin backend URL as `/` so the SDK resolves it against `window.location.origin`.

**Why:** A compiled absolute URL such as `http://127.0.0.1:9000` targets the remote visitor's own loopback, not the Replit workspace. The dashboard can then misreport a failed provider query as “Register an auth provider” even though the backend has a provider.

**How to apply:** Prefer the relative same-origin URL for an admin served by the same backend. Use an absolute backend URL only when the admin and API are intentionally hosted separately and that URL is reachable from users' browsers.