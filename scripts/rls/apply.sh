#!/bin/bash
# ---------------------------------------------------------------------------
# Phase 7 pre-work harness: apply the repo's seven migrations to a throwaway
# local database that carries scripts/rls/shim.sql as a stand-in for the
# objects Supabase provides, then print the security-relevant inventory.
#
# Everything after the migrations is applied in strict filename order with
# ON_ERROR_STOP=1, so an ordering problem surfaces as a hard failure instead of
# a partially built schema.
#
# Idempotent: the scratch database is dropped and recreated on every run.
#
# SAFETY
#   * The only database this script touches is $DB (default
#     careerforge_rls_test). It refuses to run if that name is not the scratch
#     database. postgres/template1 are used only as the maintenance connection
#     required to drop and create $DB; nothing inside them is modified, and no
#     database is dropped by name other than $DB.
#   * Roles anon/authenticated/service_role are created if missing. No role is
#     ever dropped or altered.
#   * Run from anywhere; the repo root is derived from this file's location.
#
# Usage:  bash scripts/rls/apply.sh
# Then:   psql -h localhost -U jaiakash -d careerforge_rls_test \
#             -v ON_ERROR_STOP=1 -f scripts/rls/probe.sql
# ---------------------------------------------------------------------------
set -euo pipefail

DB="${RLS_TEST_DB:-careerforge_rls_test}"
PGHOST_="${PGHOST:-localhost}"
PGPORT_="${PGPORT:-5432}"
PGUSER_="${PGUSER:-jaiakash}"

if [ "$DB" != "careerforge_rls_test" ]; then
  echo "REFUSING to run: this harness only manages the scratch database" >&2
  echo "careerforge_rls_test (got RLS_TEST_DB=$DB)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

if [ ! -d supabase/migrations ]; then
  echo "REFUSING to run: $REPO_ROOT has no supabase/migrations." >&2
  exit 1
fi

PSQL_BASE=(psql -h "$PGHOST_" -p "$PGPORT_" -U "$PGUSER_")
PSQL=("${PSQL_BASE[@]}" -v ON_ERROR_STOP=1 -q)

echo "== roles (create if missing, never drop) =="
for r in anon authenticated service_role; do
  if ! "${PSQL_BASE[@]}" -d postgres -tAc \
        "select 1 from pg_roles where rolname = '$r'" | grep -q '^1$'; then
    "${PSQL[@]}" -d postgres -c "create role $r nologin noinherit"
    echo "   created role $r"
  else
    echo "   role $r already present"
  fi
done

echo "== scratch database (drop + recreate) =="
"${PSQL[@]}" -d postgres -c "drop database if exists $DB"
"${PSQL[@]}" -d postgres -c "create database $DB owner $PGUSER_"
echo "   recreated $DB"

# Table privileges for anon/authenticated come from the migrations themselves;
# these default privileges mirror the Supabase project defaults so that the
# probe exercises row-level security rather than grant management.
"${PSQL[@]}" -d "$DB" -c "grant usage on schema public to anon, authenticated, service_role"
"${PSQL[@]}" -d "$DB" -c "alter default privileges in schema public grant all on tables to anon, authenticated, service_role"
"${PSQL[@]}" -d "$DB" -c "alter default privileges in schema public grant all on sequences to anon, authenticated, service_role"

echo "== auth shim (local stand-in for Supabase objects) =="
"${PSQL[@]}" -d "$DB" -f "$SCRIPT_DIR/shim.sql"
echo "   applied $SCRIPT_DIR/shim.sql"

echo "== migrations in strict filename order =="
migration_count=0
while IFS= read -r f; do
  "${PSQL[@]}" -d "$DB" -f "$f"
  migration_count=$((migration_count + 1))
  echo "   ok  $(basename "$f")"
done < <(find supabase/migrations -maxdepth 1 -type f -name '*.sql' | LC_ALL=C sort)
echo "   $migration_count migration file(s) applied"

echo "== inventory =="
"${PSQL[@]}" -d "$DB" -tAc "
  with t as (
    select c.oid, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  )
  select 'tables                  = ' || count(*)::text ||
         '   (rls enabled         = ' ||
         count(*) filter (where relrowsecurity)::text || '/' || count(*)::text || ')'
  from t;"

