---
name: Medusa revocation middleware matching
description: Non-obvious middleware behavior discovered while enforcing JWT revocation across built-in store routes
---

For request-wide Medusa bearer-token checks, verify the middleware against a built-in protected route, not only a custom route. A regular-expression matcher appeared in the compiled middleware configuration but did not block a revoked token on the built-in customer route; string namespace wildcard matchers did.

**Why:** The first integration run showed that the revoke endpoint wrote the hash and returned successfully, but a protected customer request still returned 200. A database row alone is not evidence that request middleware is executing.

**How to apply:** Test the actual old-token replay on a built-in authenticated endpoint. For an idempotent revoke-path exception, compare the original request URL rather than mount-relative path; Express strips the matched namespace from the latter. A lost logout response must be safe to retry.