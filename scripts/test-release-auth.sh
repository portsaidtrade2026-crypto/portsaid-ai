#!/usr/bin/env bash
set -Eeuo pipefail

# Deliberately refuses the managed/prod database. This script owns a temporary
# postgres cluster and never reads or forwards DATABASE_URL.
case "${1:-}" in
  A|disabled) mode=disabled ;;
  B|enabled) mode=enabled ;;
  *) echo "Usage: $0 A (disabled) | B (enabled)" >&2; exit 2 ;;
esac
expected_flag=false
[[ "$mode" == enabled ]] && expected_flag=true
if [[ -n "${DATABASE_URL:-}" || -n "${REVOCATION_TEST_DATABASE_URL:-}" ]]; then
  echo "Refusing to run with DATABASE_URL or REVOCATION_TEST_DATABASE_URL already set" >&2
  exit 2
fi
# Replit injects PG* variables for its managed development database. Never
# let libpq use those defaults for this disposable local cluster.
unset PGHOST PGHOSTADDR PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE PGSSLMODE
# The root manifest pins pnpm 9, while this workspace's installed dependency
# store was created with pnpm 10. Prevent pnpm from downloading another version.
export npm_config_manage_package_manager_versions=false
for command in initdb pg_ctl createdb psql pnpm; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 2; }
done
for command in pg_dump node; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 2; }
done

root=$(mktemp -d "${TMPDIR:-/tmp}/release-auth-pg.XXXXXX")
data="$root/data"
socket="$root/socket"
port=$((44000 + (RANDOM % 1000)))
db="revocation_test_${RANDOM}_$$"
cleanup() {
  if [[ -n "${NEXT_PID:-}" ]]; then
    kill -TERM "$NEXT_PID" >/dev/null 2>&1 || true
    wait "$NEXT_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill -TERM "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${PG_STARTED:-}" ]]; then pg_ctl -D "$data" -m immediate stop >/dev/null 2>&1 || true; fi
  rm -rf "$root"
}
trap cleanup EXIT INT TERM
backend_flag_source="$PWD/apps/backend/src/config/jwt-revocation.ts"
storefront_flag_source="$PWD/apps/storefront/src/lib/config/jwt-revocation.ts"
grep -Fq "export const jwtRevocationEnabled = $expected_flag;" "$backend_flag_source" ||
  { echo "Backend jwtRevocationEnabled does not match requested mode" >&2; exit 1; }
grep -Fq "export const jwtRevocationEnabled = $expected_flag;" "$storefront_flag_source" ||
  { echo "Storefront jwtRevocationEnabled does not match requested mode" >&2; exit 1; }
echo "Verified backend/storefront jwtRevocationEnabled source concordance for mode=$mode."
mkdir -p "$socket"
initdb -D "$data" -A trust --no-locale >/dev/null
pg_ctl -D "$data" -o "-h 127.0.0.1 -p $port -k $socket" -w start >/dev/null
PG_STARTED=1
createdb -h 127.0.0.1 -p "$port" -U "$(whoami)" "$db"
export REVOCATION_TEST_DATABASE_URL="postgres://$(whoami)@127.0.0.1:$port/$db"
export REVOCATION_TEST_DATABASE_DISPOSABLE=1
(
  cd apps/backend
  export DATABASE_URL="$REVOCATION_TEST_DATABASE_URL"
  pnpm run build
  # db:migrate also executes the project's initial-data-seed migration script.
  pnpm exec medusa db:migrate
)
schema=$(psql "$REVOCATION_TEST_DATABASE_URL" -Atc "select to_regclass('public.revoked_jwt')")
[[ "$schema" == "revoked_jwt" ]] || { echo "revoked_jwt migration is missing" >&2; exit 1; }
ledger=$(psql "$REVOCATION_TEST_DATABASE_URL" -Atc "select count(*) from mikro_orm_migrations where name ilike '%Migration20260923170348%'")
[[ "$ledger" == "1" ]] || { echo "tokenRevocation migration ledger entry is missing" >&2; exit 1; }
publishable_key=$(psql "$REVOCATION_TEST_DATABASE_URL" -Atc "select token from api_key where type = 'publishable' order by created_at limit 1")
[[ -n "$publishable_key" ]] || { echo "local publishable API key seed is missing" >&2; exit 1; }
echo "Verified disposable PostgreSQL schema, tokenRevocation migration ledger entry, and local publishable key seed."

