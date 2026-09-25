---
name: Catalog import safeguards
description: Lessons for running catalog imports safely against Medusa Development.
---

Treat every catalog import as read-only by default. A prior import log can report the expected output even when Development contains duplicate families and excess variants; verify live product, variant, price, and image-association counts independently before considering a run complete. Restrict any cleanup to an explicit, freshly verified demo allowlist; never delete all products as a generic import pre-step.

**Why:** A logged 122-product import coexisted with 242 imported product rows, only 119 distinct families, 646 variants, and zero variant-image links in Development.

**How to apply:** Before writing, compare source IDs and counts with the current Development catalog. Require explicit apply mode, validate the exact target environment, and stop for review when duplicate or unexpected records already exist.