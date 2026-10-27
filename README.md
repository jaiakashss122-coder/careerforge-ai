# CareerForge AI

A personalized learning and career workspace for data science and future-tech roles. CareerForge AI is built in reviewable phases; this repository currently contains **Phase 5: the Career Explorer, where nine data and AI roles are ranked from your assessment answers and then tested with hands-on experiments whose reflections move the ranking, and Industry Intelligence, a dated snapshot of 22 sourced changes in the field that sorts itself against your own records**. Phase 4 (Project Lab and progress analytics), Phase 3 (AI Tutor and Prompt Studio) and Phase 2 (assessment, roadmap, dashboard) are also in the repository.

The application is intentionally honest about scope:

- It does not invent skill mastery, study activity, projects, or career evidence.
- Self-reported confidence is kept separate from the assessment's demonstrated score. A skipped or incorrect answer points to a concept and a remedial step; it never silently lowers or raises a mastery claim.
- Without Supabase credentials, the app runs in a clearly labeled **local preview mode**. Profile, assessment, roadmap, session, project, evidence, career experiment, career choice, tutor, and prompt records live in this browser only; no account is simulated.
- Without an AI provider key, tutor replies and generated prompts come from deterministic curated demo content and are labeled as demo output in the UI and in stored records.
- Unfinished destinations render an explicit "Planned for Phase N" page instead of placeholder charts or fake data.
- Weekly hours and task minutes are **plans**, not recorded activity. Recorded study time starts at zero and only accumulates when a session is started and completed.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, security boundaries, and phase plan.

## What works in Phase 5

| Area | Status |
| --- | --- |
| Responsive application shell with 11 destinations, 10 of them working | Working |
| Profile onboarding and editing with validation | Working |
| Adaptive skill assessment: 13 technical probes with follow-ups, 4 confidence checks, career interests and constraints | Working in preview; Supabase persistence implemented, requires a project to exercise |
| Assessment results: demonstrated score, strengths, gaps, remedial pointers, career hypotheses, first-30-days plan | Working |
| Initial 13-week roadmap created automatically after the first assessment (41 tasks) | Working |
| Roadmap rebuild with exactly two focus tracks; old plan archived only after confirmation | Working |
| Weeks 11–12 career experiments and a week 13 specialization checkpoint | Working (generated plan) |
| Prerequisite gates, guarded completion/reopen, rescheduling that preserves progress | Working |
| Daily dashboard: assessment-first gate, today's objective, session controls, weekly and overall recorded progress | Working |
| Study sessions at 20/45/90/120 minutes; elapsed time computed from stored timestamps (server-side in Supabase mode) | Working |
| Abandoned sessions retained and labeled "Not counted" | Working |
| AI Tutor with 11 teaching modes, optional roadmap-task context, saved conversations | Working in preview (demo replies); Supabase persistence implemented |
| Prompt Studio with 16 categories, editable prompt body, tags, search, copy, reuse, save | Working in preview (demo templates); Supabase persistence implemented |
| Provider adapter with timeouts, one retry on transient failures, bounded input, and validated output | Implemented; requires AI server variables to exercise live |
| Per-user AI quotas: 10 requests per 10 minutes and 60 per day | Enforced in Supabase mode from durable usage events; mirrored locally in preview |
| Settings export of local data, and deletion of learning data while keeping profile/account | Working |
| Supabase per-user persistence with RLS, server-side account export route | Implemented; requires migrations and a live project |
| Project Lab: 10 project templates with motivation, dataset guidance, ordered milestones, folder structure, testing checklist, metrics, and interview questions | Working |
| Prerequisite gating from demonstrated evidence only (scored assessment section, completed roadmap task, or an earlier project); degree and confidence are never accepted as substitutes | Working |
| Milestone ordering, evidence links per milestone, repository link required before completion, reopen withdraws the evidence it created | Working |
| Six-criteria self-scored rubric, gated behind completion and stored separately from assessment results | Working |
| Progress analytics: proficiency by category, recorded study time, separate evidence lanes, accuracy, repeated mistakes, revision backlog, weekly consistency, roadmap and project summaries | Working |
| One ranked "What should I do next?" action with the rule that picked it | Working |
| Career Explorer: nine role profiles (responsibilities, tools, skills the workspace can evidence, portfolio projects, interview topics, entry bar, progression) | Working — no salary, hiring-statistic or opening claims anywhere in it |
| Nine hands-on experiments in five kinds (analytics, data science, AI applications, data engineering, machine learning engineering) with steps, observation notes, and the piece of work you keep | Working |
| Experiment honesty gate: a tested result needs a link to the work produced plus four whole-number reflections; nothing is logged as study time | Working |
| Ranking that shows both parts: assessment fit out of 100, then up to ±15 points from your reflection; difficulty is recorded but never scored | Working |
| Confidence labels naming exactly what each position rests on (assessment only / one experiment / experiment plus finished project work) | Working |
| Specialization stage that stays exploratory until the leader is tested, two experiments are finished, and project work is complete, with every missing condition listed | Working |
| Your own choice over the recommendation, kept visible with your written reason and removable | Working |
| Industry Intelligence: 22 sourced entries in 7 areas, each with its own source link, publication date and read date; learn now / learn later / just monitor it computed from your records; weekly grouping | Working — a dated snapshot (read 2026-10-27), not live research, and nothing about salaries, hiring counts, or open roles |
| Interview Preparation | Not started (still Phase 5) |
| Full account export and account deletion workflow | Partly available (export); deletion planned Phase 6 |