schema_dump="$root/revoked-jwt-schema.sql"
if [[ "$mode" == disabled ]]; then
  pg_dump "$REVOCATION_TEST_DATABASE_URL" --schema-only --table=public.revoked_jwt >"$schema_dump"
  psql "$REVOCATION_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'drop table public.revoked_jwt cascade' >/dev/null
  export REVOCATION_TEST_MODE=disabled
  set +e
  output=$(cd apps/backend && unset DATABASE_URL && \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$publishable_key" \
    node --test integration-tests/live/token-revocation.test.mjs 2>&1)
  status=$?
  set -e
  printf '%s\n' "$output"
  pass_count=$(printf '%s\n' "$output" | grep -Ec '^✔|^ok [0-9]+ ' || true)
  echo "mode=disabled schema=old-no-revoked-jwt tap_pass_count=$pass_count exit=$status"
  [[ "$status" -eq 0 && "$pass_count" -eq 1 ]] || exit 1
  psql "$REVOCATION_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$schema_dump" >/dev/null
  for index in IDX_revoked_jwt_deleted_at IDX_revoked_jwt_expires_at; do
    found=$(psql "$REVOCATION_TEST_DATABASE_URL" -Atc "select count(*) from pg_indexes where schemaname = 'public' and tablename = 'revoked_jwt' and indexname = '$index'")
    [[ "$found" == "1" ]] || { echo "Expected revoked_jwt index is missing: $index" >&2; exit 1; }
  done
  echo "Restored revoked_jwt schema and verified expected indexes."
fi

export REVOCATION_TEST_MODE="$mode"
for run in 1 2 3; do
  set +e
  output=$(cd apps/backend && unset DATABASE_URL && \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$publishable_key" \
    node --test integration-tests/live/token-revocation.test.mjs 2>&1)
  status=$?
  set -e
  printf '%s\n' "$output"
  pass_count=$(printf '%s\n' "$output" | grep -Ec '^✔|^ok [0-9]+ ' || true)
  echo "mode=$mode run=$run tap_pass_count=$pass_count exit=$status"
  [[ "$status" -eq 0 && "$pass_count" -eq 1 ]] || exit 1
done

backend_port=$(node -e 'const net=require("net");const s=net.createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')
backend_log="$root/backend.log"
backend_binary="$PWD/apps/backend/node_modules/.bin/medusa"
[[ -x "$backend_binary" ]] || { echo "Built Medusa binary is missing" >&2; exit 1; }
(
  cd apps/backend/.medusa/server
  DATABASE_URL="$REVOCATION_TEST_DATABASE_URL" \
  JWT_SECRET="release-auth-$RANDOM-$(date +%s%N)" \
  COOKIE_SECRET="release-auth-cookie-$RANDOM-$(date +%s%N)" \
  "$backend_binary" start --host 127.0.0.1 --port "$backend_port"
) >"$backend_log" 2>&1 &
BACKEND_PID=$!
for attempt in {1..60}; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Production-built backend exited before readiness:" >&2
    tail -80 "$backend_log" >&2
    exit 1
  fi
  if node -e "fetch('http://127.0.0.1:$backend_port/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    break
  fi
  sleep 1
  [[ "$attempt" -lt 60 ]] || { echo "Production-built backend did not become healthy:" >&2; tail -80 "$backend_log" >&2; exit 1; }
done
for suite in company-isolation.test.mjs quote-cross-customer-authorization.test.mjs; do
  set +e
  suite_output=$(cd apps/backend && \
    DATABASE_URL="$REVOCATION_TEST_DATABASE_URL" \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$publishable_key" \
    BUYER_TEST_BACKEND_URL="http://127.0.0.1:$backend_port" \
    node --test "integration-tests/live/$suite" 2>&1)
  suite_status=$?
  set -e
  printf '%s\n' "$suite_output"
  suite_count=$(printf '%s\n' "$suite_output" | grep -Ec '^✔|^ok [0-9]+ ' || true)
  echo "suite=$suite tap_test_count=$suite_count exit=$suite_status"
  [[ "$suite_status" -eq 0 && "$suite_count" -gt 0 ]] || exit 1
done

storefront_port=$(node -e 'const net=require("net");const s=net.createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')
storefront_binary="$PWD/apps/storefront/node_modules/.bin/next"
[[ -x "$storefront_binary" ]] || { echo "Next binary is missing" >&2; exit 1; }
(
  cd apps/storefront
  MEDUSA_BACKEND_URL="http://127.0.0.1:$backend_port" \
  NEXT_PUBLIC_MEDUSA_BACKEND_URL="http://127.0.0.1:$backend_port" \
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$publishable_key" \
  NEXT_PUBLIC_BASE_URL="http://127.0.0.1:$storefront_port" \
  pnpm run build
)
storefront_log="$root/storefront.log"
(
  cd apps/storefront
  MEDUSA_BACKEND_URL="http://127.0.0.1:$backend_port" \
  NEXT_PUBLIC_MEDUSA_BACKEND_URL="http://127.0.0.1:$backend_port" \
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$publishable_key" \
  NEXT_PUBLIC_BASE_URL="http://127.0.0.1:$storefront_port" \
  "$storefront_binary" start -p "$storefront_port"
) >"$storefront_log" 2>&1 &
NEXT_PID=$!
for attempt in {1..60}; do
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "Next production server exited before readiness:" >&2
    tail -80 "$storefront_log" >&2
    exit 1
  fi
  if node -e "fetch('http://127.0.0.1:$storefront_port').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    break
  fi
  sleep 1
  [[ "$attempt" -lt 60 ]] || { echo "Next production server did not become healthy:" >&2; tail -80 "$storefront_log" >&2; exit 1; }
done
for run in 1 2 3; do
  set +e
  storefront_output=$(cd apps/storefront && \
    MEDUSA_BACKEND_URL="http://127.0.0.1:$backend_port" \
    NEXT_PUBLIC_MEDUSA_BACKEND_URL="http://127.0.0.1:$backend_port" \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$publishable_key" \
    NEXT_PUBLIC_BASE_URL="http://127.0.0.1:$storefront_port" \
    AUTH_TEST_STOREFRONT_URL="http://127.0.0.1:$storefront_port" \
    AUTH_TEST_BACKEND_URL="http://127.0.0.1:$backend_port" \
    REVOCATION_TEST_MODE="$mode" REVOCATION_TEST_DATABASE_DISPOSABLE=1 \
    node --test integration-tests/production-auth.test.cjs 2>&1)
  storefront_status=$?
  set -e
  printf '%s\n' "$storefront_output"
  storefront_count=$(printf '%s\n' "$storefront_output" | grep -Ec '^✔|^ok [0-9]+ ' || true)
  echo "storefront mode=$mode run=$run tap_test_count=$storefront_count exit=$storefront_status"
  [[ "$storefront_status" -eq 0 && "$storefront_count" -eq 1 ]] || exit 1
done