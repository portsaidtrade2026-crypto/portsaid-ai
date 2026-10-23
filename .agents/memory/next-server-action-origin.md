---
name: Replit Next.js Server Actions proxy
description: Origin validation mismatch for Next.js Server Actions behind the development preview proxy
---

The Replit development preview can forward a Server Action request with an Origin ending in `:5000` while `x-forwarded-host` contains the same development domain without the port. Next.js rejects this as `Invalid Server Actions request` before the action executes.

**Why:** A real company registration form POST returned 500 while the backend saw no registration request. The storefront server log identified the forwarded-host/Origin mismatch; browser logs also showed the rejected action. The browser's error message alone was less diagnostic.

**How to apply:** For Next.js development actions behind the preview, allowlist the current development domain **with** port 5000 in `serverActions.allowedOrigins`; do not use an unrestricted wildcard or assume a form handler bug before checking server logs. This is a development proxy issue, not a reason to weaken production CSRF checks.