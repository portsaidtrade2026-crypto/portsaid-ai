---
name: Medusa managed database constraint
description: Why the managed development database endpoint should not be used for isolated HTTP tests.
---

The Medusa integration runner expects to create and destroy temporary PostgreSQL databases through a conventional host/port connection. Pointing it at the managed PostgreSQL host caused setup to hang before HTTP tests began. A separate local PostgreSQL server with a role allowed to create databases works instead.

**Why:** A setup timeout is not evidence that a buyer flow fails. The managed development database and normal backend HTTP server are usable, but isolated database creation at the managed endpoint was not reliable here.

**How to apply:** Run isolated HTTP suites against a local database that permits temporary create/drop behavior rather than the shared managed development database. See the companion local-runner note for the host and SSL detail.