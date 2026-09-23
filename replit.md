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