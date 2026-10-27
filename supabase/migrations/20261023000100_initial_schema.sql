-- CareerForge AI — initial schema
-- Apply with the Supabase SQL editor or `supabase db push`.
--
-- Ownership model: every user-owned row cascades from auth.users, and RLS only
-- exposes rows where the authenticated user owns the record (directly or
-- through a parent record).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  degree text not null default 'B.Tech CSE',
  degree_specialization text not null default 'Data Science',
  year_of_study text not null default 'Second year'
    check (year_of_study in ('First year', 'Second year', 'Third year', 'Fourth year', 'Graduated', 'Other')),
  graduation_year smallint
    check (graduation_year is null or graduation_year between 2024 and 2040),
  self_reported_python text not null default 'basic'
    check (self_reported_python in ('unassessed', 'none', 'foundational', 'beginner', 'basic', 'intermediate', 'advanced')),
  self_reported_sql text not null default 'beginner'
    check (self_reported_sql in ('unassessed', 'none', 'foundational', 'beginner', 'basic', 'intermediate', 'advanced')),
  self_reported_web text not null default 'foundational'
    check (self_reported_web in ('unassessed', 'none', 'foundational', 'beginner', 'basic', 'intermediate', 'advanced')),
  self_reported_statistics text not null default 'unassessed'
    check (self_reported_statistics in ('unassessed', 'none', 'foundational', 'beginner', 'basic', 'intermediate', 'advanced')),
  self_reported_ml text not null default 'unassessed'
    check (self_reported_ml in ('unassessed', 'none', 'foundational', 'beginner', 'basic', 'intermediate', 'advanced')),
  self_reported_git text not null default 'unassessed'
    check (self_reported_git in ('unassessed', 'none', 'foundational', 'beginner', 'basic', 'intermediate', 'advanced')),
  career_status text not null default 'undecided'
    check (career_status in ('undecided', 'exploring', 'decided')),
  target_career_slug text
    check (
      target_career_slug is null
      or target_career_slug in (
        'data-analyst',
        'business-intelligence-analyst',
        'data-scientist',
        'machine-learning-engineer',
        'applied-ai-engineer',
        'generative-ai-engineer',
        'data-engineer',
        'mlops-engineer',
        'ai-automation-engineer'
      )
    ),
  career_note text not null default '',
  weekly_hours smallint not null default 10
    check (weekly_hours between 1 and 60),
  preferred_session_minutes smallint not null default 45
    check (preferred_session_minutes in (20, 45, 90)),
  learning_preferences text[] not null
    default '{practical-projects,clear-explanations,hands-on-exercises,personalized-guidance}'::text[],
  tools text[] not null default '{vscode,ai-coding-agent}'::text[],
  primary_goal text not null
    default 'Become internship-ready and build long-term data and future-tech career skills.',
  internship_target_month text
    check (
      internship_target_month is null
      or internship_target_month ~ '^\d{4}-(0[1-9]|1[0-2])$'
    ),
  constraints_note text not null default '',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Creates a profile shell on signup. Onboarding fills in the rest.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "Profiles: read own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Profiles: insert own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Profiles: update own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Skill catalog and assessment
-- ---------------------------------------------------------------------------

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null
    check (category in ('programming', 'sql', 'data-science', 'machine-learning', 'software-development', 'ai-engineering', 'career')),
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.skills enable row level security;

create policy "Skills: public read"
on public.skills for select
to anon, authenticated
using (true);

create table public.skill_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_type text not null default 'initial'
    check (assessment_type in ('initial', 'retake', 'checkpoint')),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  overall_score numeric(6, 2) check (overall_score is null or overall_score >= 0),
  max_score numeric(6, 2) check (max_score is null or max_score > 0),
  confidence_average numeric(4, 2) check (confidence_average is null or confidence_average between 1 and 5),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index skill_assessments_user_idx
  on public.skill_assessments (user_id, started_at desc);

alter table public.skill_assessments enable row level security;

create policy "Assessments: read own"
on public.skill_assessments for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Assessments: insert own"
on public.skill_assessments for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Assessments: update own"
on public.skill_assessments for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Assessments: delete own"
on public.skill_assessments for delete
to authenticated
using ((select auth.uid()) = user_id);

