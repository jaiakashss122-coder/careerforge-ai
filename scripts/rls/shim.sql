-- ---------------------------------------------------------------------------
-- LOCAL TEST SHIM — NOT PART OF THE PROJECT
--
-- This file is a stand-in for the objects that Supabase itself provides in a
-- hosted project: the `auth` schema, the `auth.users` table, and the
-- `auth.uid()` / `auth.role()` helpers that read the JWT claims the Supabase
-- API injects into `request.jwt.claim.sub` / `request.jwt.claims`.
--
-- It exists only so the seven migrations in supabase/migrations/ can be applied
-- and probed against a plain local PostgreSQL server. It is NEVER shipped to a
-- real project: on Supabase those objects already exist, are owned by the
-- platform, and must not be created or altered by application code.
--
-- Fidelity limits worth knowing while reading probe results:
--   * Supabase's real auth.users has many more columns (encrypted_password,
--     confirmation_token, aud, role, ...). Only the columns the migrations and
--     public.handle_new_user() actually touch are modelled here.
--   * Supabase's auth.uid() is `security definer` and reads a GUC set by the
--     API gateway. Here the same GUC is set by hand with set_config(), which is
--     exactly what PostgREST does on a real request.
--   * Table privileges in a real project come from the grants inside the
--     migrations. scripts/rls/apply.sh additionally installs broad
--     ALTER DEFAULT PRIVILEGES for anon/authenticated/service_role, so the
--     probe measures ROW-LEVEL SECURITY specifically rather than grant
--     management. A row that the probe says is blocked is blocked by a policy.
--   * The local anon/authenticated/service_role roles are plain `nologin
--     noinherit` roles; Supabase's service_role also carries BYPASSRLS. The
--     probe does not exercise service_role.
--
-- Applied by scripts/rls/apply.sh into the scratch database
-- careerforge_rls_test only. Nothing outside that database is touched.
-- ---------------------------------------------------------------------------

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase reads the subject out of the JWT claims that the API puts in
-- request.jwt.claim.sub (or the whole claim set in request.jwt.claims).
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid
  );
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role')
  );
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
