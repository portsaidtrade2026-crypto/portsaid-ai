---
name: Embedded preview locale cookies
description: Why a language switch can work in a standalone tab but fail inside the Replit preview
---

Test cookie-backed storefront behavior inside a cross-site iframe, not only in a top-level browser tab. A SameSite=Lax preference can be written by the iframe but omitted from subsequent iframe requests; the page then reloads in the old language. The redirect/cache cookie needed to render the page must also survive third-party-cookie blocking.

**Why:** The manual switch succeeded in a standalone browser test but failed for the user in the embedded preview. Reproducing the Replit-style iframe with third-party cookie phaseout exposed the difference. A secure SameSite=None partitioned preference and partitioned cache cookie made all four language changes persist in that environment.

**How to apply:** When changing session or preference cookies used in preview, exercise a cross-site iframe test with third-party cookies blocked. Keep standalone-tab cookies available too, because a partitioned cookie is scoped to its top-level site. Browser event tests must wait for hydration after each reload; server-rendered controls can appear before their handlers attach.