-- ===========================================================================
-- Phase 7 pre-work: cross-account isolation probe for CareerForge AI
-- ===========================================================================
--
-- WHAT THIS PROVES
--   That the row-level security written in supabase/migrations/ actually
--   isolates two accounts on a real PostgreSQL server, and that deleting an
--   auth.users row leaves no trace of that account anywhere in schema public.
--   Until this file runs green, the RLS claims in README.md and
--   docs/ARCHITECTURE.md are unproven.
--
-- HOW TO RUN
--   bash scripts/rls/apply.sh                                     # build the DB
--   psql -h localhost -U jaiakash -d careerforge_rls_test \
--       -v ON_ERROR_STOP=1 -f scripts/rls/probe.sql              # probe it
--   Exit status 0 = every assertion passed. Non-zero = at least one FAIL.
--
-- MECHANICS
--   Two fixed account uuids (A, B) are inserted into the shim auth.users table;
--   migration 1's on_auth_user_created trigger calls public.handle_new_user(),
--   so a profiles row must appear for each - that is the onboarding proof.
--   A single generic plpgsql seeder then builds one INSERT per table per
--   account straight from the catalog: required columns come from
--   information_schema.columns (not-null, no default, not identity/generated),
--   values are chosen by udt_name, enum-like text columns take the first
--   literal allowed by their CHECK (col = ANY (ARRAY[...])) constraint, and
--   foreign keys take an existing parent row of the SAME account parsed out of
--   pg_get_constraintdef. Per-table failures are logged, never fatal, and the
--   driver repeats until a pass adds nothing so parents exist before children.
--   session_replication_role is NOT used, so FK enforcement really ran on the
--   seed data.
--   Assertions a-e run as the `authenticated` role with the impersonated
--   subject switched by
--       select set_config('request.jwt.claim.sub', '<uuid>', false)
--   which is exactly what auth.uid() reads on a Supabase request. Assertion g is
--   a negative control: a deliberately leaky policy is installed on one table,
--   the same counters must notice it, and it is dropped again - it proves the
--   harness is capable of failing. Assertion f runs as the superuser because it
--   emulates the platform-side account delete.
--
--   Every line lands in rls_probe.result with a PASS / FAIL / NOTE verdict; the
--   last block raises an exception when anything FAILED, so psql exits non-zero
--   under ON_ERROR_STOP=1. NOTE rows are observations (for example the
--   application_materials.application_id behaviour) that the brief asked to be
--   reported rather than asserted.
--
-- SAFETY
--   Only the scratch database careerforge_rls_test is written to. No role is
--   dropped. The rls_probe schema holds harness bookkeeping only, and is
--   recreated from scratch on every run.
-- ===========================================================================

\set ON_ERROR_STOP on
\pset pager off

\echo ''
\echo '=========================================================================='
\echo ' 0. harness setup (superuser)'
\echo '=========================================================================='

drop schema if exists rls_probe cascade;
create schema rls_probe;

create table rls_probe.account (label text primary key, id uuid not null unique);
insert into rls_probe.account (label, id) values
  ('A', '00000000-0000-0000-0000-00000000000a'),
  ('B', '00000000-0000-0000-0000-00000000000b');

create table rls_probe.meta (key text primary key, value text);
insert into rls_probe.meta (key, value)
select 'skills_rows', count(*)::text from public.skills;

create table rls_probe.result (
  ord serial primary key, assertion text, target text, observed text, verdict text);
create table rls_probe.seed_log (
  ord serial primary key, tbl text, account text, pass int, status text, detail text);
create table rls_probe.seed_state (tbl text, account uuid, n int, primary key (tbl, account));
create table rls_probe.seed_counts (tbl text, account text, n bigint);

-- truth snapshot, taken as superuser before any role is impersonated
create table rls_probe.matrix (
  tbl text, account uuid, n bigint, pred text, idcol text, setcol text, ids text[],
  primary key (tbl, account));

create table rls_probe.pending (tbl text, owner uuid, sql text, note text,
  primary key (tbl, owner));

grant usage on schema rls_probe to anon, authenticated, service_role;
grant select on all tables in schema rls_probe to anon, authenticated, service_role;
grant select, insert on rls_probe.result, rls_probe.seed_log to anon, authenticated;
grant usage on all sequences in schema rls_probe to anon, authenticated;

create view rls_probe.pair as
  select a.tbl, a.n as a_n, a.ids as a_ids, a.idcol, a.setcol, a.pred as a_pred,
         b.n as b_n, b.ids as b_ids, b.pred as b_pred
  from rls_probe.matrix a
  join rls_probe.matrix b on b.tbl = a.tbl
  where a.account = (select id from rls_probe.account where label = 'A')
    and b.account = (select id from rls_probe.account where label = 'B');
grant select on rls_probe.pair to anon, authenticated;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function rls_probe.log(p_assertion text, p_target text,
                                         p_observed text, p_pass boolean)
returns void language sql as $fn$
  insert into rls_probe.result (assertion, target, observed, verdict)
  values (p_assertion, p_target, p_observed,
          case when p_pass then 'PASS' else 'FAIL' end);
$fn$;

create or replace function rls_probe.note(p_assertion text, p_target text, p_observed text)
returns void language sql as $fn$
  insert into rls_probe.result (assertion, target, observed, verdict)
  values (p_assertion, p_target, p_observed, 'NOTE');
$fn$;

-- every public table except the one intentionally-public catalog
create or replace function rls_probe.probed_tables()
returns setof text language sql stable as $fn$
  select c.relname::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'skills'
  order by c.relname;
$fn$;

create or replace function rls_probe.all_tables()
returns setof text language sql stable as $fn$
  select c.relname::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname;
$fn$;

-- pg_attribute based, so results cannot differ by invoking role the way
-- information_schema visibility can
create or replace function rls_probe.has_column(p_table text, p_col text)
returns boolean language sql stable as $fn$
  select exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public' and c.relname = p_table
      and a.attname = p_col and a.attnum > 0 and not a.attisdropped);
$fn$;