"${PSQL[@]}" -d "$DB" -tAc "
  select 'policies                = ' || count(pol.oid)::text
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public';"

# A policy is owner-scoped when either its USING expression (polqual) or its
# WITH CHECK expression (polwithcheck, INSERT/UPDATE only) calls auth.uid().
# PG18 keeps the two in separate columns, both reached through pg_get_expr.
"${PSQL[@]}" -d "$DB" -tAc "
  select 'owner-scoped policies   = ' || count(pol.oid)::text
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and (pg_get_expr(pol.polqual, pol.polrelid)         ~ 'auth\\.uid\\('
      or pg_get_expr(pol.polwithcheck, pol.polrelid)    ~ 'auth\\.uid\\(');"

"${PSQL[@]}" -d "$DB" -tAc "
  select 'policies w/o auth.uid() = ' || count(pol.oid)::text ||
         '   -> ' || string_agg(pol.polname, ', ')
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and pg_get_expr(pol.polqual, pol.polrelid)         !~ 'auth\\.uid\\('
    and coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') !~ 'auth\\.uid\\(';"

"${PSQL[@]}" -d "$DB" -tAc "
  select 'rls-enabled tables      = ' || count(c.oid)::text || ' of ' ||
         (select count(*) from pg_class c2
          join pg_namespace n2 on n2.oid = c2.relnamespace
          where n2.nspname = 'public' and c2.relkind = 'r')::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity;"

"${PSQL[@]}" -d "$DB" -tAc "
  select 'rls-DISABLED tables     = ' || coalesce(string_agg(c.relname, ', '), 'none')
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;"

# Non-internal triggers: internal triggers are the FK / constraint triggers
# PostgreSQL builds for itself and are not part of the application contract.
# on_auth_user_created lives on auth.users (shim schema), so both schemas show.
"${PSQL[@]}" -d "$DB" -tAc "
  select 'triggers (non-internal) = ' || count(*)::text || '   (public schema = ' ||
         count(*) filter (where n.nspname = 'public')::text ||
         ', auth.users = ' ||
         count(*) filter (where n.nspname = 'auth')::text || ')'
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'auth') and not tg.tgisinternal;"

"${PSQL[@]}" -d "$DB" -tAc "
  select 'rows in public.skills   = ' || count(*)::text from public.skills;"

# Per-command coverage: which statement types the policies of each table speak
# to. A missing FOR DELETE is what keeps a table out of a self-service wipe.
echo "-- policy coverage per table (command types, and whether auth.uid() is used)"
"${PSQL[@]}" -d "$DB" -c "
  select c.relname as table_name,
         count(pol.oid)                                     as policies,
         count(*) filter (where pol.polcmd = 'r')           as s,
         count(*) filter (where pol.polcmd = 'a')           as i,
         count(*) filter (where pol.polcmd = 'w')           as u,
         count(*) filter (where pol.polcmd = 'd')           as d,
         count(*) filter (where pol.polcmd = '*')           as all_cmds,
         c.relrowsecurity                                   as rls_on,
         c.relforcerowsecurity                              as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy pol on pol.polrelid = c.oid
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname, c.relrowsecurity, c.relforcerowsecurity
  order by d, c.relname;"

"${PSQL[@]}" -d "$DB" -tAc "
  select 'tables w/o FOR DELETE  = ' ||
         coalesce(string_agg(x.relname, ', ' order by x.relname), 'none')
  from (
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'skills'
      and not exists (select 1 from pg_policy p
                      where p.polrelid = c.oid and p.polcmd in ('d','*'))
  ) x;"

"${PSQL[@]}" -d "$DB" -tAc "
  select 'policies to anon        = ' || count(distinct pol.oid)::text ||
         '   -> ' || string_agg(distinct pol.polname, ', ')
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_roles r on r.oid = any(pol.polroles)
  where n.nspname = 'public' and r.rolname = 'anon';"

echo
echo "Next: psql -h $PGHOST_ -U $PGUSER_ -d $DB -v ON_ERROR_STOP=1 -f scripts/rls/probe.sql"