All unbuilt destinations are reachable from navigation and clearly labeled with their planned phase.

## The working loop

1. **Assess.** A short adaptive check samples programming, SQL, data science, software development, and career preferences. Correct answers unlock a harder follow-up; incorrect answers identify the concept and point to a remedial step.
2. **Review.** Results show demonstrated scores, per-section strengths and gaps, career signals worth testing, and a first-30-days plan. Confidence answers are displayed as self-reported, not verified.
3. **Plan.** The first assessment generates a 13-week / 41-task roadmap that fits the chosen weekly hours (10 h/week by default → 600 planned minutes per week, 7,800 total). Weeks 11–12 are small experiments in two career tracks; week 13 is a review checkpoint that recommends a direction and a next plan.
4. **Study.** The dashboard surfaces one unlocked objective with a learn/exercise/knowledge-check/revision outline and cited references. Prerequisites block later work; nothing auto-advances.
5. **Ask.** The AI Tutor carries the profile, the latest short assessment, and an optional roadmap task into each request, with self-reported levels explicitly marked unverified. Eleven modes cover explanation, step-by-step teaching, examples, Socratic questioning, hints, debugging, senior code review, practice, mistake diagnosis, revision, and interview practice.
6. **Reuse.** The Prompt Studio builds reusable prompts in 16 categories. Every prompt includes the learner's goal, target direction, available time, tools, preferred teaching method, deliverable, and evaluation rubric. Prompts can be edited, tagged, copied, searched, and saved.
7. **Record.** Starting a session is an explicit act. Elapsed minutes are computed from stored timestamps when the session ends; only completed sessions count. Abandoned sessions remain visible but add no time. Unfinished tasks can be moved to another week without losing completion state.
8. **Build.** The Project Lab holds 10 project templates. Starting one creates your own copy with ordered milestones; a milestone only completes once you link the work you produced for it, and a project only completes with every milestone submitted and a repository linked. Advanced templates stay locked until a prerequisite has real evidence behind it — a section of the assessment scored at 60% or higher, a completed roadmap task covering the skill, or an earlier project that used it. A degree or a confidence rating never unlocks anything. Reopening a completed project withdraws the evidence rows it created.
9. **Measure.** Progress analytics are computed from what is stored, never estimated: study time from completed sessions only, accuracy from questions that have a right or wrong answer, demonstrated proficiency from the latest assessment, and evidence kept in separate lanes so a submitted project is never added to a test score. A concept appears as a repeated mistake only when it was missed in two separate assessment attempts. One ranked next action explains the rule that picked it.
10. **Explore.** The Career Explorer lists all 9 role profiles and ranks them from your assessment answers, so a role with no career answer in the assessment is shown at 0 of 100 rather than being hidden. Each experiment is a short version of the real work with steps, things to notice while doing it, and a described result to keep. Marking one tested requires a link to the work you produced plus four whole-number reflections — interest, difficulty, enjoyment, and whether you would practise it again — and only then does the reflection move that role, by up to 15 of its 100 points. Difficulty is recorded but never scored. Starting or finishing an experiment adds zero study minutes, because it is not a logged session. The page states which stage you are in and lists every condition still missing before a role counts as chosen, and you can record your own first and second choice with the reason, which the page then shows next to the ranking rather than hiding the disagreement.
11. **Read what changed.** Industry Intelligence lists 22 entries in 7 areas of the field. Each one names what changed in the source's own terms, why this app thinks it matters, the source and its type, the publication date, and the date it was read here. Every entry is then labelled learn now, learn later, or just monitor it by a rule that reads your own records — the career choice you saved, the target role in your profile, the highest-scoring role in your latest assessment, any skill that assessment scored under 60 out of 100, and the roles you have already tested — and the page quotes the record that caused the label. Entries are grouped by the week they were published, newest first. The page is a snapshot taken on 2026-10-27 and says so: it does not update by itself, and it publishes no salary figure, hiring count, or open role because nothing was read that could support one.

