---
name: Production catalog media from development
description: Why database-targeted imports can leave production product images inaccessible
---

When running a Medusa catalog import from the development workspace with only the database connection overridden to production, treat database writes and file uploads as separate targets. The local file provider can write images into the development filesystem and persist localhost media URLs in production product rows; a successful uploaded-images count does not prove production can serve them. The storefront's relative media proxy works on the production domain for assets already in the published build, while newly generated local assets can still return 404 until they are included in a later publish.

**Why:** The database override changes where product records are stored, but not where the file provider writes assets or what host it uses when constructing URLs.

**How to apply:** Before declaring production catalog media usable, inspect a newly imported product image URL and confirm both its host and underlying asset are reachable from the published runtime. Plan a separate, approved media migration if not; do not infer success from import totals alone.