-- (table, column) -> foreign key parent, parsed from pg_get_constraintdef
create or replace function rls_probe.col_fk(p_table text, p_col text)
returns table (parent text, parent_col text, parent_schema text)
language sql stable as $fn$
  select cf.relname::text,
         (regexp_match(pg_get_constraintdef(f.oid),
            'REFERENCES\s+[a-z_0-9_.]*\(([a-z_0-9_]+)\)'))[1],
         nf.nspname::text
  from pg_constraint f
  join pg_class cr on cr.oid = f.conrelid
  join pg_class cf on cf.oid = f.confrelid
  join pg_namespace nc on nc.oid = cr.relnamespace
  join pg_namespace nf on nf.oid = cf.relnamespace
  where f.contype = 'f' and nc.nspname = 'public' and cr.relname = p_table
    and (regexp_match(pg_get_constraintdef(f.oid),
           'FOREIGN KEY \(([a-z_0-9_]+)\)'))[1] = p_col
  limit 1;
$fn$;

-- predicate "the row aliased p_alias belongs to p_owner". Owner tables use
-- user_id (profiles keys on id); child tables have no owner column, so the
-- owner is resolved through the foreign key that leads to one - recursively,
-- two levels deep for roadmap_task_prerequisites.
create or replace function rls_probe.owner_pred(p_table text, p_alias text,
                                                p_owner uuid, p_depth int default 0)
returns text language plpgsql stable as $fn$
declare
  v_rec record;
  v_inner text;
  v_palias text;
begin
  if p_table = 'profiles' then
    return format('%I.id = %L', p_alias, p_owner);
  end if;
  if rls_probe.has_column(p_table, 'user_id') then
    return format('%I.user_id = %L', p_alias, p_owner);
  end if;
  if p_depth >= 4 then
    return null;
  end if;
  for v_rec in
      select cf.relname as parent,
             (regexp_match(pg_get_constraintdef(f.oid),
                'FOREIGN KEY \(([a-z_0-9_]+)\)'))[1] as ccol,
             (regexp_match(pg_get_constraintdef(f.oid),
                'REFERENCES\s+[a-z_0-9_.]*\(([a-z_0-9_]+)\)'))[1] as pcol
        from pg_constraint f
        join pg_class cr on cr.oid = f.conrelid
        join pg_class cf on cf.oid = f.confrelid
        join pg_namespace nc on nc.oid = cr.relnamespace
        join pg_namespace nf on nf.oid = cf.relnamespace
       where f.contype = 'f'
         and nc.nspname = 'public' and cr.relname = p_table
         and nf.nspname = 'public' and cf.relname <> 'skills'
       order by f.conname
  loop
    continue when v_rec.ccol is null or v_rec.pcol is null;
    v_palias := p_alias || 'p';
    v_inner := rls_probe.owner_pred(v_rec.parent, v_palias, p_owner, p_depth + 1);
    if v_inner is not null then
      return format('exists (select 1 from public.%I %s where %s.%I = %I.%I and (%s))',
                    v_rec.parent, v_palias, v_palias, v_rec.pcol,
                    p_alias, v_rec.ccol, v_inner);
    end if;
  end loop;
  return null;
end;
$fn$;

-- a table that is the target of two foreign keys inside one child table
-- (roadmap_tasks for roadmap_task_prerequisites) must hold two distinct rows
create or replace function rls_probe.required_rows(p_table text)
returns int language sql stable as $fn$
  select coalesce((
    select max(cnt) from (
      select count(*) as cnt
      from pg_constraint f
      join pg_class cf on cf.oid = f.confrelid
      where f.contype = 'f' and cf.oid = p_table::regclass
      group by f.conrelid, f.confrelid
      having count(*) > 1) x)::int, 1);
$fn$;

-- first literal allowed by CHECK (col = ANY (ARRAY['a','b',...])), else NULL
create or replace function rls_probe.first_check_literal(p_table text, p_col text)
returns text language plpgsql stable as $fn$
declare
  v_def text;
  v_pos int;
begin
  for v_def in
    select pg_get_constraintdef(oid) from pg_constraint
    where conrelid = format('public.%I', p_table)::regclass and contype = 'c'
  loop
    v_pos := position(format('(%s = ANY (ARRAY[', p_col) in v_def);
    if v_pos > 0 then
      return substring(substr(v_def, v_pos) from '''([^'']+)''');
    end if;
  end loop;
  return null;
end;
$fn$;

-- THE GENERIC SEEDER: builds one INSERT for (table, account) from the catalog
create or replace function rls_probe.build_insert(p_table text, p_owner uuid)
returns text language plpgsql as $fn$
declare
  v_col record;
  v_fk record;
  v_cols text;
  v_vals text;
  v_expr text;
  v_pred text;
  v_cand text;
  v_used text[] := '{}';
  v_lit text;
