# Replit setup

This pnpm monorepo runs as two managed workflows:

- `Storefront`: Next.js on `0.0.0.0:5000` (web preview)
- `Medusa Backend`: Medusa on port `9000` (admin at `/app`)

## Local setup

- Node.js 20 is required.
- Install dependencies with `corepack pnpm install --frozen-lockfile`.
- Apply backend migrations with:
  `corepack pnpm --filter @b2b-starter/backend exec medusa db:migrate`

The development PostgreSQL database is Replit's built-in database. Storefront URLs,
the Medusa publishable key, and CORS origins are configured as development
environment variables in Replit. Backend-only secrets remain outside version control.

Redis is optional in development; Medusa uses its in-memory fallback when
`REDIS_URL` is not configured.

## Buyer journey checks

With the backend running and development database seeded with a region,
product, shipping option, and payment provider, run
`corepack pnpm --filter @b2b-starter/backend test:e2e:buyer` from the root.
This exercises the live HTTP API for company signup/login, cart, quote
request, merchant-sent quote/customer acceptance, cart approval, and checkout.
It creates uniquely named test customers, companies, administrator accounts,
carts, quotes, and orders in the development database; it does not clean them
up. It does not drive the Next.js UI or test a real external payment provider.

To check company-admin isolation against the live development API, run
`corepack pnpm --filter @b2b-starter/backend test:e2e:company-isolation`.
This creates two test customers/companies, tests authorized and cross-company
settings reads and writes, nested employee routes, and approval actions. Like
the buyer journey check, it leaves its uniquely named development test data.