create table public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.skill_assessments (id) on delete cascade,
  section text not null
    check (section in ('programming', 'sql', 'data-science', 'software-development', 'career', 'constraints')),
  question_key text not null,
  question_type text not null
    check (question_type in ('multiple_choice', 'short_answer', 'code', 'self_report', 'preference')),
  prompt_text text not null,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean,
  score numeric(6, 2) check (score is null or score >= 0),
  max_score numeric(6, 2) check (max_score is null or max_score > 0),
  self_confidence smallint check (self_confidence is null or self_confidence between 1 and 5),
  concept text,
  feedback text,
  remedial_lesson_slug text,
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (assessment_id, question_key)
);

create index assessment_answers_assessment_idx
  on public.assessment_answers (assessment_id);

alter table public.assessment_answers enable row level security;

create policy "Assessment answers: read own"
on public.assessment_answers for select
to authenticated
using (
  exists (
    select 1 from public.skill_assessments a
    where a.id = assessment_id
      and a.user_id = (select auth.uid())
  )
);

create policy "Assessment answers: insert own"
on public.assessment_answers for insert
to authenticated
with check (
  exists (
    select 1 from public.skill_assessments a
    where a.id = assessment_id
      and a.user_id = (select auth.uid())
  )
);

create policy "Assessment answers: update own"
on public.assessment_answers for update
to authenticated
using (
  exists (
    select 1 from public.skill_assessments a
    where a.id = assessment_id
      and a.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.skill_assessments a
    where a.id = assessment_id
      and a.user_id = (select auth.uid())
  )
);