Roadmap content is a curated, deterministic curriculum shaped by assessment results, focus tracks, weekly hours, and constraints. It is not AI-generated and does not claim to verify mastery. Tutor replies and generated prompts are AI output only when a provider is configured; otherwise they are deterministic demo content. Project and rubric records are self-submitted: every evidence row created here is stored with `verified = false` until something outside the app confirms it, and the six rubric criteria are scored by you and kept apart from assessment results. Career experiment records are self-submitted too — the link to the work is stored but never opened, and a tested experiment is evidence that you did the activity, not that anyone external reviewed it. Industry Intelligence is quoted rather than authored: each "what changed" line repeats what the linked page states, each "why it matters" line is labeled as this app's reading of it, and the page publishes no salary, hiring or open-role figure because nothing was read that could support one.

## AI architecture and honesty

- **Server-only provider credentials.** `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, and optional `AI_BASE_URL` are read only in server code. The browser receives a public status object (mode, provider name, model name, explanatory text) and never the key.
- **Two providers supported.** `openai` (default base URL `https://api.openai.com/v1`) and `openai-compatible` (with `AI_BASE_URL`), both via the Chat Completions shape.
- **Demo mode is explicit.** With no `AI_API_KEY`, tutor and prompt actions use deterministic curated content. Replies carry a "Demo reply" badge, prompts carry a demo template header, and stored rows keep `is_demo = true`.
- **Misconfiguration fails closed.** Setting `AI_API_KEY` without `AI_MODEL`, or using an unsupported provider or invalid base URL, produces an explicit configuration error instead of silently falling back.
- **No tools or code execution.** The model receives text only. No function calling, shell, filesystem, browser, or database permissions are offered. Output is rendered as plain text by React.
- **Untrusted context is fenced.** Learner messages and learner context are labeled as data, not instructions, in the system prompt. Prompt generation requires a JSON object that is parsed and range-checked with Zod; invalid shapes are rejected.
- **Bounded provider calls.** Requests time out after 20 seconds, retry once on 5xx or network failures, cap history and message length, and cap output size.
- **Quotas are user-scoped.** In Supabase mode, successful calls record an `ai_usage_events` row and the next request checks the rolling 10-minute and 24-hour windows. In preview mode the same check runs against local usage events.

## Stack

- Next.js 16.4.3 (App Router, Turbopack)
- React 19.3
- TypeScript 5 (strict)
- Tailwind CSS 4
- Supabase Auth + PostgreSQL via `@supabase/ssr`
- Zod 4
- Vitest 5
- ESLint 9

Developed and verified with Node.js 24. Next.js 16 requires Node.js `>=20.9.0`.

## Quick start (preview mode)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables are required.

In preview mode:

