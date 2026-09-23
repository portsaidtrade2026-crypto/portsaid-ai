---
name: Medusa HTTP test database
description: Local database requirements and SSL behavior in the Medusa integration test runner
---

Medusa's HTTP integration runner creates and drops its own PostgreSQL databases. It does not use the app's development DATABASE_URL for these temporary databases. It needs a PostgreSQL role allowed to create databases.

**Why:** A reachable local server still timed out when DB_HOST was set to 127.0.0.1: the runner treated that address as non-local and enabled SSL. With DB_HOST=localhost, the same server worked.

**How to apply:** When running or diagnosing HTTP suites, provide DB_HOST=localhost and a role with database-creation privileges via the runner's DB_USERNAME/DB_PASSWORD variables. Do not point the runner at production credentials or infer that a working development DATABASE_URL is sufficient.