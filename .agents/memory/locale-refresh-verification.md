---
name: Locale refresh verification
description: Avoid false positives and timing failures when testing client-side locale changes with Next.js server rendering
---

A client language switch can update the document language and client-rendered labels before Next.js finishes refreshing server-rendered content. Treat that interval as an in-progress transition, not as proof that the completed page is consistent.

**Why:** A browser check that waited only for the language selector and navigation text saw a mixed-language page immediately after switching from Turkish to Arabic. Waiting for the rest of the interface to settle distinguished a pending refresh from persistent untranslated copy. The `router.refresh()` call does not return a completion promise.

**How to apply:** For language-switch regressions, assert no document reload separately, then wait until representative server-rendered labels match the new locale and foreign-language UI copy is absent. After a real reload, verify persistence again. Do not exempt product names or other business data by assuming they are interface strings.