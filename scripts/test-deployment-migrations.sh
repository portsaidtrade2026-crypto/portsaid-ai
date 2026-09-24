#!/usr/bin/env bash
set -Eeuo pipefail

case "${1:-}" in
  "") test_mode=default ;;
  --failure-only) test_mode=failure-only ;;
  *) echo "Usage: $0 [--failure-only]" >&2; exit 2 ;;
esac

# This is deliberately a local-only test.  In particular, never allow a
# managed database URL (or libpq's inherited defaults) into this process.
if [[ -n "${DATABASE_URL:-}" || -n "${REVOCATION_TEST_DATABASE_URL:-}" ]]; then
  echo "Refusing to run with DATABASE_URL or REVOCATION_TEST_DATABASE_URL already set" >&2
  exit 2
fi
unset PGHOST PGHOSTADDR PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE PGSSLMODE
export npm_config_manage_package_manager_versions=false

for command in initdb pg_ctl createdb psql corepack python3 openssl; do
  command -v "$command" >/dev/null || {
    echo "Missing required command: $command" >&2
    exit 2
  }
done

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

# Read the command from the TOML document; do not duplicate it in this test.
build_command="$(
  python3 - "$root_dir/.replit" <<'PY'
import sys
import tomllib

with open(sys.argv[1], "rb") as stream:
    deployment = tomllib.load(stream).get("deployment", {})
build = deployment.get("build")
if not isinstance(build, str) or not build:
    raise SystemExit("missing string [deployment].build in .replit")
print(build, end="")
PY
)"
[[ -n "$build_command" ]] || { echo "Could not read deployment build command" >&2; exit 2; }

root="$(mktemp -d "${TMPDIR:-/tmp}/deployment-migrations.XXXXXX")"
data="$root/data"
socket="$root/socket"
port=$((44000 + RANDOM % 1000))
role="$(id -un)"
marker="$root/startup-marker"
pg_started=false

cleanup() {
  if [[ "$pg_started" == true ]]; then
    pg_ctl -D "$data" -m immediate stop >/dev/null 2>&1 || true
  fi
  rm -rf "$root"
}
trap cleanup EXIT INT TERM

mkdir -p "$socket"
# initdb trust is constrained to the loopback listener below.
initdb -D "$data" -A trust --no-locale >/dev/null
pg_ctl -D "$data" -o "-h 127.0.0.1 -p $port -k $socket" -w start >/dev/null
pg_started=true

new_database() {
  local suffix="$1"
  local name="revocation_test_${suffix}_$RANDOM"
  createdb -h 127.0.0.1 -p "$port" -U "$role" "$name"
  printf 'postgres://%s@127.0.0.1:%s/%s' "$role" "$port" "$name"
}

run_build() {
  local label="$1" run="$2" url="$3"
  local log="$root/build-$RANDOM.log"
  # Keep command output private: build tools must never print URLs or secrets.
  if ! (
    export DATABASE_URL="$url"
    export JWT_SECRET="$(openssl rand -hex 32)"
    export COOKIE_SECRET="$(openssl rand -hex 32)"
    export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="pk_local_$(openssl rand -hex 16)"
    export REVOCATION_TEST_DATABASE_DISPOSABLE=1
    bash -c "$build_command"
  ) >"$log" 2>&1; then
    rm -f "$log"
    return 1
  fi
  rm -f "$log"
  echo "case=$label build_run=$run exit=0"
}

migrate() {
  local url="$1"
  (
    cd apps/backend
    export DATABASE_URL="$url"
    export JWT_SECRET="$(openssl rand -hex 32)"
    export COOKIE_SECRET="$(openssl rand -hex 32)"
    export REVOCATION_TEST_DATABASE_DISPOSABLE=1
    corepack pnpm exec medusa db:migrate
  ) >/dev/null 2>&1
}

assert_schema() {
  local url="$1"
  local table_count ledger_count index_count
  table_count="$(psql "$url" -Atc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='revoked_jwt' and c.relkind='r'")"
  ledger_count="$(psql "$url" -Atc "select count(*) from mikro_orm_migrations where name ilike '%Migration20260923170348%'")"
  index_count="$(psql "$url" -Atc "select count(*) from pg_indexes where schemaname='public' and tablename='revoked_jwt' and indexname in ('IDX_revoked_jwt_deleted_at','IDX_revoked_jwt_expires_at')")"
  [[ "$table_count" == 1 && "$ledger_count" == 1 && "$index_count" == 2 ]] || {
    echo "Migration schema assertion failed" >&2
    exit 1
  }
}