create policy "Assessment answers: delete own"
on public.assessment_answers for delete
to authenticated
using (
  exists (
    select 1 from public.skill_assessments a
    where a.id = assessment_id
      and a.user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Skill evidence (separate from self-reported confidence)
-- ---------------------------------------------------------------------------

create table public.user_skill_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete restrict,
  source_type text not null
    check (source_type in ('assessment', 'lesson', 'quiz', 'project', 'interview', 'self_report')),
  source_id uuid,
  evidence_level text not null
    check (evidence_level in ('exposure', 'guided_practice', 'independent_practice', 'project_evidence', 'interview_evidence')),
  score numeric(6, 2) check (score is null or score >= 0),
  verified boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index user_skill_evidence_user_skill_idx
  on public.user_skill_evidence (user_id, skill_id, created_at desc);
create index user_skill_evidence_skill_idx
  on public.user_skill_evidence (skill_id);

alter table public.user_skill_evidence enable row level security;

create policy "Evidence: read own"
on public.user_skill_evidence for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Evidence: insert own"
on public.user_skill_evidence for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Evidence: update own"
on public.user_skill_evidence for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Evidence: delete own"
on public.user_skill_evidence for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Roadmaps
-- ---------------------------------------------------------------------------

create table public.learning_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'completed', 'archived')),
  start_date date,
  end_date date,
  focus_tracks text[] not null default '{}'::text[],
  source text not null default 'assessment'
    check (source in ('assessment', 'manual', 'checkpoint')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index learning_roadmaps_user_status_idx
  on public.learning_roadmaps (user_id, status, created_at desc);

create trigger learning_roadmaps_set_updated_at
before update on public.learning_roadmaps
for each row execute function public.set_updated_at();

alter table public.learning_roadmaps enable row level security;

create policy "Roadmaps: read own"
on public.learning_roadmaps for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Roadmaps: insert own"
on public.learning_roadmaps for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Roadmaps: update own"
on public.learning_roadmaps for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Roadmaps: delete own"
on public.learning_roadmaps for delete
to authenticated
using ((select auth.uid()) = user_id);

create table public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.learning_roadmaps (id) on delete cascade,
  skill_id uuid references public.skills (id) on delete set null,
  week_number smallint not null check (week_number between 1 and 52),
  order_index smallint not null default 0,
  title text not null,
  description text not null default '',
  category text not null default 'learning',
  estimated_minutes smallint check (estimated_minutes is null or estimated_minutes > 0),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped', 'rescheduled')),
  resources jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index roadmap_tasks_roadmap_idx
  on public.roadmap_tasks (roadmap_id, week_number, order_index);
create index roadmap_tasks_skill_idx on public.roadmap_tasks (skill_id);

create trigger roadmap_tasks_set_updated_at
before update on public.roadmap_tasks
for each row execute function public.set_updated_at();

alter table public.roadmap_tasks enable row level security;

create policy "Roadmap tasks: read own"
on public.roadmap_tasks for select
to authenticated
using (
  exists (
    select 1 from public.learning_roadmaps r
    where r.id = roadmap_id
      and r.user_id = (select auth.uid())
  )
);

create policy "Roadmap tasks: insert own"
on public.roadmap_tasks for insert
to authenticated
with check (
  exists (
    select 1 from public.learning_roadmaps r
    where r.id = roadmap_id
      and r.user_id = (select auth.uid())
  )
);

create policy "Roadmap tasks: update own"
on public.roadmap_tasks for update
to authenticated
using (
  exists (
    select 1 from public.learning_roadmaps r
    where r.id = roadmap_id
      and r.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.learning_roadmaps r
    where r.id = roadmap_id
      and r.user_id = (select auth.uid())
  )
);

create policy "Roadmap tasks: delete own"
on public.roadmap_tasks for delete
to authenticated
using (
  exists (
    select 1 from public.learning_roadmaps r
    where r.id = roadmap_id
      and r.user_id = (select auth.uid())
  )
);

create table public.roadmap_task_prerequisites (
  task_id uuid not null references public.roadmap_tasks (id) on delete cascade,
  prerequisite_task_id uuid not null references public.roadmap_tasks (id) on delete cascade,
  primary key (task_id, prerequisite_task_id),
  check (task_id <> prerequisite_task_id)
);

create index roadmap_task_prerequisites_prereq_idx
  on public.roadmap_task_prerequisites (prerequisite_task_id);

alter table public.roadmap_task_prerequisites enable row level security;

create policy "Roadmap prerequisites: read own"
on public.roadmap_task_prerequisites for select
to authenticated
using (
  exists (
    select 1
    from public.roadmap_tasks t
    join public.learning_roadmaps r on r.id = t.roadmap_id
    where t.id = task_id
      and r.user_id = (select auth.uid())
  )
);

create policy "Roadmap prerequisites: insert own"
on public.roadmap_task_prerequisites for insert
to authenticated
with check (
  exists (
    select 1
    from public.roadmap_tasks t
    join public.learning_roadmaps r on r.id = t.roadmap_id
    where t.id = task_id
      and r.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.roadmap_tasks t
    join public.learning_roadmaps r on r.id = t.roadmap_id
    where t.id = prerequisite_task_id
      and r.user_id = (select auth.uid())
  )
);

create policy "Roadmap prerequisites: delete own"
on public.roadmap_task_prerequisites for delete
to authenticated
using (
  exists (
    select 1
    from public.roadmap_tasks t
    join public.learning_roadmaps r on r.id = t.roadmap_id
    where t.id = task_id
      and r.user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Lessons, quizzes, and study sessions
-- ---------------------------------------------------------------------------

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  roadmap_task_id uuid references public.roadmap_tasks (id) on delete set null,
  title text not null,
  objective text not null default '',
  content jsonb not null default '{}'::jsonb,
  estimated_minutes smallint check (estimated_minutes is null or estimated_minutes > 0),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lessons_user_status_idx
  on public.lessons (user_id, status, created_at desc);
create index lessons_roadmap_task_idx on public.lessons (roadmap_task_id);

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

alter table public.lessons enable row level security;

create policy "Lessons: read own"
on public.lessons for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Lessons: insert own"
on public.lessons for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Lessons: update own"
on public.lessons for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Lessons: delete own"
on public.lessons for delete
to authenticated
using ((select auth.uid()) = user_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  skill_id uuid references public.skills (id) on delete set null,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  score numeric(6, 2) check (score is null or score >= 0),
  max_score numeric(6, 2) check (max_score is null or max_score > 0),
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index quiz_attempts_user_taken_idx
  on public.quiz_attempts (user_id, taken_at desc);
create index quiz_attempts_lesson_idx on public.quiz_attempts (lesson_id);
create index quiz_attempts_skill_idx on public.quiz_attempts (skill_id);

alter table public.quiz_attempts enable row level security;

create policy "Quiz attempts: read own"
on public.quiz_attempts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Quiz attempts: insert own"
on public.quiz_attempts for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Quiz attempts: update own"
on public.quiz_attempts for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Quiz attempts: delete own"
on public.quiz_attempts for delete
to authenticated
using ((select auth.uid()) = user_id);

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  roadmap_task_id uuid references public.roadmap_tasks (id) on delete set null,
  mode text not null
    check (mode in ('quick', 'focused', 'project', 'review')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  planned_minutes smallint check (planned_minutes is null or planned_minutes > 0),
  actual_minutes smallint check (actual_minutes is null or actual_minutes >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index learning_sessions_user_started_idx
  on public.learning_sessions (user_id, started_at desc);
create index learning_sessions_lesson_idx on public.learning_sessions (lesson_id);
create index learning_sessions_roadmap_task_idx on public.learning_sessions (roadmap_task_id);
create unique index learning_sessions_one_active_per_user
  on public.learning_sessions (user_id)
  where status = 'active';

alter table public.learning_sessions enable row level security;

create policy "Sessions: read own"
on public.learning_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Sessions: insert own"
on public.learning_sessions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    roadmap_task_id is null
    or exists (
      select 1
      from public.roadmap_tasks t
      join public.learning_roadmaps r on r.id = t.roadmap_id
      where t.id = roadmap_task_id
        and r.user_id = (select auth.uid())
    )
  )
  and (
    lesson_id is null
    or exists (
      select 1 from public.lessons l
      where l.id = lesson_id
        and l.user_id = (select auth.uid())
    )
  )
);

create policy "Sessions: update own"
on public.learning_sessions for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    roadmap_task_id is null
    or exists (
      select 1
      from public.roadmap_tasks t
      join public.learning_roadmaps r on r.id = t.roadmap_id
      where t.id = roadmap_task_id
        and r.user_id = (select auth.uid())
    )
  )
  and (
    lesson_id is null
    or exists (
      select 1 from public.lessons l
      where l.id = lesson_id
        and l.user_id = (select auth.uid())
    )
  )
);

create policy "Sessions: delete own"
on public.learning_sessions for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Career exploration
-- ---------------------------------------------------------------------------

create table public.career_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  career_slug text not null,
  title text not null,
  brief text not null default '',
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  interest_rating smallint check (interest_rating is null or interest_rating between 1 and 5),
  difficulty_rating smallint check (difficulty_rating is null or difficulty_rating between 1 and 5),
  enjoyment_rating smallint check (enjoyment_rating is null or enjoyment_rating between 1 and 5),
  willingness_rating smallint check (willingness_rating is null or willingness_rating between 1 and 5),
  reflection text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index career_experiments_user_status_idx
  on public.career_experiments (user_id, status, created_at desc);

create trigger career_experiments_set_updated_at
before update on public.career_experiments
for each row execute function public.set_updated_at();

alter table public.career_experiments enable row level security;

create policy "Experiments: read own"
on public.career_experiments for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Experiments: insert own"
on public.career_experiments for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Experiments: update own"
on public.career_experiments for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Experiments: delete own"
on public.career_experiments for delete
to authenticated
using ((select auth.uid()) = user_id);

create table public.career_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  interest_numerical smallint check (interest_numerical is null or interest_numerical between 1 and 5),
  interest_software smallint check (interest_software is null or interest_software between 1 and 5),
  interest_research smallint check (interest_research is null or interest_research between 1 and 5),
  interest_business smallint check (interest_business is null or interest_business between 1 and 5),
  interest_automation smallint check (interest_automation is null or interest_automation between 1 and 5),
  interest_ai smallint check (interest_ai is null or interest_ai between 1 and 5),
  preferred_work_style text,
  preferred_learning_activities text[] not null default '{}'::text[],
  constraints_data jsonb not null default '{}'::jsonb,
  specialization_choice text,
  alternative_choice text,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger career_preferences_set_updated_at
before update on public.career_preferences
for each row execute function public.set_updated_at();

alter table public.career_preferences enable row level security;

create policy "Career preferences: read own"
on public.career_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Career preferences: insert own"
on public.career_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Career preferences: update own"
on public.career_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_slug text,
  title text not null,
  problem_statement text not null default '',
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'paused')),
  repo_url text,
  deployment_url text,
  self_assessment jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_status_idx
  on public.projects (user_id, status, created_at desc);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "Projects: read own"
