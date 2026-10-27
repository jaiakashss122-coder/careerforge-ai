-- Phase 5: Interview Preparation.
--
-- job_applications already existed in the initial schema with owner-only row
-- level security but no room for the posting text, and there was no table at
-- all for practised questions. Both gaps are closed here, and nothing is
-- dropped or rewritten in place.

-- 1. A saved posting has to keep the words it was read from. Without the text
--    the skill comparison could never be re-run or checked by the learner, so
--    it becomes a one-time claim about a page this app cannot open.
alter table public.job_applications
  add column if not exists description text not null default '';

-- 2. The initial constraint listed 'rejected' and 'withdrawn' as separate
--    statuses. The screen records one closing status and asks for the reason in
--    the notes, because a rejection and a withdrawal are the same thing to
--    plan around: this application is finished. The database had not been
--    created when this decision was made, so no row uses the old values.
alter table public.job_applications
  drop constraint if exists job_applications_status_check;

alter table public.job_applications
  add constraint job_applications_status_check
  check (status in ('saved', 'prepared', 'applied', 'interviewing', 'offer', 'closed'));

-- 3. One practice interview, and the questions it asked.
create table public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  topics jsonb not null default '[]'::jsonb,
  question_ids jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index mock_interviews_user_started_idx
  on public.mock_interviews (user_id, started_at desc);

alter table public.mock_interviews enable row level security;

create policy "Mock interviews: read own"
on public.mock_interviews for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Mock interviews: insert own"
on public.mock_interviews for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Mock interviews: update own"
on public.mock_interviews for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Mock interviews: delete own"
on public.mock_interviews for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 4. One answered question. prompt and skills are copied from the question bank
--    at the moment of answering, so a later edit to the bank cannot rewrite
--    what a learner was actually asked, and an old attempt stays readable.
create table public.interview_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  interview_id uuid references public.mock_interviews (id) on delete cascade,
  question_id text not null,
  topic text not null
    check (topic in (
      'python', 'sql', 'statistics',
      'machine-learning', 'behavioural', 'role-specific'
    )),
  prompt text not null,
  answer_text text not null default '',
  rating text not null
    check (rating in ('covered', 'partial', 'not-covered')),
  skills jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index interview_attempts_user_created_idx
  on public.interview_attempts (user_id, created_at desc);

create index interview_attempts_interview_idx
  on public.interview_attempts (interview_id, created_at);

-- One rating per question inside one interview. Without it a double tap could
-- record two answers for the same question, and the finished interview could
-- not say whether a question was answered or skipped.
create unique index interview_attempts_interview_question_idx
  on public.interview_attempts (interview_id, question_id)
  where interview_id is not null;

alter table public.interview_attempts enable row level security;

create policy "Interview attempts: read own"
on public.interview_attempts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Interview attempts: insert own"
on public.interview_attempts for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Interview attempts: update own"
on public.interview_attempts for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Interview attempts: delete own"
on public.interview_attempts for delete
to authenticated
using ((select auth.uid()) = user_id);
