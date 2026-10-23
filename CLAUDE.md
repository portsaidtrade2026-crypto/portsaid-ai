# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PORTSAID PLASTİK's B2B storefront — a pnpm/Turborepo monorepo built on the **Medusa B2B Starter**
(`apps/backend` = Medusa v2 commerce backend, `apps/storefront` = Next.js 15 storefront). The
catalog, categories, and prices are synced in from the company's **BizimHesap ERP** via one-off
scripts (not a live integration). The site is multilingual (`en`/`tr`/`bg`/`ar`) with RTL support
for Arabic. A separate, unrelated system (self-hosted n8n WhatsApp bot + admin panel, at
`../export`) is **not** part of this repo and is not wired into Medusa.

## Commands

Run from the repo root unless noted. Package manager is pinned to `pnpm@9.15.0` via corepack.

```bash
pnpm install              # workspace install
pnpm dev                  # turbo: both apps in dev mode
pnpm build                # turbo: both apps
pnpm lint                 # turbo: both apps
pnpm test                 # turbo: backend integration:http tests
```

Backend-only (`apps/backend`), via `pnpm --filter @b2b-starter/backend <script>` or `cd apps/backend`:
- `medusa develop` / `medusa build` / `medusa db:migrate`
- `test:unit`, `test:integration:modules`, `test:integration:http` — Jest, `--runInBand`, need
  `NODE_OPTIONS=--experimental-vm-modules`. The HTTP/modules suites spin up their own temporary
  Postgres databases via `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD` — **do not** point them
  at the app's `DATABASE_URL` or a managed/remote Postgres host; use a local server with
  `DB_HOST=localhost` (not `127.0.0.1` — the runner treats non-`localhost` hosts as remote and
  forces SSL) and a role allowed to create/drop databases.
- `test:e2e:buyer` / `test:e2e:company-isolation` — run against the **live dev server** over
  HTTP (not mocked), create real-looking but uniquely-named test data, and never clean up after
  themselves.
- One-off data scripts run via `medusa exec ./src/migration-scripts/<file>.ts` (see
  `package.json` for the ones with aliases, e.g. `pnpm import-catalog`, `pnpm publish-catalog`,
  `pnpm reorganize-categories`). Treat every script in `src/migration-scripts/` as a one-shot
  historical tool written for a specific past data state, not a reusable library — read it fully
  before rerunning, and never run a bulk delete/cleanup script without verifying live counts
  first (see "Medusa data model gotchas" below).

Storefront-only (`apps/storefront`): `next dev -p 8000`, `next build`, `next start -p 8000`,
`test:e2e:company-registration`, `analyze` (bundle analyzer via `ANALYZE=true next build`).

## Architecture

**Monorepo layout**: `apps/backend` and `apps/storefront` are independent deployables joined only
by the Medusa Store/Admin HTTP API — there is no shared package. `turbo.json` defines `dev`
(uncached, persistent) and `build`/`lint`/`test` (cached) across both.

**Backend custom modules** (`apps/backend/src/modules/`, registered in `medusa-config.ts`): this
is the Medusa B2B Starter's domain layer on top of core commerce —
- `company` — company + employee records attached to a customer
- `quote` — RFQ/negotiated-quote workflow (quote + message threads), see `src/subscribers/quote-created.ts`
- `approval` — cart-approval rules (spending limits, admin sign-off) gating checkout
- `token-revocation` — JWT blocklist checked by custom middleware (`src/api/middlewares/`) so a
  logged-out token is rejected even though Medusa's own JWTs are stateless; `src/jobs/prune-revoked-jwts.ts`
  sweeps expired entries. When touching this, verify against a **built-in** protected route (e.g.
  `/store/customers/me`), not just a custom one — matcher behavior differs between a regex
  pattern and a string namespace wildcard, and the revoke-exception path must compare the
  original request URL, not the mount-relative path Express leaves after matching.

Custom API routes live under `src/api/{admin,store}/...` following Medusa's file-based routing
(`route.ts` exports `GET`/`POST`/etc.); links between modules/core entities are declared in
`src/links/`.

