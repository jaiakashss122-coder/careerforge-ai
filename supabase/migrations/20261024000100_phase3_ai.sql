-- Phase 3: AI Tutor and Prompt Studio support.
-- Keeps demo output distinguishable from live provider output and records
-- per-user AI usage so server-side quotas survive a process restart.

alter table public.tutor_messages
  add column if not exists is_demo boolean not null default false;

alter table public.saved_prompts
  add column if not exists is_demo boolean not null default false;

create table if not exists public.ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature in ('tutor', 'prompt')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_usage_events enable row level security;

create policy "AI usage: read own"
on public.ai_usage_events for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "AI usage: insert own"
on public.ai_usage_events for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "AI usage: delete own"
on public.ai_usage_events for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, delete on public.ai_usage_events to authenticated;
grant usage, select on sequence public.ai_usage_events_id_seq to authenticated;