on public.projects for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Projects: insert own"
on public.projects for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Projects: update own"
on public.projects for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Projects: delete own"
on public.projects for delete
to authenticated
using ((select auth.uid()) = user_id);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text not null default '',
  order_index smallint not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  evidence_url text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index project_milestones_project_idx
  on public.project_milestones (project_id, order_index);

alter table public.project_milestones enable row level security;

create policy "Milestones: read own"
on public.project_milestones for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Milestones: insert own"
on public.project_milestones for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Milestones: update own"
on public.project_milestones for update
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Milestones: delete own"
on public.project_milestones for delete
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Prompt studio
-- ---------------------------------------------------------------------------

create table public.saved_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null,
  body text not null,
  tags text[] not null default '{}'::text[],
  source text not null default 'generated'
    check (source in ('generated', 'edited', 'template')),
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_prompts_user_updated_idx
  on public.saved_prompts (user_id, updated_at desc);
create index saved_prompts_tags_idx
  on public.saved_prompts using gin (tags);

create trigger saved_prompts_set_updated_at
before update on public.saved_prompts
for each row execute function public.set_updated_at();

alter table public.saved_prompts enable row level security;

create policy "Prompts: read own"
on public.saved_prompts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Prompts: insert own"
on public.saved_prompts for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Prompts: update own"
on public.saved_prompts for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Prompts: delete own"
on public.saved_prompts for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- AI tutor conversations
-- ---------------------------------------------------------------------------