- Onboarding, the assessment, roadmap, sessions, tutor, prompts, and settings all work in one browser. The tutor and Prompt Studio use demo content only; live AI requires Supabase mode and an AI provider key.
- Data is stored under four localStorage keys:

  | Key | Contents |
  | --- | --- |
  | `careerforge:profile:v1` | The starting profile |
  | `careerforge:workspace:v1` | Assessment result, roadmaps, tasks, prerequisites, sessions |
  | `careerforge:assessment-draft:v1` | In-progress assessment answers so a reload does not discard work |
  | `careerforge:ai:v1` | Tutor conversations, saved prompts, and local AI usage events |

- The profile is parsed through the same Zod schema as server input; workspace, draft, and AI values pass structural guards. Corrupt or tampered values are discarded rather than trusted.
- Settings can export all local data as JSON, remove the profile, or delete learning data after typing `DELETE`. Deleting learning data also removes tutor conversations, saved prompts, and local AI usage events.
- There is no account, cloud backup, or database row, and no simulation of multi-user security.

Preview mode is a real local persistence mode, not a mock authentication system.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migrations **in order**:
   - `supabase/migrations/20261023000100_initial_schema.sql`
   - `supabase/migrations/20261023000200_seed_skills.sql`
   - `supabase/migrations/20261024000100_phase3_ai.sql`
   - `supabase/migrations/20261027000100_phase4_projects.sql`
   - `supabase/migrations/20261027000200_phase5_career_exploration.sql`

   Use the Supabase SQL editor or the Supabase CLI. The first migration creates the 20-table schema, 73 row-level-security policies, profile trigger, and the 36-skill catalogue. The Phase 3 migration adds `is_demo` flags to tutor messages and saved prompts and creates `ai_usage_events` with three owner-only policies. The Phase 4 migration adds `template_key` to `project_milestones` with a unique `(project_id, template_key)` index; `projects` and `project_milestones` themselves, with their owner-only policies, already exist in the first migration. The Phase 5 migration adds a unique `(user_id, career_slug)` index on `career_experiments`, so one role cannot accumulate several competing results, and adds the missing owner-only delete policy on `career_preferences`, so your recorded career choice is covered by the deletion workflow. `career_experiments` and `career_preferences`, with their other owner-only policies, already exist in the first migration.
3. Copy the Project URL and the **anon** or **publishable** key from Project Settings → API.
4. Create `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   # Optional fallback used when building confirmation redirect URLs:
   # NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. In Supabase Authentication → URL Configuration:
   - Set the Site URL to `http://localhost:3000` for local development.
   - Add `http://localhost:3000/auth/callback` to the redirect allow list.
   - Add the equivalent production `/auth/callback` URL when deploying.
6. Restart the dev server, then sign up and confirm the email address.
7. Optional: add a server-only AI provider key to enable live tutoring.

   ```dotenv
   AI_PROVIDER=openai
   AI_MODEL=your-model-name
   AI_API_KEY=your-server-only-key
   # Required only when AI_PROVIDER=openai-compatible:
   # AI_BASE_URL=https://your-endpoint.example.com/v1
   ```

   Leave `AI_API_KEY` unset to keep demo mode. Never prefix these variables with `NEXT_PUBLIC_`, and never use a Supabase service-role key as an AI key.

How configuration is handled:

- **Neither Supabase variable set:** local preview mode.
- **Only one set, or an invalid URL:** the app fails with an explicit configuration error instead of silently pretending accounts work.
- **Both set:** routes use Supabase sessions. Visitor pages remain public; application destinations require a session, and onboarding is required before entering the app shell.
- **AI key absent:** demo mode, still persisted per user when Supabase is configured.
- **AI key present but model missing, provider unsupported, or base URL invalid:** explicit misconfiguration error; no request is made.

Never put a service-role key in this project. The app never reads one. The anon/publishable key is designed for browser use; database authorization is enforced by RLS.

### Verify a Supabase connection

These checks are required before treating a deployment as verified, because Supabase behavior has not been executed against a live project in this environment:

