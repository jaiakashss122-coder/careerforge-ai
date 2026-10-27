-- Phase 6: Application Materials.
--
-- The résumé, the LinkedIn guidance and the portfolio review are all derived
-- from rows this account already owns, so nothing here copies them again. What
-- is worth storing is the text the learner wrote themselves, and a fingerprint
-- of the records that text was written against — without the fingerprint a
-- draft saved months ago would look as current as the screen beside it.

-- 1. One saved draft per learner per document. The generated blocks stay
--    derived; only the learner's own words are kept, and this app stops
--    touching them after the save.
create table public.application_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('resume', 'linkedin', 'portfolio')),
  content text not null default '' check (char_length(content) <= 20000),
  target_role text not null default '',
  application_id uuid references public.job_applications (id) on delete set null,
  built_from jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_materials_one_per_kind unique (user_id, kind)
);

-- Deleting the role a draft was tailored to must not delete the draft: the
-- learner wrote the text, and losing it would be worse than losing the link.
-- No index on (user_id, kind) is added because the unique constraint above
-- already builds one.
create index application_materials_application_idx
  on public.application_materials (application_id);

create trigger application_materials_set_updated_at
before update on public.application_materials
for each row execute function public.set_updated_at();

alter table public.application_materials enable row level security;

create policy "Materials: read own"
on public.application_materials for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Materials: insert own"
on public.application_materials for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Materials: update own"
on public.application_materials for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Materials: delete own"
on public.application_materials for delete
to authenticated
using ((select auth.uid()) = user_id);
