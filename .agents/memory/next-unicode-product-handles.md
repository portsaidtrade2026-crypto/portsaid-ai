---
name: Next.js Unicode product handles
description: Prevent percent-escaped non-ASCII product handles from being double-encoded in Medusa Store API queries.
---

In this Storefront, a percent-escaped non-ASCII product handle reached the product route as escaped text. Passing it directly to the Medusa SDK encoded the percent signs again, so an existing, published product looked missing.

**Why:** A Turkish catalog product returned no Store API match and showed “Page not found” until its route handle was decoded once; then the query returned the product and its image loaded.

**How to apply:** Decode route handles once, defensively, before passing them to Medusa. Verify with a real non-ASCII handle; an ASCII-only smoke test will not catch this case.