1. Sign up with a real email address and confirm the email. Finish onboarding; confirm one `profiles` row exists.
2. Open `/assessment` from a fresh account and confirm the dashboard redirects there first.
3. Complete the assessment. Confirm rows in `skill_assessments` and `assessment_answers`, and one `learning_roadmaps` row with 41 `roadmap_tasks`.
4. Rebuild the roadmap with two tracks; confirm the old plan is archived only after the confirmation step.
5. Complete a task with unmet prerequisites and confirm the server refuses it.
6. Start a session, finish it, and confirm `learning_sessions.actual_minutes` matches elapsed server time. Start another and abandon it; confirm it is stored but does not add recorded minutes.
7. Reschedule an unfinished task and confirm its completion state does not reset.
8. Sign in as a second test account and confirm neither account can read the other's assessment, roadmap, sessions, projects, evidence, career experiments, career choice, tutor conversations, or saved prompts.
9. Open `/tutor`, send a message, and confirm a `tutor_conversations` row plus two `tutor_messages` rows. Confirm `is_demo = true` when no AI key is configured.
10. Open `/prompts`, generate and save a prompt, and confirm a `saved_prompts` row with the correct `is_demo` value.
11. Confirm `ai_usage_events` rows appear after successful AI actions, and that the quota UI reflects them. Changing a row's `user_id` must not expose it to another account.
12. Open `/settings/export` and confirm the JSON contains the signed-in account's profile, answers, roadmaps, sessions, projects with milestones, skill evidence, career experiments with reflections, career choice, prompts, and tutor conversations only.
13. Delete learning data, then confirm the profile and sign-in account remain, and that AI conversations, prompts, usage events, projects with their milestones, skill evidence, career experiments, and the recorded career choice were removed.
14. Open `/projects`, start an unlocked template, and confirm one `projects` row plus its `project_milestones` rows with `template_key` set. Confirm a locked template cannot be started by calling the action directly.
15. Try to complete a later milestone before the earlier one, and confirm the server refuses. Submit each milestone in order with a link, then confirm completion is refused until a repository link exists.
16. Complete a project and confirm `user_skill_evidence` rows appear with `verified = false`, that the rubric is refused before completion and accepted after, and that reopening the project removes exactly those evidence rows.
17. Open `/progress` and confirm every figure matches the stored rows: recorded minutes come only from completed sessions, accuracy excludes self-report and preference answers, lesson/quiz/interview lanes stay at zero, and the next action names the rule that picked it.
18. Open `/careers` and confirm all nine roles are listed, that each score states where its points came from, and that starting an experiment writes one `career_experiments` row with the role, the status, and the work description as it read at that moment.
19. Try to record a result with a rating missing or with no link to the work, and confirm the server refuses both. Then supply all four ratings and a link, confirm the row becomes completed, and confirm no `learning_sessions` or minute total changes, because an experiment is not a study session.
20. Start a second experiment for the same role from a direct action call and confirm the unique `(user_id, career_slug)` index refuses it. Clear the result, confirm the ranking falls back to the assessment-only score, and confirm the second test account cannot see the row.
21. Save a career choice that disagrees with the ranking, with a written reason, and confirm one `career_preferences` row holds both slots and the reason. Confirm a choice with two identical roles or no reason is refused, that saving again replaces the row rather than stacking, and that the delete workflow removes it.
22. Open `/intelligence` and confirm the entry list, the week groups and the read dates render from the same `career_preferences`, `assessments`, and `career_experiments` rows the Career Explorer writes — change your saved choice, reload, and the learn-now count moves. The page writes nothing, so confirm no new row appears in any table and that a second account cannot see the first account's labels.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | For Supabase mode | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For Supabase mode | Public anon key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Alternative | Supported alias for newer publishable keys |
| `NEXT_PUBLIC_SITE_URL` | Optional | Fallback origin for confirmation links when forwarded host headers are absent |
| `AI_PROVIDER` | For live AI | `openai` (default) or `openai-compatible`; server-only |
| `AI_MODEL` | For live AI | Provider model name; server-only |
| `AI_API_KEY` | For live AI | Provider credential; server-only. Absent → demo mode |
| `AI_BASE_URL` | Optional | Chat Completions base URL for `openai-compatible`; server-only |

Use `.env.example` as the template. Do not commit `.env.local` or provider secrets.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Project structure

