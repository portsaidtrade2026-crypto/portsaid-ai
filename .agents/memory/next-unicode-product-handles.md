---
name: Next.js Unicode catalog handles
description: Prevent percent-escaped non-ASCII product and category handles from producing false 404s.
---

In this Storefront, percent-escaped non-ASCII handles can reach product and category routes as escaped text. Passing one directly to the Medusa SDK encodes the percent signs again; comparing one directly to a raw category handle also fails.

**Why:** A Turkish catalog product returned no Store API match until its route handle was decoded once. Turkish category URLs also returned 404 while ASCII category URLs worked; decoding before both the API lookup and in-memory handle comparison resolved them.

**How to apply:** Decode route handle segments once, defensively, before passing them to Medusa or comparing them with Medusa handles. Verify with a real non-ASCII handle; an ASCII-only smoke test will not catch this case.