create table public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null default 'New conversation',
  mode text not null default 'beginner-explanation',
  career_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tutor_conversations_user_updated_idx
  on public.tutor_conversations (user_id, updated_at desc);
create index tutor_conversations_lesson_idx on public.tutor_conversations (lesson_id);

create trigger tutor_conversations_set_updated_at
before update on public.tutor_conversations
for each row execute function public.set_updated_at();

alter table public.tutor_conversations enable row level security;

create policy "Tutor conversations: read own"
on public.tutor_conversations for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Tutor conversations: insert own"
on public.tutor_conversations for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Tutor conversations: update own"
on public.tutor_conversations for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Tutor conversations: delete own"
on public.tutor_conversations for delete
to authenticated
using ((select auth.uid()) = user_id);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  token_count integer check (token_count is null or token_count >= 0),
  created_at timestamptz not null default now()
);

create index tutor_messages_conversation_idx
  on public.tutor_messages (conversation_id, created_at);

alter table public.tutor_messages enable row level security;

create policy "Tutor messages: read own"
on public.tutor_messages for select
to authenticated
using (
  exists (
    select 1 from public.tutor_conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
  )
);

create policy "Tutor messages: insert own"
on public.tutor_messages for insert
to authenticated
with check (
  exists (
    select 1 from public.tutor_conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
  )
);

create policy "Tutor messages: delete own"
on public.tutor_messages for delete
to authenticated
using (
  exists (
    select 1 from public.tutor_conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Internship preparation
-- ---------------------------------------------------------------------------

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role_title text not null,
  job_url text,
  location text,
  source_kind text not null default 'real'
    check (source_kind in ('real', 'example')),
  status text not null default 'saved'
    check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
  applied_on date,
  next_action text,
  next_action_on date,
  skills jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_applications_user_status_idx
  on public.job_applications (user_id, status, updated_at desc);

create trigger job_applications_set_updated_at
before update on public.job_applications
for each row execute function public.set_updated_at();

alter table public.job_applications enable row level security;

create policy "Applications: read own"
on public.job_applications for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Applications: insert own"
on public.job_applications for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Applications: update own"
on public.job_applications for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Applications: delete own"
on public.job_applications for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Weekly reviews
-- ---------------------------------------------------------------------------

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  planned_minutes integer check (planned_minutes is null or planned_minutes >= 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  wins text not null default '',
  challenges text not null default '',
  next_focus text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index weekly_reviews_user_week_idx
  on public.weekly_reviews (user_id, week_start desc);

create trigger weekly_reviews_set_updated_at
before update on public.weekly_reviews
for each row execute function public.set_updated_at();

alter table public.weekly_reviews enable row level security;

create policy "Weekly reviews: read own"
on public.weekly_reviews for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Weekly reviews: insert own"
on public.weekly_reviews for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Weekly reviews: update own"
on public.weekly_reviews for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Weekly reviews: delete own"
on public.weekly_reviews for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Table privileges (RLS still decides row visibility)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.skill_assessments to authenticated;
grant select, insert, update, delete on public.assessment_answers to authenticated;
grant select, insert, update, delete on public.user_skill_evidence to authenticated;
grant select, insert, update, delete on public.learning_roadmaps to authenticated;
grant select, insert, update, delete on public.roadmap_tasks to authenticated;
grant select, insert, update, delete on public.roadmap_task_prerequisites to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.quiz_attempts to authenticated;
grant select, insert, update, delete on public.learning_sessions to authenticated;
grant select, insert, update, delete on public.career_experiments to authenticated;
grant select, insert, update on public.career_preferences to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_milestones to authenticated;
grant select, insert, update, delete on public.saved_prompts to authenticated;
grant select, insert, update, delete on public.tutor_conversations to authenticated;
grant select, insert, delete on public.tutor_messages to authenticated;
grant select, insert, update, delete on public.job_applications to authenticated;
grant select, insert, update, delete on public.weekly_reviews to authenticated;
grant select on public.skills to anon, authenticated;
