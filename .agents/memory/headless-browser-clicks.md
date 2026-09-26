---
name: Headless browser clicks
description: CDP click behavior that caused a false login test timeout
---

When driving the browser through DevTools Protocol, select a target with `type: "page"` rather than assuming the first debugger target is the tab. For mouse events, scroll the target into the viewport before calculating click coordinates. If a card pointer click still does not navigate, check the hit target and trigger its anchor directly before diagnosing a broken route.

**Why:** A visible form button can sit below the viewport, so offscreen mouse events silently do nothing. A category-card pointer attempt and an unfiltered debugger-target retry also timed out even though clicking the anchor in the actual page tab reached a healthy product route.

**How to apply:** For custom CDP helpers, filter the debugger target, confirm the expected page and link exist, then scroll and calculate coordinates. Record whether navigation or any HTTP request occurred; use an anchor click as a controlled fallback. Distinguish a test-harness miss from an application failure.