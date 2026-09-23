---
name: Next build isolation during smoke tests
description: Avoid false production startup failures caused by the development preview rewriting Next build output
---

Stop the development storefront before running an exact local production build and startup test. Restore the development workflow after the production process stops.

**Why:** The development and production Next processes use the same build-output directory. The development workflow can replace or remove the production build after it succeeds, causing the production startup to report that it cannot find a build. This failure does not reflect how a standalone publish image runs.

**How to apply:** Do the build and isolated startup while the development storefront is stopped. Then terminate the isolated services, restore the development workflow, and remove any automatically rediscovered external mappings for temporary smoke-test ports.