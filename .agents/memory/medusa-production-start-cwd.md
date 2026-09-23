---
name: Medusa production startup location
description: Working-directory constraint for isolated production-mode backend smoke tests
---

Start the built Medusa backend from the generated server output directory, not the source backend directory.

**Why:** A successful Medusa build followed by `medusa start` from the source directory reported a missing admin `index.html`, even though the file existed under the built server output. Starting from the built server directory found the admin bundle and served health successfully.

**How to apply:** For local production-mode startup verification, stop the development backend, build it, run the start command with the built server directory as the working directory against development/test data only, then stop the isolated process and restore the development workflow. Do not infer this verifies a published deployment.