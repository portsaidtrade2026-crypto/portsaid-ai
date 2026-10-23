---
name: pnpm version mismatch
description: Why package installation can fail with an unexpected store location in this workspace
---

The workspace's existing dependencies were linked from pnpm 10's store, while the root package manifest pins pnpm 9. Invoking the pinned version for dependency changes can produce an "unexpected store location" error. In this environment, the preinstalled pnpm 10 works when automatic package-manager-version switching is disabled.

**Why:** The normal package installation service twice lost its install process; a pinned-version CLI attempt then hit the incompatible store. Changing package-manager versions wholesale would require reinstalling the entire monorepo for a simple storefront dependency.

**How to apply:** Check the installed store and active pnpm version before changing dependencies. Avoid mixing pnpm 9 and 10 on an existing node_modules tree; if the package service works later, prefer it. Do not treat this as a permanent version requirement if the workspace is reinstalled.