begin
  for v_col in
    select c.column_name as name, c.udt_name as udt
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = p_table
      and c.is_nullable = 'NO'
      and c.column_default is null
      and c.is_identity = 'NO'
      and c.is_generated = 'NEVER'
      and not (c.column_name = 'id' and rls_probe.has_column(p_table, 'user_id'))
    order by c.ordinal_position
  loop
    select * into v_fk from rls_probe.col_fk(p_table, v_col.name);

    if v_fk.parent_schema = 'auth' and v_fk.parent = 'users' then
      -- this column IS the owner
      v_expr := quote_literal(p_owner::text) || '::uuid';

    elsif v_fk.parent is not null then
      -- foreign key: resolve against a real parent row of the same account
      if v_fk.parent = 'skills' then
        v_pred := 'true';
      else
        v_pred := rls_probe.owner_pred(v_fk.parent, 'src', p_owner);
        if v_pred is null then v_pred := 'true'; end if;
      end if;
      execute format(
        'select src.%I::text from public.%I src where (%s) '
        'and not (src.%I::text = any (cast($1 as text[]))) order by src.%I limit 1',
        v_fk.parent_col, v_fk.parent, v_pred, v_fk.parent_col, v_fk.parent_col)
        into v_cand using v_used;
      if v_cand is null then
        raise exception 'no % row owned by % is available for %.%',
          v_fk.parent, p_owner, p_table, v_col.name;
      end if;
      v_used := v_used || v_cand;
      v_expr := quote_literal(v_cand) || '::' || v_col.udt;

    else
      v_lit := rls_probe.first_check_literal(p_table, v_col.name);
      if v_lit is not null then
        v_expr := quote_literal(v_lit);
      else
        v_expr := case v_col.udt
          when 'uuid'        then 'gen_random_uuid()'
          when 'text'        then quote_literal('seed ' || p_table || ' ' || v_col.name)
          when 'varchar'     then quote_literal('seed ' || p_table || ' ' || v_col.name)
          when 'bpchar'      then quote_literal('seed')
          when 'name'        then quote_literal('seed')
          when 'int2'        then '1::int2'
          when 'int4'        then '1::int4'
          when 'int8'        then '1::int8'
          when 'numeric'     then '1::numeric'
          when 'float4'      then '1::float4'
          when 'float8'      then '1::float8'
          when 'bool'        then 'false'
          when 'timestamptz' then 'now()'
          when 'timestamp'   then 'now()::timestamp'
          when 'date'        then 'current_date'
          when 'jsonb'       then '''{}''::jsonb'
          when 'json'        then '''{}''::json'
          when '_text'       then '''{}''::text[]'
          else null
        end;
        if v_expr is null then
          raise exception 'no seeding rule for %.% of type %',
            p_table, v_col.name, v_col.udt;
        end if;
      end if;
    end if;

    v_cols := concat_ws(', ', v_cols, quote_ident(v_col.name));
    v_vals := concat_ws(', ', v_vals, v_expr);
  end loop;

  if v_cols is null then
    return null;   -- nothing required; the caller records it as unbuildable
  end if;
  return format('insert into public.%I (%s) values (%s)', p_table, v_cols, v_vals);
end;
$fn$;

-- run p_sql and report the outcome as a SQLSTATE-style string
create or replace function rls_probe.try_sql(p_sql text)
returns text language plpgsql as $fn$
begin
  execute p_sql;
  return 'OK';
exception
  when insufficient_privilege then return '42501';
  when check_violation        then return '23514';
  when unique_violation       then return '23505';
  when foreign_key_violation  then return '23503';
  when not_null_violation     then return '23502';
  when others                 then return SQLSTATE || ' | ' || SQLERRM;
end;
$fn$;

-- ===========================================================================
-- 1. the two accounts, and the onboarding proof
-- ===========================================================================

\echo ''
\echo '--- inserting auth.users rows for A and B (fires on_auth_user_created) ---'

insert into auth.users (id, email, raw_user_meta_data)
values
  ((select id from rls_probe.account where label = 'A'),
   'account-a@probe.test', '{"full_name":"Probe Account A"}'::jsonb),
  ((select id from rls_probe.account where label = 'B'),
   'account-b@probe.test', '{"full_name":"Probe Account B"}'::jsonb)
on conflict (id) do nothing;

do $do$
declare v_rec record; v_n bigint; v_email text; v_name text;
begin
  for v_rec in select label, id from rls_probe.account order by label loop
    select count(*) into v_n from public.profiles where id = v_rec.id;
    select p.email, p.full_name into v_email, v_name
      from public.profiles p where p.id = v_rec.id;
    perform rls_probe.log('pre',
      'onboarding: handle_new_user() -> profiles row for account ' || v_rec.label,
      format('profiles rows for %s = %s (email=%s, full_name=%s)',
             v_rec.label, v_n, coalesce(v_email, '-'), coalesce(v_name, '-')),
      v_n = 1);
  end loop;
end;
$do$;

select target as onboarding_check, observed as result, verdict
from rls_probe.result where assertion = 'pre' order by ord;

-- ===========================================================================
-- 2. seed every owner table and every child table for both accounts
-- ===========================================================================

\echo ''
\echo '--- generic catalog-driven seeder (repeats until a pass adds nothing) ---'

do $do$
declare
  v_pass int := 0;
  v_progress boolean;
  v_tbl text;
  v_acc record;
  v_have int;
  v_need int;
  v_sql text;
  v_pred text;
  v_already bigint;
begin
  loop
    v_pass := v_pass + 1;
    v_progress := false;
    for v_tbl in select rls_probe.probed_tables() loop
      for v_acc in select label, id from rls_probe.account order by label loop
        select coalesce(max(n), 0) into v_have from rls_probe.seed_state
          where tbl = v_tbl and account = v_acc.id;
        v_need := rls_probe.required_rows(v_tbl);
        if v_have >= v_need then continue; end if;
        -- rows the product already created by itself (profiles comes from
        -- handle_new_user()) count as seeded instead of being re-inserted
        v_pred := rls_probe.owner_pred(v_tbl, 'src', v_acc.id);
        if v_pred is not null then
          execute format('select count(*) from public.%I src where (%s)', v_tbl, v_pred)
            into v_already;
          if v_already >= v_need then
            insert into rls_probe.seed_state (tbl, account, n)
            values (v_tbl, v_acc.id, v_already)
            on conflict (tbl, account) do update set n = excluded.n;
            insert into rls_probe.seed_log (tbl, account, pass, status, detail)
            values (v_tbl, v_acc.label, v_pass, 'already present',
                    format('%s row(s) owned before seeding (product-side insert)', v_already));
            continue;
          end if;
        end if;
        begin
          v_sql := rls_probe.build_insert(v_tbl, v_acc.id);
          if v_sql is null then
            insert into rls_probe.seed_log (tbl, account, pass, status, detail)
            values (v_tbl, v_acc.label, v_pass, 'unbuildable',
                    'no not-null column without a default to seed from');
            insert into rls_probe.seed_state (tbl, account, n)
            values (v_tbl, v_acc.id, v_need)
            on conflict (tbl, account) do update set n = v_need;
            continue;
          end if;
          execute v_sql;
          insert into rls_probe.seed_log (tbl, account, pass, status, detail)
            values (v_tbl, v_acc.label, v_pass, 'seeded', left(v_sql, 240));
          insert into rls_probe.seed_state (tbl, account, n)
            values (v_tbl, v_acc.id, 1)
            on conflict (tbl, account) do update set n = rls_probe.seed_state.n + 1;
          v_progress := true;
        exception when others then
          insert into rls_probe.seed_log (tbl, account, pass, status, detail)
            values (v_tbl, v_acc.label, v_pass, 'attempt failed',
                    SQLSTATE || ' | ' || SQLERRM);
        end;
      end loop;
    end loop;
    exit when not v_progress or v_pass >= 8;
  end loop;
  raise notice 'seeder finished after % pass(es); session_replication_role stayed = %',
    v_pass, coalesce(current_setting('session_replication_role', true), 'default');
end;
$do$;

\echo '--- final seed status per table/account ---'
select s.tbl, s.account, s.status, left(s.detail, 120) as detail
from rls_probe.seed_log s
join (select tbl, account, max(ord) as ord from rls_probe.seed_log group by tbl, account) m
  on m.ord = s.ord
order by s.tbl, s.account;

-- ---------------------------------------------------------------------------
-- truth snapshot (superuser: sees every row, RLS does not apply)
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- truth snapshot: rows per table per account, as the superuser sees them ---'

do $do$
declare
  v_tbl text;
  v_acc record;
  v_pred text;
  v_idcol text;
  v_setcol text;
  v_ids text[];
  v_n bigint;
begin
  delete from rls_probe.matrix;
  delete from rls_probe.seed_counts;
  for v_tbl in select rls_probe.probed_tables() loop
    select a.attname into v_idcol
    from pg_index x
    join pg_class c on c.oid = x.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum = any (x.indkey::int[])
    where n.nspname = 'public' and c.relname = v_tbl and x.indisprimary
    order by array_position(x.indkey::int[], a.attnum::int)
    limit 1;
    if v_idcol is null then
      v_idcol := 'user_id';
    end if;
    -- a column an UPDATE can set to itself: not the pk, not identity, not
    -- generated, preferring a column that is not a foreign key
    select a.attname into v_setcol
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public' and c.relname = v_tbl
      and a.attnum > 0 and not a.attisdropped
      and a.attidentity = '' and a.attgenerated = ''
      and a.attnum <> all (coalesce((
            select x.indkey::int[] from pg_index x
            join pg_class c2 on c2.oid = x.indrelid
            join pg_namespace n2 on n2.oid = c2.relnamespace
            where n2.nspname = 'public' and c2.relname = v_tbl and x.indisprimary
            limit 1), '{}')::int[])
      and a.attname <> v_idcol
    order by (exists (
            select 1 from pg_constraint f
            where f.conrelid = c.oid and f.contype = 'f'
              and array_length(f.conkey, 1) = 1 and a.attnum = any (f.conkey)
          ))::int, a.attnum
    limit 1;
    if v_setcol is null then v_setcol := v_idcol; end if;

    for v_acc in select label, id from rls_probe.account order by label loop
      v_pred := rls_probe.owner_pred(v_tbl, 'src', v_acc.id);
      if v_pred is null then
        insert into rls_probe.matrix (tbl, account, n, pred, idcol, setcol, ids)
        values (v_tbl, v_acc.id, null, null, v_idcol, v_setcol, null);
        insert into rls_probe.seed_counts (tbl, account, n)
        values (v_tbl, v_acc.label, null);
        continue;
      end if;
      execute format('select count(*) from public.%I src where (%s)', v_tbl, v_pred)
        into v_n;
      execute format('select array_agg(src.%I::text order by src.%I::text) '
                     'from public.%I src where (%s)', v_idcol, v_idcol, v_tbl, v_pred)
        into v_ids;
      insert into rls_probe.matrix (tbl, account, n, pred, idcol, setcol, ids)
      values (v_tbl, v_acc.id, v_n, v_pred, v_idcol, v_setcol, v_ids)
      on conflict (tbl, account) do update
        set n = excluded.n, pred = excluded.pred, idcol = excluded.idcol,
            setcol = excluded.setcol, ids = excluded.ids;
      insert into rls_probe.seed_counts (tbl, account, n) values (v_tbl, v_acc.label, v_n);
    end loop;
  end loop;
end;
$do$;

select tbl as table_name,
       max(case when account = (select id from rls_probe.account where label='A')
                then n end) as rows_of_a,
       max(case when account = (select id from rls_probe.account where label='B')
                then n end) as rows_of_b
from rls_probe.matrix group by tbl order by tbl;

-- the INSERTs assertion (c) will replay, built here while still superuser so
-- the parent lookups can see A's rows (B could not see them under RLS)
do $do$
declare v_tbl text; v_a uuid; v_sql text;
begin
  select id into v_a from rls_probe.account where label = 'A';
  delete from rls_probe.pending;
  for v_tbl in select rls_probe.probed_tables() loop
    begin
      v_sql := rls_probe.build_insert(v_tbl, v_a);
      insert into rls_probe.pending (tbl, owner, sql, note)
      values (v_tbl, v_a, v_sql,
              case when v_sql is null then 'unbuildable' end)
      on conflict (tbl, owner) do update set sql = excluded.sql, note = excluded.note;
    exception when others then
      insert into rls_probe.pending (tbl, owner, sql, note)
      values (v_tbl, v_a, null, 'build failed: ' || SQLERRM)
      on conflict (tbl, owner) do update set sql = null, note = excluded.note;
    end;
  end loop;
end;
$do$;

\echo ''
\echo '--- static coverage: owner tables with no FOR DELETE policy for authenticated ---'
-- The learner-facing "delete my data" screen can only clear a table that has a
-- FOR DELETE policy reachable by the authenticated role. This is a catalog fact,
-- logged as a NOTE, not a behaviour probe; assertion f covers the platform-side
-- cascade instead.
do $do$
declare v_rec record;
begin
  for v_rec in
      select c.relname as tbl,
             count(*) filter (where pol.polcmd = 'd' or pol.polcmd = '*') as delete_policies,
             count(*) filter (where pol.polcmd = 'w' or pol.polcmd = '*') as update_policies
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_policy pol on pol.polrelid = c.oid
      where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'skills'
      group by c.relname
      having count(*) filter (where pol.polcmd = 'd' or pol.polcmd = '*') = 0
      order by c.relname
  loop
    perform rls_probe.note('pre',
      'learner-facing DELETE coverage: ' || v_rec.tbl,
      'this table has no FOR DELETE policy, so a learner cannot clear its own rows '
      || 'there from the app; only the auth.users cascade can remove them');
  end loop;
end;
$do$;

select assertion as which, target as checked, observed as evidence, verdict
from rls_probe.result where assertion = 'pre' order by ord;

\echo ''
\echo '=========================================================================='
\echo ' 3a. as account A: every table returns A rows only'
\echo '=========================================================================='

-- Every assertion function returns one formatted text line per table and also
-- records the verdict in rls_probe.result, so the output is readable on its own
-- and the summary at the end can gate the exit status.

create or replace function rls_probe.assert_a()
returns setof text language plpgsql as $fn$
declare
  v_rec record;
  v_seen bigint;
  v_foreign bigint;
  v_ok boolean;
begin
  for v_rec in
      select m.tbl, m.n as a_n, m.pred as a_pred
      from rls_probe.matrix m
      where m.account = (select id from rls_probe.account where label = 'A')
      order by m.tbl
  loop
    if v_rec.a_pred is null then
      perform rls_probe.log('a', v_rec.tbl,
        'no owner path could be derived for this table', false);
      return next format('%-28s NO OWNER PATH -> FAIL', v_rec.tbl);
      continue;
    end if;
    execute format('select count(*) from public.%I src', v_rec.tbl) into v_seen;
    execute format('select count(*) from public.%I src where not (%s)',
                   v_rec.tbl, v_rec.a_pred) into v_foreign;
    v_ok := coalesce(v_foreign, -1) = 0
        and v_seen = v_rec.a_n and coalesce(v_rec.a_n, 0) > 0;
    perform rls_probe.log('a', v_rec.tbl,
      format('rows visible to A = %s, rows A really owns = %s, visible rows not owned by A = %s',
             v_seen, coalesce(v_rec.a_n, 0), coalesce(v_foreign, -1)), v_ok);
    return next format('%-28s sees %s of %s own row(s), %s foreign row(s) -> %s',
                       v_rec.tbl, v_seen, coalesce(v_rec.a_n, 0),
                       coalesce(v_foreign, -1), case when v_ok then 'PASS' else 'FAIL' end);
  end loop;
end;
$fn$;

do $do$ begin
  perform set_config('request.jwt.claim.sub',
                     (select id::text from rls_probe.account where label = 'A'), false);
end $do$;
set role authenticated;
select 'as authenticated with auth.uid() = '
       || coalesce(current_setting('request.jwt.claim.sub', true), 'NULL') || ' ('
       || coalesce(auth.role(), 'no role claim') || ')';
select rls_probe.assert_a() as assertion_a;
reset role;

-- ===========================================================================
-- 3b. as account B: A's rows are invisible, un-updatable and undeletable
-- ===========================================================================

\echo ''
\echo '=========================================================================='
\echo ' 3b. as account B: select/update/delete against A rows'
\echo '=========================================================================='

create or replace function rls_probe.assert_b()
returns setof text language plpgsql as $fn$
declare
  v_rec record;
  v_sel bigint;
  v_upd bigint;
  v_del bigint;
  v_own bigint;
  v_ok boolean;
begin
  for v_rec in select * from rls_probe.pair order by tbl loop
    if coalesce(array_length(v_rec.a_ids, 1), 0) = 0 then
      perform rls_probe.log('b', v_rec.tbl,
        'A owns no rows here, so no foreign row could be targeted (see assertion a)', false);
      return next format('%-28s NOTHING TO TARGET -> FAIL', v_rec.tbl);
      continue;
    end if;
    execute format('select count(*) from public.%I src '
                   'where src.%I::text = any (cast($1 as text[]))',
                   v_rec.tbl, v_rec.idcol) into v_sel using v_rec.a_ids;
    execute format('update public.%I src set %I = %I '
                   'where src.%I::text = any (cast($1 as text[]))',
                   v_rec.tbl, v_rec.setcol, v_rec.setcol, v_rec.idcol)
      using v_rec.a_ids;
    get diagnostics v_upd = row_count;
    execute format('delete from public.%I src '
                   'where src.%I::text = any (cast($1 as text[]))',
                   v_rec.tbl, v_rec.idcol) using v_rec.a_ids;
    get diagnostics v_del = row_count;
    execute format('select count(*) from public.%I src', v_rec.tbl) into v_own;
    v_ok := coalesce(v_sel, -1) = 0 and coalesce(v_upd, -1) = 0
        and coalesce(v_del, -1) = 0 and v_own = v_rec.b_n;
    perform rls_probe.log('b', v_rec.tbl,
      format('select of %s named A row(s) returned %s; update affected %s; delete affected %s; '
             'B still sees its own %s row(s) (truth %s)',
             coalesce(array_length(v_rec.a_ids, 1), 0), v_sel, v_upd, v_del,
             v_own, coalesce(v_rec.b_n, 0)), v_ok);
    return next format('%-28s select %s, update %s, delete %s (A rows), B own %s/%s -> %s',
                       v_rec.tbl, v_sel, v_upd, v_del, v_own,
                       coalesce(v_rec.b_n, 0),
                       case when v_ok then 'PASS' else 'FAIL' end);
  end loop;
end;
$fn$;

do $do$ begin
  perform set_config('request.jwt.claim.sub',
                     (select id::text from rls_probe.account where label = 'B'), false);
end $do$;
set role authenticated;
select 'as authenticated with auth.uid() = '
       || coalesce(current_setting('request.jwt.claim.sub', true), 'NULL');
select rls_probe.assert_b() as assertion_b;
reset role;

-- ===========================================================================
-- 3c. as account B: writing a row owned by A must be refused by RLS (42501)
-- ===========================================================================

\echo ''
\echo '=========================================================================='
\echo ' 3c. as account B: INSERT of an A-owned row must fail with 42501'
\echo '=========================================================================='

create or replace function rls_probe.assert_c()
returns setof text language plpgsql as $fn$
declare
  v_rec record;
  v_state text;
  v_ok boolean;
begin
  for v_rec in
      select p.tbl, p.sql, p.note from rls_probe.pending p
      order by p.tbl
  loop
    if v_rec.sql is null then
      perform rls_probe.log('c', v_rec.tbl,
        'no foreign insert could be built (' || coalesce(v_rec.note, '?') || ')', false);
      return next format('%-28s NOT TESTABLE -> FAIL', v_rec.tbl);
      continue;
    end if;
    v_state := rls_probe.try_sql(v_rec.sql);
    v_ok := v_state = '42501';
    perform rls_probe.log('c', v_rec.tbl,
      format('insert of an A-owned row as B returned %s; statement: %s',
             v_state, left(v_rec.sql, 160)), v_ok);
    return next format('%-28s %s -> %s', v_rec.tbl,
                       case when v_state = '42501' then '42501 blocked by RLS'
                            when v_state = 'OK'    then 'INSERT SUCCEEDED, NOT BLOCKED'
                            else 'failed with ' || v_state end,
                       case when v_ok then 'PASS' else 'FAIL' end);
  end loop;
end;
$fn$;

do $do$ begin
  perform set_config('request.jwt.claim.sub',
                     (select id::text from rls_probe.account where label = 'B'), false);
end $do$;
set role authenticated;
select 'as authenticated with auth.uid() = '
       || coalesce(current_setting('request.jwt.claim.sub', true), 'NULL');
select rls_probe.assert_c() as assertion_c;
reset role;

-- ===========================================================================
-- 3d. as anon: owner tables empty, skills readable
-- ===========================================================================

\echo ''
\echo '=========================================================================='
\echo ' 3d. as anon: no owner rows visible, skills public read'
\echo '=========================================================================='

create or replace function rls_probe.assert_d()
returns setof text language plpgsql as $fn$
declare
  v_tbl text;
  v_n bigint;
  v_state text;
  v_skills bigint;
  v_ok boolean;
begin
  select value::bigint into v_skills from rls_probe.meta where key = 'skills_rows';
  for v_tbl in select rls_probe.all_tables() loop
    begin
      execute format('select count(*) from public.%I src', v_tbl) into v_n;
      v_state := 'OK';
    exception when insufficient_privilege then
      v_n := null; v_state := '42501 no table privilege';
    end;
    if v_tbl = 'skills' then
      v_ok := v_n = v_skills;
    else
      v_ok := v_n = 0;
    end if;
    perform rls_probe.log('d', v_tbl,
      format('anon sees %s row(s), expected %s (%s)',
             coalesce(v_n, -1),
             case when v_tbl = 'skills' then v_skills else 0 end, v_state), v_ok);
    return next format('%-28s anon sees %s row(s), expected %s -> %s', v_tbl,
                       coalesce(v_n, -1),
                       case when v_tbl = 'skills' then v_skills else 0 end,
                       case when v_ok then 'PASS' else 'FAIL' end);
  end loop;
end;
$fn$;

do $do$ begin
  -- an anonymous request carries no subject, so auth.uid() resolves to NULL
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claims', '', false);
end $do$;
set role anon;
select 'as ' || current_user || ' with auth.uid() = '
       || coalesce(auth.uid()::text, 'NULL');
select rls_probe.assert_d() as assertion_d;
reset role;

-- ===========================================================================
-- 3e. phase 6 specifics on application_materials, as account A
-- ===========================================================================

\echo ''
\echo '=========================================================================='
\echo ' 3e. application_materials constraints, as account A'
\echo '=========================================================================='

-- A starts this section with no saved material so the sequence is deterministic
delete from public.application_materials
 where user_id = (select id from rls_probe.account where label = 'A');

create or replace function rls_probe.assert_e()
returns setof text language plpgsql as $fn$
declare
  v_a uuid;
  v_b uuid;
  v_b_app uuid;
  v_mat uuid;
  v_rand text;
  v_foreign text;
  v_sql text;
  v_state text;
  v_ok boolean;
begin
  select id into v_a from rls_probe.account where label = 'A';
  select id into v_b from rls_probe.account where label = 'B';
  select (ids[1])::uuid into v_b_app from rls_probe.matrix
   where tbl = 'job_applications' and account = v_b;

  -- e1: a resume draft is the first one for this account -> allowed
  v_sql := format('insert into public.application_materials '
                  '(user_id, kind, content, target_role) values (%L, %L, %L, %L)',
                  v_a, 'resume', 'A resume draft v1', 'Data Analyst');
  v_state := rls_probe.try_sql(v_sql);
  v_ok := v_state = 'OK';
  perform rls_probe.log('e', 'e1 resume #1 accepted', 'result ' || v_state, v_ok);
  return next format('%-30s expected OK,        got %-22s -> %s',
                     'e1 resume #1', v_state, case when v_ok then 'PASS' else 'FAIL' end);

  -- e2: a second resume for the same account -> one_per_kind unique rejects it
  v_sql := format('insert into public.application_materials '
                  '(user_id, kind, content, target_role) values (%L, %L, %L, %L)',
                  v_a, 'resume', 'A resume draft v2', 'Data Analyst');
  v_state := rls_probe.try_sql(v_sql);
  v_ok := v_state = '23505';
  perform rls_probe.log('e', 'e2 resume #2 rejected by application_materials_one_per_kind',
                        'result ' || v_state, v_ok);
  return next format('%-30s expected 23505,      got %-22s -> %s',
                     'e2 resume #2 (unique)', v_state,
                     case when v_ok then 'PASS' else 'FAIL' end);

  -- e3: linkedin is a different kind, so the constraint does not apply
  v_sql := format('insert into public.application_materials '
                  '(user_id, kind, content, target_role) values (%L, %L, %L, %L)',
                  v_a, 'linkedin', 'LinkedIn headline and about text', 'Data Analyst');
  v_state := rls_probe.try_sql(v_sql);
  v_ok := v_state = 'OK';
  perform rls_probe.log('e', 'e3 linkedin accepted', 'result ' || v_state, v_ok);
  return next format('%-30s expected OK,        got %-22s -> %s',
                     'e3 linkedin', v_state, case when v_ok then 'PASS' else 'FAIL' end);

  -- e4: cover_letter is not one of the three kinds the CHECK allows
  v_sql := format('insert into public.application_materials '
                  '(user_id, kind, content, target_role) values (%L, %L, %L, %L)',
                  v_a, 'cover_letter', 'A cover letter', 'Data Analyst');
  v_state := rls_probe.try_sql(v_sql);
  v_ok := v_state = '23514';
  perform rls_probe.log('e', 'e4 kind cover_letter rejected by CHECK',
                        'result ' || v_state, v_ok);
  return next format('%-30s expected 23514,      got %-22s -> %s',
                     'e4 kind cover_letter', v_state,
                     case when v_ok then 'PASS' else 'FAIL' end);

  -- e5: 20001 characters against CHECK char_length(content) <= 20000
  v_sql := format('insert into public.application_materials '
                  '(user_id, kind, content, target_role) values (%L, %L, %L, %L)',
                  v_a, 'portfolio', repeat('x', 20001), 'Data Analyst');
  v_state := rls_probe.try_sql(v_sql);
  v_ok := v_state = '23514';
  perform rls_probe.log('e', 'e5 content of 20001 chars rejected by CHECK',
                        'result ' || v_state, v_ok);
  return next format('%-30s expected 23514,      got %-22s -> %s',
                     'e5 content 20001 chars', v_state,
                     case when v_ok then 'PASS' else 'FAIL' end);

  -- e6: A attaching its material to B's job application. Informational: the
  -- policy only checks user_id, and referential integrity is not RLS-filtered,
  -- so this records which way it went rather than asserting a direction.
  if v_b_app is null then
    perform rls_probe.note('e', 'e6 application_id of B',
                           'B owns no job application row, so the case could not be built');
    return next format('%-30s B owns no job application -> NOTE', 'e6 foreign application_id');
  else
    v_sql := format('insert into public.application_materials '
                    '(user_id, kind, content, target_role, application_id) '
                    'values (%L, %L, %L, %L, %L)',
                    v_a, 'portfolio', 'Portfolio review text', 'Data Analyst', v_b_app);
    v_state := rls_probe.try_sql(v_sql);
    perform rls_probe.note('e', 'e6 application_id pointing at B job application',
      format('as A, insert with application_id = B row %s returned %s', v_b_app, v_state));
    return next format('%-30s application_id = B row -> %s',
                       'e6 foreign application_id',
                       case when v_state = 'OK'
                            then 'ACCEPTED (RLS does not check the referenced row)'
                            else 'BLOCKED with ' || v_state end);
  end if;

  -- e7: the referential-integrity check itself, probed with a random uuid and
  -- with B's real one. Two different answers mean a learner can test whether a
  -- given job_application id exists, even though it can never read that row.
  if v_b_app is not null then
    select id into v_mat from public.application_materials
      where user_id = v_a order by kind limit 1;
    if v_mat is null then
      perform rls_probe.note('e', 'e7 existence oracle over application_id',
                             'A owns no material row, so the update pair could not run');
      return next format('%-30s no A material row -> NOTE', 'e7 existence oracle');
    else
      v_rand := rls_probe.try_sql(format(
        'update public.application_materials set application_id = gen_random_uuid() '
        'where id = %L', v_mat));
      v_foreign := rls_probe.try_sql(format(
        'update public.application_materials set application_id = %L where id = %L',
        v_b_app, v_mat));
      perform rls_probe.note('e', 'e7 existence oracle over application_id',
        format('unknown random application_id -> %s ; B''s real application_id -> %s',
               v_rand, v_foreign));
      return next format('%-30s random -> %s, B row -> %s',
                         'e7 existence oracle', v_rand, v_foreign);
    end if;
  end if;

  -- what A now holds
  return next format('%-30s A holds %s material row(s) of kinds: %s',
    'e* state after e1-e6',
    (select count(*)::text from public.application_materials where user_id = v_a),
    coalesce((select string_agg(kind, ', ' order by kind)
              from public.application_materials where user_id = v_a), '-'));
end;
$fn$;

do $do$ begin
  perform set_config('request.jwt.claim.sub',
                     (select id::text from rls_probe.account where label = 'A'), false);
end $do$;
set role authenticated;
select 'as authenticated with auth.uid() = '
       || coalesce(current_setting('request.jwt.claim.sub', true), 'NULL');
select rls_probe.assert_e() as assertion_e;
reset role;

-- ===========================================================================
-- 3g. negative control: prove this harness can actually see a leak
-- ===========================================================================
-- A green a-e would be worthless if the measurement could not fail, so one
-- table is given a deliberately broken policy - a permissive FOR SELECT with no
-- owner check - and the same counters assertion (a) uses must notice that B's
-- row is now visible to A. The policy is dropped again immediately, and the
-- final count confirms the schema is back to the migrated state before the
-- cascade test runs.

\echo ''
\echo '=========================================================================='
\echo ' 3g. negative control: temporary leaky policy on weekly_reviews'
\echo '     (placed before 3f on purpose: the cascade delete removes its rows)'
\echo '=========================================================================='

create policy "harness negative control: read everything"
on public.weekly_reviews for select
to authenticated
using (true);

create or replace function rls_probe.assert_g(p_expect_leak boolean)
returns setof text language plpgsql as $fn$
declare
  v_a uuid;
  v_seen bigint;
  v_foreign bigint;
  v_pred text;
  v_own bigint;
  v_ok boolean;
begin
  select id into v_a from rls_probe.account where label = 'A';
  select pred, n into v_pred, v_own from rls_probe.matrix
    where tbl = 'weekly_reviews' and account = v_a;
  execute 'select count(*) from public.weekly_reviews src' into v_seen;
  execute format('select count(*) from public.weekly_reviews src where not (%s)',
                 v_pred) into v_foreign;
  if p_expect_leak then
    v_ok := coalesce(v_foreign, 0) > 0;
    perform rls_probe.log('g', 'leaky FOR SELECT policy is detected',
      format('with using (true) in place, A sees %s row(s) of which %s are not A''s; '
             'the harness must report a leak', v_seen, coalesce(v_foreign, 0)), v_ok);
    return next format('%-42s sees %s, foreign %s -> %s',
                       'with leaky policy (must FAIL detection)', v_seen,
                       coalesce(v_foreign, 0),
                       case when v_ok then 'PASS harness detects the leak'
                            else 'FAIL harness is blind' end);
  else
    v_ok := coalesce(v_foreign, -1) = 0 and v_seen = v_own;
    perform rls_probe.log('g', 'control policy removed, isolation restored',
      format('after dropping the control policy A sees %s row(s), foreign %s (own truth %s)',
             v_seen, coalesce(v_foreign, 0), coalesce(v_own, 0)), v_ok);
    return next format('%-42s sees %s, foreign %s -> %s',
                       'after dropping the control policy', v_seen,
                       coalesce(v_foreign, 0),
                       case when v_ok then 'PASS isolation restored' else 'FAIL' end);
  end if;
end;
$fn$;

do $do$ begin
  perform set_config('request.jwt.claim.sub',
                     (select id::text from rls_probe.account where label = 'A'), false);
end $do$;
set role authenticated;
select rls_probe.assert_g(true) as assertion_g_leaky;
reset role;

drop policy "harness negative control: read everything" on public.weekly_reviews;

set role authenticated;
select rls_probe.assert_g(false) as assertion_g_restored;
reset role;

-- ===========================================================================
-- 3f. cascade proof: deleting the auth.users row must erase the whole account
-- ===========================================================================

\echo ''
\echo '=========================================================================='
\echo ' 3f. delete auth.users for A, then look for any surviving row'
\echo '=========================================================================='

create or replace function rls_probe.assert_f()
returns setof text language plpgsql as $fn$
declare
  v_a uuid;
  v_b uuid;
  v_rec record;
  v_left bigint;
  v_left_ids bigint;
  v_b_after bigint;
  v_b_ids bigint;
  v_skills bigint;
  v_ok boolean;
begin
  select id into v_a from rls_probe.account where label = 'A';
  select id into v_b from rls_probe.account where label = 'B';

  for v_rec in
      select m.tbl,
             m.pred as a_pred, m.ids as a_ids, m.idcol, m.n as a_n,
             p.pred as b_pred, p.ids as b_ids, p.n as b_n
      from rls_probe.matrix m
      join rls_probe.matrix p on p.tbl = m.tbl
      where m.account = v_a and p.account = v_b
      order by m.tbl
  loop
    if v_rec.a_pred is null then
      perform rls_probe.log('f', v_rec.tbl, 'no owner path, cannot check leftovers', false);
      return next format('%-28s NO OWNER PATH -> FAIL', v_rec.tbl);
      continue;
    end if;
    -- by ownership predicate: catches a row that still points at A
    execute format('select count(*) from public.%I src where (%s)',
                   v_rec.tbl, v_rec.a_pred) into v_left;
    -- by the ids A owned before the delete: catches a row that survived with its
    -- owner link nulled out (ON DELETE SET NULL), which the predicate alone misses
    execute format('select count(*) from public.%I src '
                   'where src.%I::text = any (cast($1 as text[]))',
                   v_rec.tbl, v_rec.idcol) into v_left_ids using v_rec.a_ids;
    execute format('select count(*) from public.%I src where (%s)',
                   v_rec.tbl, v_rec.b_pred) into v_b_after;
    execute format('select count(*) from public.%I src '
                   'where src.%I::text = any (cast($1 as text[]))',
                   v_rec.tbl, v_rec.idcol) into v_b_ids using v_rec.b_ids;
    v_ok := coalesce(v_left, -1) = 0 and coalesce(v_left_ids, -1) = 0
        and v_b_after = v_rec.b_n and v_b_ids = v_rec.b_n;
    perform rls_probe.log('f', v_rec.tbl,
      format('before: A owned %s, B owned %s | after: rows still matching A = %s, '
             'A pre-delete ids still present = %s | B rows still present = %s/%s (by id %s)',
             coalesce(v_rec.a_n, 0), coalesce(v_rec.b_n, 0),
             coalesce(v_left, -1), coalesce(v_left_ids, -1),
             coalesce(v_b_after, -1), coalesce(v_rec.b_n, 0), coalesce(v_b_ids, -1)), v_ok);
    return next format('%-28s A leftovers %s/%s, B survived %s/%s -> %s',
                       v_rec.tbl, coalesce(v_left, -1), coalesce(v_left_ids, -1),
                       coalesce(v_b_after, -1), coalesce(v_rec.b_n, 0),
                       case when v_ok then 'PASS' else 'FAIL' end);
  end loop;

  select count(*) into v_skills from public.skills;
  v_ok := v_skills = (select value::bigint from rls_probe.meta where key = 'skills_rows');
  perform rls_probe.log('f', 'skills (shared catalog must be untouched)',
                        format('rows after the delete = %s, before = %s', v_skills,
                               (select value::bigint from rls_probe.meta where key = 'skills_rows')),
                        v_ok);
  return next format('%-28s skills rows %s -> %s', 'f* skills', v_skills,
                     case when v_ok then 'PASS' else 'FAIL' end);

  return next format('%-28s auth.users rows left = %s', 'f* auth.users',
                     (select count(*) from auth.users));
end;
$fn$;

select 'auth.users rows before the delete: ' || count(*)::text from auth.users;

delete from auth.users where id = (select id from rls_probe.account where label = 'A');

select 'auth.users rows after the delete:  ' || count(*)::text from auth.users;

select rls_probe.assert_f() as assertion_f;

-- ===========================================================================
-- 4. verdicts
-- ===========================================================================

\echo ''
\echo '=========================================================================='
\echo ' 4. every recorded check'
\echo '=========================================================================='

select assertion as which, target as checked, observed as evidence, verdict
from rls_probe.result
 where assertion <> 'pre'
 order by ord;

\echo ''
\echo '=========================================================================='
\echo ' 5. PASS / FAIL per numbered assertion'
\echo '=========================================================================='

with g as (
  select assertion,
         count(*) as checks,
         count(*) filter (where verdict = 'PASS') as passed,
         count(*) filter (where verdict = 'FAIL') as failed,
         count(*) filter (where verdict = 'NOTE') as notes,
         coalesce(string_agg(target, ' ; ' order by target)
                  filter (where verdict = 'FAIL'), '-') as failing_targets
  from rls_probe.result
  where assertion <> 'pre'
  group by assertion)
select format('assertion %-2s %s  (checks=%s passed=%s failed=%s notes=%s)  failing=[%s]',
              assertion || ':',
              case when failed = 0 then 'PASS' else 'FAIL' end,
              checks, passed, failed, notes, left(failing_targets, 300)) as result
from g
order by case assertion
           when 'a' then 1 when 'b' then 2 when 'c' then 3 when 'd' then 4
           when 'e' then 5 when 'f' then 6 when 'g' then 7 else 9 end;

\echo ''
do $do$
declare v_f int;
begin
  select count(*) into v_f from rls_probe.result where verdict = 'FAIL';
  if v_f > 0 then
    raise exception 'RLS PROBE RESULT: % check(s) FAILED - the FAIL rows above name the tables', v_f;
  end if;
  raise notice 'RLS PROBE RESULT: every assertion passed';
end;
$do$;