```text
src/
  app/
    (app)/                 Signed-in shell: dashboard, assessment, roadmap, tutor, prompts, projects, progress, careers, intelligence, settings, planned pages
    (auth)/                Sign-in and sign-up screens
    auth/callback/         Supabase confirmation callback
    onboarding/            Profile setup outside the app shell
  components/
    assessment/            Assessment flow and results
    dashboard/             Daily objective, session controls, progress
    roadmap/               Roadmap view, builder, task details
    tutor/                 Tutor chat, mode and task selection, conversation history
    prompts/               Prompt Studio builder, editor, saved prompt list
    projects/              Project Lab library, workbench (milestones, links, rubric), feedback hook
    career/                Career Explorer, experiment board, role profile board, feedback hook
    intelligence/          Industry Intelligence snapshot board: entry rows, source lines, area and attention filters
    progress/              Progress analytics cards and category breakdown
    shell/ profile/ settings/ planned/ ui/
  lib/
    ai/                    Config, provider adapter, prompts, demo content, context, quotas, repositories, actions
    assessment/            Question bank, adaptive engine, scoring, records, career fit
    auth/                  Session viewer, route rules, auth actions
    career/                Nine career-track definitions, role profiles, nine experiments with reflections, exploration scoring, repository, actions, types
    evidence/              Skill evidence records and lane definitions
    intelligence/          The 22 sourced entries with their dates, topic and source-kind labels, attention rules, and weekly grouping
    preview/               Browser-only profile, workspace, assessment-draft, project, career, and AI stores
    profile/               Zod schema, repository, readiness logic, actions
    projects/              Ten project templates, readiness gates, rubric, repository, actions, types
    progress/              Analytics builder, next-action ranking, types
    roadmap/               Deterministic 13-week generator, initial plan, repository
    sessions/              Session presets, types, repository
    workspace/             Server actions, action types, progress calculations, server workspace loader
    supabase/              Browser/server clients and generated-style types
  proxy.ts                 Next.js 16 request proxy for session refresh and guards
supabase/migrations/       PostgreSQL schema, RLS, triggers, skill seed, Phase 3 AI tables, Phase 4 project tables, and Phase 5 career tables
docs/ARCHITECTURE.md       Architecture and security notes
```

## Testing

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The current suite is **269 Vitest tests across 25 files** covering:

- profile schema, readiness, navigation, and safe redirects;
- assessment scoring, adaptive follow-ups, answer-key handling, and deterministic option ordering;
- initial and regenerated roadmap shape, weekly minute budgets, experiments, checkpoints, and prerequisite edges;
- preview workspace integrity, session lifecycle, abandoned-vs-completed accounting, rescheduling, and roadmap replacement;
- weekly/overall progress arithmetic;
- AI configuration resolution and demo fallback, quota windows and retry timing, learner-context framing and truncation, prompt JSON parsing and tag normalization, demo reply/template determinism, and provider-independent request boundaries;
- project template shape, prerequisite readiness (which evidence unlocks a template and which does not), rubric summarisation, milestone ordering, and evidence creation or withdrawal on completion and reopen;
- progress analytics: recorded-study-time-only accounting including abandoned and still-running sessions, evidence lanes kept apart, accuracy that excludes self-reports and preferences, repeated mistakes requiring two separate attempts, revision backlog and remedial fallbacks, weekly consistency runs, roadmap and project summaries, and the ranked next action;
- role profile content: every career track the app knows about has a profile, each with enough detail to describe the real work, portfolio projects that exist in the project library, and at least four named skills the assessment can screen; the nine experiments cover every track exactly once and group into the five kinds the plan promised; every task description is specific enough to start, and both ends of each rating scale are explained so a number cannot be misread;
- career exploration: the nine roles ranking at zero with no assessment stored, the saved target role staying in the short list even when it scores lower, an untested role keeping its assessment score and being called a hypothesis, a tested role overtaking one that only scored higher on the assessment, difficulty never moving a score, no score passing 100, the live profile target beating an older saved target, completed projects counting as evidence for every role they cover while paused projects count for none, the specialization stage staying exploratory until the leader is tested and a second experiment and a finished project exist, and a choice against the ranking keeping your written reason visible;
- preview career storage: starting an experiment records the work description as it stood then, a second copy of the same role is refused, a start adds nothing to study time, a result requires the experiment to have been started plus a real web address and all four ratings, an existing result is never silently overwritten, clearing lets the role be tried again, a recorded choice needs reasoning and only one choice is kept, and stored rows for unknown roles or out-of-range ratings are dropped or repaired when the workspace is read back.
- industry intelligence: every entry carrying a https source and text long enough to be a real summary, only role and skill names this app actually knows, dates that cannot be after the day the snapshot was read and never invented for a source that dates by month or shows no date, all seven promised areas being covered, no salary, hiring or open-role wording anywhere in the visible text, everything defaulting to just monitor it with no recorded direction, the saved choice beating the profile target beating the highest assessment score, a skill under 60 out of 100 pulling its entry forward while a skill at exactly 60 does not, a tested role landing at learn later, learn-now entries listed first, every dated entry landing in exactly one week with undated sources kept apart, and the month-and-no-date wordings being honest about what the source shows.

