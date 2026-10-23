#!/usr/bin/env bash
set -euo pipefail

: "${PORT:?PORT must be set to the public web port}"
: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:?NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY must be set}"
: "${JWT_SECRET:?JWT_SECRET must be set}"
: "${COOKIE_SECRET:?COOKIE_SECRET must be set}"

export NODE_ENV=production
MEDUSA_PORT="${MEDUSA_PORT:-9000}"
export MEDUSA_BACKEND_URL="http://127.0.0.1:$MEDUSA_PORT"

backend_pid=""
web_pid=""
shutdown() {
  trap - TERM INT EXIT
  if [[ -n "$web_pid" ]]; then kill "$web_pid" 2>/dev/null || true; fi
  if [[ -n "$backend_pid" ]]; then kill "$backend_pid" 2>/dev/null || true; fi
  if [[ -n "$web_pid" ]]; then wait "$web_pid" 2>/dev/null || true; fi
  if [[ -n "$backend_pid" ]]; then wait "$backend_pid" 2>/dev/null || true; fi
}
trap shutdown TERM INT EXIT

(cd apps/backend/.medusa/server && exec ../../node_modules/.bin/medusa start --host 127.0.0.1 --port "$MEDUSA_PORT") &
backend_pid=$!

ready=false
for ((attempt=0; attempt<90; attempt++)); do
  if curl --silent --fail --max-time 2 "http://127.0.0.1:$MEDUSA_PORT/health" >/dev/null; then
    ready=true
    break
  fi
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    echo "Backend exited before becoming healthy" >&2
    exit 1
  fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  echo "Backend health check timed out" >&2
  exit 1
fi

(cd apps/storefront && exec corepack pnpm exec next start -H 0.0.0.0 -p "$PORT") &
web_pid=$!
echo "Storefront listening on 0.0.0.0:$PORT; backend on loopback:$MEDUSA_PORT"

wait -n "$backend_pid" "$web_pid" || exit $?
echo "A production service exited unexpectedly" >&2
exit 1