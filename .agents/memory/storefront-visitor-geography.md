---
name: Storefront visitor geography
description: Why locale selection uses bundled country ranges instead of a runtime IP lookup
---

Use an offline country-range snapshot for automatic storefront language selection rather than downloading it while serving visitors. Bundle only the countries assigned non-English languages, with all other IPs falling back to English. Manual language choice must take precedence over location and should be stored separately from the Medusa checkout region.

**Why:** In this Replit environment, Node's direct HTTPS fetch to the public country-data host failed at the TLS handshake although shell curl succeeded. A runtime download produced incorrect English fallbacks and slowed first requests. Filtering to relevant countries also reduced cold parsing from seconds and hundreds of MB to milliseconds and a small memory footprint.

**How to apply:** When changing supported countries, update the country-to-locale mapping and refresh the offline dataset together. Do not make storefront rendering depend on outbound geolocation calls. Keep route country codes as commerce regions rather than treating them as language identifiers.