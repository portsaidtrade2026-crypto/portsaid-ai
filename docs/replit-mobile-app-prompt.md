# Replit prompts — PS PORT mobile app (PWA) — built on Replit, moved to the VPS later

Two prompts. Paste #1 into Replit (Build, with the finished Design open as the reference). Run #2 right before moving to the VPS.

---

## Prompt 1 — build

```
Build the "PS PORT" mobile app (installable PWA) exactly in the visual direction of the current design: dark industrial look, yellow accent, condensed bold headlines, Turkish copy, bottom tab bar (Ana sayfa · Katalog · Teklifim · Hesabım).

WHAT THIS IS
PORTSAID PLASTİK is a packaging distributor in Istanbul (stretch film, tape, bubble wrap, strapping, polystyrene, corner boards, machines; plus office supplies). Its website portsaid.com.tr already runs on Medusa v2 (commerce backend) + Next.js 15. This app is a mobile CLIENT of that same backend for B2B buyers: find a product fast by its spec, reorder, ask for a quote, follow its status, manage the company account. It has NO database and NO business logic of its own — it only talks to the existing Medusa Store API.

SCREENS (v1)
1. Ana sayfa — hero ("İŞİNİZ AKSAMASIN. TEDARİK HAZIR."), category carousel with product counts, "Tekrar sipariş" (last ordered), contact card.
2. Katalog — dense B2B list: search (Turkish-aware, İ/ı/Ş/Ğ), category filter, spec chips parsed from product options (Kalınlık, Uzunluk, Genişlik, Ağırlık, Masura Ağırlığı, Renk), quantity stepper, "Teklife ekle".
3. Teklifim — build a quote request from the chosen items, submit, and a status timeline for each quote (Gönderildi → İnceleniyor → Fiyat verildi → Onaylandı/Reddedildi), message thread, approve/decline the price.
4. Hesabım — login (email + password), company + employees, pending approvals (spending-limit rules), language switch, logout.

DATA — USE ONLY THESE, NOTHING MOCKED IN THE FINAL BUILD
Medusa Store API with the publishable key header: products, product-categories, regions, /store/customers/me, /store/carts, /store/quotes (+ messages), /store/approvals, /store/companies. Auth: Medusa customer emailpass → JWT. Categories, names, images and prices always come from the API; never hard-code them. Product titles are raw Turkish — display them as they are.

RULES THAT MUST HOLD
- CURRENCY: a price can be in TRY, USD or EUR (the currency_code the API returns for that price/region/quote line). Write the symbol after the number: "600 TL", "10.25 $", "9.50 €" — always followed by " + KDV / <unit>". Format numbers with the active locale but keep 2 decimals for $ and €. Each line keeps ITS OWN currency: never convert between currencies, never add a TL line to a $ line; a cart/quote with mixed currencies shows one subtotal per currency. Never write "KDV dahil".
- UNIT: the sales unit is either "adet" or "kg" (read it from the variant's `metadata.unit` when present, otherwise from the quote line; if it is missing show no unit rather than guessing). The unit is shown on the price AND on the quantity control: adet → whole numbers only; kg → decimals allowed (step 0.5, min 0.5). Never convert units (koli↔adet, kg↔adet) and never show a price per a unit different from the one it was given in.
- NO PRICE YET: many catalog items have no list price (the shop works by quote). When the API returns no price, do NOT show 0 or "-": show "Fiyat için teklif isteyin" with the "Teklife ekle" button. Prices appear after the sales team prices the quote.
- Company contact is ONLY: Telefon / WhatsApp +90 212 875 06 05 · info@portsaid.com.tr. Never any personal number.
- Languages tr (default), en, bg, ar. Arabic = full RTL with IBM Plex Sans Arabic; wrap numeric/latin values in <bdi dir="ltr">. Locale lives in the cookie `medusa_locale` (same as the website), not in the URL.
- Mobile first (390 px), thumb-reachable actions, offline shell + clear offline/error states, 44 px touch targets.
- Accessibility: contrast on the dark theme ≥ 4.5:1, visible focus, reduced-motion respected.

MUST BE MOVABLE TO ANOTHER SERVER LATER — DESIGN FOR THIS FROM LINE ONE
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind, Node 20, pnpm 9.15, `output: "standalone"`. Same stack as the website so parts can be shared later.
- Nothing Replit-specific: no Replit DB / Object Storage / Auth / Secrets API / AI integrations, no `REPL_*` variables, no `*.replit.dev` / `*.replit.app` / `repl.co` strings anywhere in code. Only standard npm packages.
- ALL configuration through environment variables, read in ONE file (src/config.ts) and documented in `.env.example` (placeholders only, no real values committed):
  APP_BASE_URL, MEDUSA_BACKEND_URL (server-side, loopback or internal), NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, NEXT_PUBLIC_DEFAULT_REGION, SESSION_SECRET, PORT.
- Backend-for-frontend: the browser only calls the app's own `/api/medusa/*`, and the app's server forwards to MEDUSA_BACKEND_URL. This keeps cookies first-party and means moving the backend or the domain needs ZERO CORS or code changes — only env vars. Store the login token in an httpOnly, Secure, SameSite=Lax cookie.
- Listen on 0.0.0.0:$PORT. Trust X-Forwarded-Proto/Host (it will sit behind a Caddy/nginx reverse proxy with HTTPS). Provide GET /healthz (200 + build version) for the health check.
- Images: use the URLs the backend returns; allowed image hosts come from an env var (e.g. IMAGE_HOSTS), not a hard-coded list.
- PWA: manifest with relative paths, start_url "/", icons 192/512 + maskable, service worker scoped to "/", works on any domain over HTTPS.
- If anything ever needs storage of its own (e.g. push subscriptions), use plain PostgreSQL via DATABASE_URL with SQL migration files in the repo — never a Replit-managed store. Prefer not needing any.
- Ship a multi-stage `Dockerfile` and a `docker-compose.yml` (app only; Medusa is external) that start the app with just a `.env` file and no Replit tooling.
- Write `MIGRATION.md`: every env var and what it does, build/start commands, the health URL, a Caddy site block example, how to roll back, and a 10-line smoke test (login, catalog loads, quote submit, Arabic RTL).

TESTING / SAFETY
Develop against the dev Medusa URL I give you. Use test accounts and test data whose names start with QATEST; never touch real customers or orders, never use Admin API keys in the app, never commit secrets.

DELIVER IN ORDER
(1) project skeleton + config + healthz + Docker, (2) API client + auth, (3) Katalog, (4) Teklifim, (5) Hesabım, (6) PWA + offline, (7) i18n/RTL polish, (8) MIGRATION.md. After each step, tell me what to check on my phone.
```

---

## Prompt 2 — portability audit (run before moving to the VPS)

```
Audit this project for server portability and fix what you find, without changing any screen or behaviour:
1. grep the whole repo (including .env*, config, manifest, service worker, next.config) for: replit, REPL_, repl.co, replit.dev, replit.app, localhost:, 127.0.0.1, http:// — every hit must come from an environment variable or be removed.
2. Confirm `docker compose up --build` works on a clean machine using only .env.example copied to .env, and that GET /healthz returns 200.
3. Confirm no dependency or code uses Replit-only services.
4. Confirm cookies work behind a TLS-terminating proxy (Secure + X-Forwarded-Proto) and that the PWA installs on a different domain.
5. Update MIGRATION.md with exactly what you verified, and list anything that still needs a manual step.
Report as a checklist: PASS / FIXED / NEEDS ME.
```