A headless-Chrome QA pass verified the Phase 4 preview flows end to end: starting a template, the out-of-order milestone block, submitting each milestone with its link, the repository-link gate before completion, the five unverified evidence rows created on completion and withdrawn on reopen, rubric gating and persistence, both Project Lab filters, and the Progress page in both its empty and populated states. A second pass verified the Phase 5 Career Explorer flows in preview mode: the nine roles listed at zero with no assessment, the experiment start button opening the reflection form, a result being refused until all four ratings and a work link are present, a saved reflection lifting the leader from 28 to 41 of 100, the confidence label changing from "No experiment tested" to "One experiment done", the specialization stage listing exactly what is still missing, saving a choice that disagrees with the ranking and getting the headline that names both roles and your written reason, clearing a result and watching the score fall back, and the study-time arrays staying at zero throughout because an experiment is not a session. A third pass checked Industry Intelligence in preview mode: the 22 entry cards rendering with their source link, publication date and read date, the week groups running newest first, a month-dated source and a no-date source each labelled for what their page actually shows, the area and label filters with their counts (4 learn now against 18 to just monitor it once a target role was on file), an empty filter combination producing the no-entries notice instead of an empty box, and — after temporarily removing the local profile and putting it back — every entry falling to just monitor it with the reason naming the record that is missing. That driver is not committed; there is no maintained browser E2E suite yet.

The QA passes ran in the app's own Browser tool, which had no window attached to it this round, so the pages that stream their content after the shell (Settings, Dashboard, Projects, Progress) never finished loading there and were checked in the code instead of the screen. The Career Explorer page, which renders in one step, was fully clicked through.

## Deployment

The application can be deployed to any platform that supports Next.js 16 and Node.js 20.9+; Vercel is the simplest target. Supabase provides the database and authentication.

1. Create separate Supabase projects for development and production if possible.
2. Apply all five migrations to the production project, in filename order.
3. Add the production Site URL and `/auth/callback` redirect URL in Supabase Authentication settings.
4. Import the repository into the hosting provider and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the production environment.
5. Add `AI_PROVIDER`, `AI_MODEL`, and `AI_API_KEY` as **server-only** production variables if live AI is desired. Do not expose them to the client bundle.
6. Build, deploy, sign up, confirm email, then run the verification checklist above with two accounts.

Hosting and database providers change their plans, limits, and pricing. Check the current Supabase, Vercel, and AI provider pricing pages before choosing a plan. Demo mode remains fully functional without a paid AI provider.

## Privacy, limitations, and known gaps