**Catalog content is batch-imported, not hand-entered.** Products, categories, and later
corrections all come from one-off scripts in `src/migration-scripts/` reading snapshots/exports of
BizimHesap data (there is no live BizimHesap↔Medusa sync job in this repo). Two durable
consequences:
- Product **options/variants encode specs parsed out of the original Turkish titles**
  (thickness/Kalınlık, length/Uzunluk, width/Genişlik, weight/Ağırlık, core weight/Masura Ağırlığı,
  color/Renk) — see `rebuild-attributes-from-titles.ts`. A Turkish-letter-aware word boundary is
  required when regex-parsing these titles: JS `\b`/`\w` are ASCII-only and don't include
  İ/Ş/Ğ/Ü/Ö/Ç/ı.
- Product **titles themselves are still raw, untranslated Turkish** — there is no per-product
  title/description translation mechanism yet (only UI chrome and a fixed `catalogTranslations`
  dictionary are localized; see below). Don't reuse the category-level translation dictionary for
  per-product title translation — that was tried and reverted because it collapsed every
  product in a family to one shared generic name, destroying the distinguishing spec in the title.

**Medusa data model gotchas worth knowing before writing any cleanup/migration script:**
- Soft-delete behavior is **inconsistent across operations**. `deleteProductsWorkflow` soft-deletes
  (`deleted_at`, recoverable via `productModuleService.restoreProducts()`). But
  `productModuleService.deleteProductOptionValues()` / `deleteProductOptions()` are **hard
  deletes** with no recovery path.
- Creating a brand-new **global** product option requires `createAndLinkProductOptionsToProductWorkflow`
  (`add: [{title, values}]`); calling it again with the same title errors "already exists" — for
  every subsequent product needing that option, query the existing option/value IDs and pass
  `add: [{id, value_ids}]` instead.
- `updateProductVariantsWorkflow` needs the variant's **complete** option set, not a partial patch,
  or it errors with a count mismatch.

**i18n is cookie-based, not path-based.** `apps/storefront/src/lib/i18n/`: locale is `en`/`tr`/`bg`/`ar`,
stored in the `medusa_locale` cookie (`config.ts`), auto-selected from IP geolocation on first visit
(`geoip.ts`, offline country-range snapshot — outbound geolocation calls are deliberately avoided)
but a manual choice always wins. There is **no `/ar/...` URL prefix** — don't test locale by
navigating to a locale-prefixed path; switch via the language `<select>` or send the
`medusa_locale` cookie directly. `dictionaries/catalog.ts` + `translateCatalogValue()` translate a
fixed set of canonical Turkish strings (category names, attribute headings) — the dictionary key
must be the **exact** string as stored in Medusa, so renaming a category/option in the DB silently
breaks its translation until the dictionary key is updated to match. RTL (`ar`) gets its own font
(`IBM Plex Sans Arabic`, loaded in `app/layout.tsx`, scoped via `html[dir="rtl"]` in `globals.css`)
layered on top of the site's base fonts (DM Sans/Barlow Condensed); other locales are untouched.
Latin/numeric filter values (e.g. "25 Mic") need `<bdi dir="ltr">` wrapping so an RTL ancestor
doesn't visually reorder them.

**Dual-deployment awareness is baked into the code**, not just docs — this app runs both on
Replit (dev) and on a persistent VPS (production), and several things switch on environment:
- `FILE_PROVIDER=local` switches file storage from Replit Object Storage (`src/modules/replit-storage`,
  required because Replit Autoscale wipes local disk on every republish) to Medusa's built-in
  local-disk provider for the VPS.
- The local-disk file provider's `backend_url` must be the real public domain, not `localhost` —
  that URL is rendered directly in the visitor's/admin's own browser.
- Admin's `backendUrl` is `"/"` (same-origin, resolved via `window.location.origin`) since Admin
  and the API share an origin; this does **not** apply to the Storefront, which is a different
  origin and would need its own proxy for the same relative path.
- `scripts/start-production.sh` boots the **built** backend from `.medusa/server` (not the source
  `apps/backend` dir — the admin bundle only resolves from the build output) and the storefront,
  wired together over loopback, with a health-check gate before the storefront starts.

**Known non-obvious behaviors already debugged** live in `.agents/memory/` (see `MEMORY.md` for
the index) — covering things like Unicode product-handle route decoding, Radix Select resubmitting
a stale first option after reset, and Next's dev/prod builds sharing one output directory. Check
there before re-debugging something that looks like infra flakiness.
