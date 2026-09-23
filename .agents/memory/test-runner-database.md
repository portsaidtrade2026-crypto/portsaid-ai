---
name: Medusa integration test database constraints
description: Why the standard Medusa isolated-db test runner is unsuitable in this Replit environment.
---

The Medusa integration runner expects to create and destroy temporary PostgreSQL databases through a conventional host/port connection. In this Replit environment it first defaults to localhost, which is not the configured database endpoint; pointing it at the managed PostgreSQL host caused setup to hang before HTTP tests began.

**Why:** A setup timeout is not evidence that a buyer flow fails. The managed development database and normal backend HTTP server are usable, but isolated database creation by the upstream runner was not reliable here.

**How to apply:** For live buyer-flow verification, run the HTTP journey checks against the running development backend, with unique fixture identities and explicit acknowledgement that they leave test records. If isolated tests become necessary, first provision a database that permits the runner's temporary create/drop behavior rather than silently running destructive experiments on the shared development database.