- Preview data stays in one browser. It is not encrypted, synced, or protected by RLS, and it should not be used for sensitive personal information.
- Supabase authentication, Phase 2/3/4/5 writes, and RLS have **not** been executed against a live project here; the five migrations have not been applied in this environment. The verification checklist above is mandatory before calling a deployment verified.
- Deleting learning data removes assessments, evidence, roadmaps/tasks, sessions, projects with their milestones, career experiments with their reflections and the recorded specialization choice, tutor conversations/messages, saved prompts, and AI usage events. Full account deletion is not implemented; the schema cascades from `auth.users` so a future workflow can remove all rows safely.
- The server export route covers profile, assessments with answers, roadmaps with task states, sessions, projects with milestones and links, skill evidence records, career experiments and your specialization choice with the reason you wrote, saved prompts, and tutor conversations. It excludes auth secrets, provider credentials, and usage counters. Account deletion is Phase 6.
- Assessment content and roadmap session plans are curated static material selected by rules. They are not adaptive AI tutoring, and completing a task is self-reported progress, not verified mastery.
- Project work is verified only by you. Milestone links are URLs you supply, the repository link is not checked, and every evidence row is stored with `verified = false`. Lesson, quiz, and interview evidence lanes exist and are labeled, but those features are not built yet, so their counts stay at zero.
- Prerequisite unlocking reads the latest assessment result, completed roadmap tasks, and completed projects. It cannot see work done outside this app, so an already-published portfolio project does not unlock anything until it is recorded here.
- Weeks 11–12 experiments and the week 13 checkpoint are structured tasks; they do not produce automatic career verdicts. No salary, hiring, or live-market data is invented.
- The Career Explorer ranks roles from your own answers, not from the job market. Nothing here was fetched from a job board: the entry bars, tool lists, and progression notes are written descriptions, and no salary, hiring statistic, or open role appears anywhere in it. An experiment result is self-reported; the link to your work is stored but never opened or checked, and a reflection moves a score by at most 15 points, so one good afternoon cannot outvote the assessment. Difficulty is recorded so you can see it, but it never changes a ranking, because a hard task is not automatically a bad choice. Completing one experiment does not make a role your specialization: the stage stays exploratory until the top-ranked role is tested, a second experiment is finished, and project work is complete.
- Industry Intelligence is a snapshot stored in the repository, dated by the day each source was read (2026-10-27). Nothing is fetched when the page loads, so a change announced after that day is simply absent, and a source page can be revised underneath an entry without this app knowing. Each entry's "what changed" line is the source's own statement and its "why it matters" line is this app's reading, labelled as such. Where a source showed only a month, or no date at all, the page says so instead of inventing a day. No salary, hiring statistic, or open role appears, because no employer survey or job board was readable while building it. The page also stores nothing: it cannot show which entries you have already read.
- Live AI output is model-generated and can be wrong. The system prompt forbids invented mastery, experience, credentials, salaries, or live data, but the application cannot verify every claim. Treat live replies as guidance, not evidence.
- Quotas are enforced per user through application logic and event rows, not a database-level rate limiter. Concurrent requests could briefly exceed a window; the design is best-effort abuse protection, not a billing guarantee.
- Demo content is deterministic and intentionally generic. It demonstrates the flow and labeling, but it does not adapt to the learner's actual message the way a model would.
- No rate limiting beyond Supabase Auth and the AI quotas is implemented yet. Other write paths rely on session checks and RLS.
- Automated accessibility coverage is limited to semantic structure, labels, focus behavior, and basic browser checks. A full WCAG audit is still pending.

## Next phase

Phase 5 is nearly done. The Career Explorer and Industry Intelligence work now, in preview mode; one destination is still marked "Planned" in the sidebar.

- **Industry Intelligence is built.** 22 entries, each with the source page it was read from, its publication date, and the date read here (2026-10-27). Sources that could not be opened were dropped rather than paraphrased from memory, and the three things the plan promised that could not be sourced — salaries, hiring statistics, open roles — are listed on the page as deliberately absent. Refreshing it is a manual act: the entries are content in the repository, so a new snapshot means re-reading the sources and re-running the tests that police their dates.
- **Interview Preparation** is the last one: honest application materials (resume, LinkedIn, portfolio guidance), mock interviews for Python, SQL, statistics, ML, behaviour, and role-specific questions, job-description analysis that compares what a role asks for against the evidence you already have, and an application tracker. It fills the interview evidence lane, which is defined in the schema but stays at zero today, and keeps openings you entered yourself separate from clearly labelled examples.
- Before any of that is called production-ready: apply the five migrations to a live Supabase project, run the verification checklist with two accounts to confirm one account cannot read another's rows, exercise the AI quotas against a real provider, and re-check the Project Lab, Progress, Career Explorer, and Industry Intelligence screens in Supabase mode, where the records that drive the labels come from the database instead of this browser.
