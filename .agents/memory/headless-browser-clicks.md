---
name: Headless browser clicks
description: CDP click behavior that caused a false login test timeout
---

When driving the browser through DevTools Protocol, select a target with `type: "page"` rather than assuming the first debugger target is the tab. For mouse events, scroll the target into the viewport, then choose coordinates that actually fall inside it and confirm the hit target with `elementFromPoint`. If a card pointer click still does not navigate, trigger its anchor directly before diagnosing a broken route.

**Why:** A form button below the viewport silently ignores offscreen mouse events. Even after scrolling, a tall product card can extend beyond both viewport edges, so a fixed offset from its top can remain offscreen; sampling a visible point successfully clicked the same card. A category-card pointer attempt and an unfiltered debugger-target retry also timed out even though clicking the anchor in the actual page tab reached a healthy product route.

**How to apply:** For custom CDP helpers, filter the debugger target, confirm the expected page and link exist, scroll, and choose a point inside the visible intersection of the target and viewport. Check `elementFromPoint` resolves to the intended link. Record whether navigation or any HTTP request occurred; use an anchor click as a controlled fallback. Distinguish a test-harness miss from an application failure.