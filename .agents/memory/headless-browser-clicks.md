---
name: Headless browser clicks
description: CDP click behavior that caused a false login test timeout
---

When driving the browser through DevTools Protocol mouse events, scroll the target into the viewport before calculating click coordinates.

**Why:** A visible form button can sit below the viewport. Sending a mouse event at its offscreen coordinates silently does nothing; a login test then times out without any authentication request, even though the app is working.

**How to apply:** For custom CDP click helpers, scroll first, compute coordinates afterward, and only then dispatch press and release. Distinguish a missing HTTP request from an authentication failure when debugging a test timeout.