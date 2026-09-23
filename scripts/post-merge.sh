#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

corepack pnpm install --frozen-lockfile --prefer-offline
corepack pnpm --filter @b2b-starter/backend exec medusa db:migrate