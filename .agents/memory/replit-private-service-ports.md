---
name: Replit private service ports
description: Why internal service ports need an explicit local-only mapping in a multi-service deployment
---

Keep a private backend port as a local-only mapping, without an external port, when the frontend is the sole public service.

**Why:** Removing the mapping entirely while the development backend was running caused the workspace to rediscover the listener and add an external mapping again. Autoscale only supports one external port, and a development backend exposed this way would contradict the intended private production topology.

**How to apply:** When changing the public-port layout, inspect the effective port mappings again after starting or restarting services. Only the storefront should have an external mapping; the backend should retain only its local mapping.