assert_target_absent() {
  local url="$1"
  local table_count ledger_table_count ledger_count
  table_count="$(psql "$url" -Atc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='revoked_jwt' and c.relkind='r'")"
  ledger_table_count="$(psql "$url" -Atc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='mikro_orm_migrations' and c.relkind='r'")"
  ledger_count=0
  if [[ "$ledger_table_count" == 1 ]]; then
    ledger_count="$(psql "$url" -Atc "select count(*) from mikro_orm_migrations where name ilike '%Migration20260923170348%'")"
  fi
  [[ "$table_count" == 0 && "$ledger_count" == 0 ]] || {
    echo "Migration precondition is not pending" >&2
    exit 1
  }
}

assert_incompatible_fixture() {
  local url="$1"
  local ledger_count index_count
  ledger_count="$(psql "$url" -Atc "select count(*) from mikro_orm_migrations where name ilike '%Migration20260923170348%'")"
  index_count="$(psql "$url" -Atc "select count(*) from pg_indexes where schemaname='public' and tablename='revoked_jwt' and indexname in ('IDX_revoked_jwt_deleted_at','IDX_revoked_jwt_expires_at')")"
  [[ "$ledger_count" == 0 && "$index_count" == 0 ]] || {
    echo "In-migration failure fixture was not established or was changed unexpectedly" >&2
    exit 1
  }
}

test_database() {
  local label="$1" url="$2"
  run_build "$label" 1 "$url" || { echo "Deployment build failed for $label database" >&2; exit 1; }
  assert_schema "$url"
  run_build "$label" 2 "$url" || { echo "Deployment build rerun failed for $label database" >&2; exit 1; }
  assert_schema "$url"
}

test_in_migration_failure() {
  local url="$1" build_status
  migrate "$url"
  psql "$url" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
delete from mikro_orm_migrations where name ilike '%Migration20260923170348%';
drop table public.revoked_jwt cascade;
create table public.revoked_jwt (id text not null primary key);
SQL
  assert_incompatible_fixture "$url"
  rm -f "$marker"
  set +e
  (
    export DATABASE_URL="$url"
    export JWT_SECRET="$(openssl rand -hex 32)"
    export COOKIE_SECRET="$(openssl rand -hex 32)"
    export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="pk_local_$(openssl rand -hex 16)"
    bash -c "$build_command" && touch "$marker"
  ) >"$root/in-migration-failure-build.log" 2>&1
  build_status=$?
  set -e
  [[ "$build_status" -ne 0 ]] || {
    echo "In-migration failure build unexpectedly succeeded" >&2
    exit 1
  }
  grep -q 'deleted_at' "$root/in-migration-failure-build.log" || {
    echo "Build failed, but not at the expected revoked_jwt migration index" >&2
    exit 1
  }
  [[ ! -e "$marker" ]] || {
    echo "In-migration failure reached simulated app startup" >&2
    exit 1
  }
  assert_incompatible_fixture "$url"
  echo "case=in-migration-failure build_exit=$build_status startup_marker=absent"
}

if [[ "$test_mode" == failure-only ]]; then
  failure_url="$(new_database in_migration_failure)"
  test_in_migration_failure "$failure_url"
  exit 0
fi

# Fresh database: verify it is empty before the exact build.
fresh_url="$(new_database fresh)"
assert_target_absent "$fresh_url"
test_database fresh "$fresh_url"

# Already-migrated database.
migrated_url="$(new_database migrated)"
migrate "$migrated_url"
assert_schema "$migrated_url"
test_database already-migrated "$migrated_url"

# Pending database: establish a real baseline, then remove only this migration's
# ledger row and table (never reset or drop any other application state).
pending_url="$(new_database pending)"
migrate "$pending_url"
psql "$pending_url" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
delete from mikro_orm_migrations where name ilike '%Migration20260923170348%';
drop table public.revoked_jwt cascade;
SQL
assert_target_absent "$pending_url"
test_database migration-pending "$pending_url"

# A bad local target must not fall through to a subsequent startup action.
invalid_url="postgres://${role}@127.0.0.1:${port}/revocation_test_invalid_$RANDOM"
rm -f "$marker"
set +e
(
  export DATABASE_URL="$invalid_url"
  export JWT_SECRET="$(openssl rand -hex 32)"
  export COOKIE_SECRET="$(openssl rand -hex 32)"
  export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="pk_local_$(openssl rand -hex 16)"
  bash -c "$build_command" >/dev/null 2>&1 &&
    touch "$marker"
)
invalid_status=$?
set -e
[[ "$invalid_status" -ne 0 && ! -e "$marker" ]] || {
  echo "Invalid disposable database unexpectedly reached startup marker" >&2
  exit 1
}

echo "Deployment build migration checks passed for fresh, pending, and migrated local databases."