# CareerForge AI — Architecture

## 1. Purpose and design principles

CareerForge AI is a personalized learning and career workspace for data science and future-tech roles. The long-term product includes adaptive assessment, a personalized roadmap, an AI tutor, prompt tooling, project work, career experiments, sourced industry intelligence, and interview preparation.

The application follows these rules in every phase:

1. **No fabricated state.** A feature that does not exist is left out of the interface and named in the documentation instead of being shown as an empty placeholder. Confidence is self-reported and shown separately from demonstrated assessment results. Study time starts at zero and only records real, completed sessions. Simulated AI output is labeled as demo output in the UI and in storage.
2. **Server-authoritative authorization.** User-specific reads and writes run on the server using the authenticated Supabase session. The browser never receives a service-role key or an AI provider key.
3. **Database-enforced isolation.** Every user-owned table has row-level security. Child rows are authorized through ownership of their parent.
4. **Honest modes.** Missing Supabase configuration produces an explicitly labeled local preview mode, not a simulated account. Missing AI configuration produces an explicitly labeled demo mode, not simulated live AI.
5. **Rules before generation.** The assessment and roadmap are deterministic, testable domain logic. AI is used only for conversational tutoring and reusable prompt generation, never for scores or mastery claims.
6. **Provider-independent AI.** AI calls pass through a server-only adapter. Provider selection, credentials, timeouts, validation, and quotas stay outside UI components.
7. **Small, testable phases.** Each phase must build, typecheck, lint, and pass tests before the next begins.

Phase 3 implemented the AI Tutor, the Prompt Studio, server-side AI actions and persistence, a provider-independent adapter, durable per-user usage quotas, and a clearly labeled demo mode.

Phase 4 added the Project Lab — 10 curated templates gated by demonstrated evidence, ordered milestones that each require a link to the work produced, a repository link before completion, and a self-scored rubric — and the progress analytics computed from those records.

Phase 5 begins the career side with the Career Explorer: 9 role profiles, 9 hands-on experiments (one per role, grouped into the five kinds the plan promised), a four-part reflection recorded after each one, a ranking that shows the assessment fit out of 100 and the reflection adjustment of up to 15 points, a stage that stays exploratory until the evidence is there, and a removable choice where you disagree with the ranking. It continues with Industry Intelligence: 22 entries read from their own sources on one stated day, grouped by week, each labelled learn now, learn later, or just monitor it by a rule that reads your records rather than an editor's opinion. It ends with Interview Preparation: a 42-question bank in 6 areas, plans the learner assembles, three self-ratings per written answer, the single rule by which a finished interview writes unverified skill records, a practice list derived from the learner's own low scores and missed answers, a phrase-list reading of a pasted job posting compared skill by skill against the learner's records, and a role tracker with 6 statuses that keeps an opening you found apart from a written example.

Phase 6 closes the gap Phase 5 left: the application-materials screen. `src/lib/materials/` derives three documents — a résumé, LinkedIn guidance, and a portfolio review — from rows already stored on the account, over one shared claim-strength rule that puts each of the 36 catalogue skills in exactly one of five buckets (finished work, score at or above 70, only your own rating of one interview answer, below the line, no record at all). Every generated line carries the records it was written from, a section the records do not reach is written as no line plus an explicit list of what is missing, and the plain-text renderer drops bracketed instructions, cautions and provenance so what is copied is wording and not advice. The portfolio builder treats only three things as proof — a repository link, a live link, and a milestone with the work attached — and sorts the rest as link-missing or not-checkable-from-inside-the-app. The tailoring builder reuses the Phase 5 posting reader and compares a saved posting against the same 70-of-100 line the interview screen uses. Persistence stores only what the learner typed: one draft per document, with a fingerprint of the record counts it was written against, recomputed from stored rows on both save paths and compared again on every visit so a stale draft says so instead of looking current.

## 2. System context

```text
Browser
  ├─ Public landing / auth screens
  ├─ Onboarding
  ├─ App shell: 12 destinations
  ├─ Dashboard, assessment, roadmap, tutor, prompts, projects, progress, careers, intelligence, interview, materials, settings
  └─ Local preview storage (localStorage)
        ├─ profile
        ├─ workspace: assessments, roadmaps, tasks, sessions, projects, milestones, evidence, career experiments, career choice, interviews, answers, saved roles, material drafts
        ├─ in-progress assessment draft
        └─ AI: conversations, saved prompts, local usage events
        │
        │ HTTPS, cookies (Supabase mode)
        ▼
Next.js 16 on Node.js
  ├─ React Server Components and server layouts
  ├─ Server Actions (auth, profile, assessment, roadmap, sessions, projects, career experiments, AI, deletion)
  ├─ src/proxy.ts (session refresh + route guards)
  ├─ src/app/auth/callback/route.ts (email confirmation)
  ├─ src/app/(app)/settings/export/route.ts (account export)
  └─ @supabase/ssr server client
        │
        ├─ anon/publishable key + user JWT
        ▼
Supabase
  ├─ Auth (email/password, confirmation)
  └─ PostgreSQL with row-level security
        ▲
        │ server-only HTTPS (no browser access)
        │
AI provider adapter (openai / openai-compatible Chat Completions)
```

The browser never calls a model provider directly. The provider box is reachable only from server actions, which also enforce authentication, ownership, input bounds, and quotas.

## 3. Runtime modes and configuration

### Supabase configuration

`src/lib/supabase/config.ts` resolves configuration once per call:

- No `NEXT_PUBLIC_SUPABASE_URL` and no anon/publishable key → **preview mode**.
- Exactly one missing → throw an explicit configuration error.
- Both present → **Supabase mode** after validating the URL protocol.

An optional `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted as an alias for anon keys. No service-role variable is read anywhere.

### AI configuration

`src/lib/ai/config.ts` resolves AI configuration on the server:

| Input | Mode | Behavior |
| --- | --- | --- |
| No `AI_API_KEY` | `demo` | Deterministic curated replies/templates; labeled as demo output |
| `AI_API_KEY` + valid `AI_PROVIDER` + `AI_MODEL` | `live` | Calls the configured Chat Completions endpoint |
| Key present but model missing | `misconfigured` | Explicit error; no request is made |
| Unsupported provider | `misconfigured` | Explicit error; no request is made |
| Invalid `AI_BASE_URL` | `misconfigured` | Explicit error; no request is made |

`AI_PROVIDER` accepts `openai` (default) or `openai-compatible`. The default base URL is `https://api.openai.com/v1`; `AI_BASE_URL` overrides it for compatible endpoints. `getAiPublicStatus()` exposes only mode, provider name, model name, and explanatory text to the client.

The AI variables are read only in server modules. They are never referenced from a client component or a `NEXT_PUBLIC_` variable.

### Preview mode

- `getViewer()` returns `{ mode: "preview" }`.
- `src/lib/preview/profile-store.ts` owns the profile under `careerforge:profile:v1`. Values pass through the shared Zod profile schema; corrupt values are discarded.
- `src/lib/preview/workspace-store.ts` owns assessments, roadmaps, tasks, prerequisites, sessions, projects with their milestones and links, skill evidence, career experiments with their reflections, and the recorded career choice under `careerforge:workspace:v1`. Values pass structural guards; malformed entries are discarded rather than trusted.
- `src/lib/preview/assessment-draft.ts` keeps an unfinished assessment under `careerforge:assessment-draft:v1` so a reload does not lose answers.
- `src/lib/preview/ai-store.ts` owns tutor conversations, saved prompts, and local AI usage events under `careerforge:ai:v1`.
- Custom events plus `useSyncExternalStore` keep every client consumer in sync across tabs and components.
- Server snapshot sentinels and hydration flags prevent SSR/client mismatches.
- The preview stores implement the same operations as the server actions: submit assessment, create/replace roadmap, complete/reopen task, reschedule task, start/end session, start project, submit or reopen a milestone, save links, complete or reopen a project, save rubric, start/complete/clear a career experiment, save or remove a career choice, send a demo tutor message, save/delete prompts, and delete learning data. The milestone-ordering, evidence-link, repository, and rubric gates are duplicated deliberately, as are the rules that a tested career role needs all four reflections and a link to the work and that a career choice needs a written reason, so preview mode cannot be more lenient than the server. These are local functions, not server actions.
- Preview AI is **always demo**. It never contacts a provider, even if AI variables are present.
- Auth routes redirect to the dashboard because no account exists.
- Settings can export local data, remove the profile, and delete learning data after explicit confirmation.

Preview mode is a product-honesty mechanism for local development. It does not emulate multi-user security, server-side authorization, provider calls, or cloud persistence. Data is visible to anyone with access to the browser profile.

### Supabase mode

- `src/lib/auth/viewer.ts` creates a request-scoped Supabase server client and calls `getUser()`. React `cache` deduplicates the lookup within a request.
- `src/lib/workspace/server.ts` exposes `getAuthenticatedContext()`; every workspace and AI action requires it, and preview mode is rejected for server writes.
- `src/lib/supabase/server.ts` uses the `@supabase/ssr` cookie adapter so the proxy can refresh tokens and the app can read the session.
- `src/proxy.ts` refreshes cookies, redirects anonymous users away from protected prefixes, and safely forwards `next` for post-login navigation.
- `src/app/auth/callback/route.ts` exchanges the confirmation code for a session and redirects to a validated internal path.
- Email confirmation is a project setting, not a code path. `signUpAction` branches on whether Supabase returned a session: with confirmation off it redirects into onboarding, with it on it returns "Account created. Check your inbox…" and no session. Local testing keeps the toggle off so two accounts can be signed in without an inbox in the loop; any deployment holding another person's records turns it on, because otherwise anyone who can read a mailbox can claim that address. See "Email confirmation" in the README.
- Signed-in users without a completed profile are redirected from the app shell to onboarding; completed users are redirected away from onboarding.
- `/account/close` sits outside the app shell on purpose, and `/onboarding` in the shell is the rule it has to escape: closure deletes the profile row, so a screen rendered inside the shell would bounce the learner to onboarding and swallow the instructions that follow a deletion. It requires a session but no profile, and Settings only links to it.
- A signed-in user without a completed assessment is redirected from the dashboard to `/assessment`.

## 4. Request and authorization flow

```text
Request
  → src/proxy.ts
      ├─ preview mode: pass through
      └─ Supabase mode: refresh session, guard protected/auth routes
  → (app)/layout.tsx
      ├─ resolve viewer
      ├─ require authenticated user (Supabase mode)
      ├─ load profile
      └─ require onboarding_completed
  → page / server component
      ├─ load owned records through the user's Supabase client
      └─ redirect to /assessment when no completed assessment exists
  → server action (mutations only)
      ├─ re-check viewer and user
      ├─ normalize and validate input
      ├─ load owned records and verify parent ownership
      ├─ apply domain rules (scoring, prerequisites, session state, quotas)
      ├─ call the AI adapter only after configuration and quota checks
      ├─ write with the user's session (RLS applies)
      ├─ recompute derived values (roadmap percent, elapsed minutes)
      └─ revalidate affected paths
```

Workspace actions in `src/lib/workspace/actions.ts`:

| Action | Key server-side checks |
| --- | --- |
| `submitAssessmentAction` | Authenticated user; answers normalized and bounded; **re-evaluated against the server question bank** rather than trusting client scores; started time clamped; inserts assessment and answers; creates an initial roadmap only when none is active |
| `createRoadmapAction` | Exactly two distinct valid career tracks; assessment belongs to the user; replacing an active roadmap requires explicit confirmation; generated plan inserted transactionally enough to report partial failure |
| `setTaskCompletionAction` | Task belongs to the user's active roadmap; completing requires verified, met prerequisites; reopening requires no completed dependents |
| `rescheduleTaskAction` | Week clamped to 1–13; active roadmap; completed tasks cannot be moved |
| `startSessionAction` | Preset is allowed; no other active session; task is owned, unlocked, in the active roadmap, and not complete; task moves to `in_progress` |
| `endSessionAction` | Session is active and owned; **elapsed minutes are computed from the stored start time**, never from a client value; only `completed` counts toward recorded time |
| `deleteLearningDataAction` | Typed `DELETE` confirmation; deletes every table in `LEARNING_DATA_TABLES` filtered by the authenticated user's id, so child rows leave through their cascade; profile and sign-in are kept |
| `deleteAccountAction` | Typed `CLOSE ACCOUNT` confirmation and an authenticated context, so preview mode is refused; deletes every table in `ACCOUNT_USER_ID_TABLES` by `user_id`, then `profiles` by `id`, stopping at the first failing table and naming it; returns the closed account's own id because the `auth.users` row is outside this app's reach |

Project actions in `src/lib/projects/actions.ts`. Every one re-reads the project through the user's own session before mutating it, so an id guessed from another account resolves to nothing:

| Action | Key server-side checks |
| --- | --- |
| `startProjectAction` | Template exists; duplicate starts refused; `evaluateProjectReadiness` re-run on the server against the learner's own assessment, roadmap, and projects — a locked template cannot be started by calling the action directly |
| `setMilestoneStatusAction` | Milestone belongs to an owned project; completing requires a link to the work it produced; steps complete in order and an out-of-order attempt names the open ones; reopening a step warns about the completed steps that depend on it |
| `setProjectLinksAction` | Owned project; URL shapes validated before storing repository and deployment links |
| `completeProjectAction` | `evaluateProjectCompletion` requires every milestone submitted **and** a repository link; evidence drafts built only from submitted milestones; duplicate evidence refused; inserted rows stay `verified = false` |
| `reopenProjectAction` | Owned project; withdraws exactly the evidence rows that completion created, so withdrawn work stops counting |
| `saveProjectRubricAction` | Refused until the project is complete; all six criteria required; scores bounded 0–3; stored on the project row and never written into skill evidence |
| `setProjectStatusAction` / `deleteProjectAction` | Owned project; valid status; deletion withdraws that project's evidence rows first and then removes the project, cascading its milestones |

Career actions in `src/lib/career/actions.ts`. Each one refuses before writing, and the message it returns is the sentence the screen shows:

| Action | Key server-side checks |
| --- | --- |
| `startCareerExperimentAction` | Role is one of the 9 the app defines; an experiment exists for it; a row for that role already exists means refusal, so one role cannot accumulate several competing results; the start date and the work description as it reads now are stored, and nothing is added to study time |
| `completeCareerExperimentAction` | All four reflections required as whole numbers 1–5; the link to the work is required and must start with `http://` or `https://`; the reflection text is length-capped; a result on a role that was never started is refused, because the start date would be a guess; an already-tested result is refused rather than overwritten silently |
| `clearCareerExperimentAction` | Owned row for a known role; deleting it is what returns the role to untested, so the score falls back and the screen says so |
| `saveCareerOverrideAction` | Both roles valid and different; reason between the minimum and maximum length so it stays readable later; one stored row per user, replaced on save |
| `clearCareerOverrideAction` | Owned row removed; the ranking is untouched by either action |

AI actions in `src/lib/ai/actions.ts`:
| Action | Key server-side checks |
| --- | --- |
| `sendTutorMessageAction` | Authenticated user; mode is a known teaching mode; message length bounded; existing conversation belongs to the user; optional roadmap task belongs to the active plan; config and quota checked before any provider call; output trimmed and length-capped; exchange persisted with `is_demo`; usage recorded only after success |
| `loadTutorConversationAction` | Authenticated user; id bounded; conversation ownership checked through RLS-scoped query |
| `generatePromptAction` | Authenticated user; category is known; input fields bounded; learner context built server-side; config and quota checked; demo template or provider JSON validated with Zod; usage recorded only after success |
| `savePromptAction` | Authenticated user; title/body/tags validated and normalized; updates re-check ownership |
| `deletePromptAction` / `deleteConversationAction` | Authenticated user; bounded id; delete scoped by `user_id` |

`saveProfileAction` follows the same boundary: it rejects preview mode, validates all fields server-side, upserts only the authenticated user's row, and revalidates affected paths. Server actions never trust a client-supplied user ID.

Redirect protection in `src/lib/auth/routes.ts` rejects:

- non-string, empty, or oversized values,
- external and protocol-relative URLs,
- backslashes,
- redirects back into auth routes.

## 5. Data model

The migration `supabase/migrations/20261023000100_initial_schema.sql` defines **20 normalized tables** and **73 RLS policies**. The seed migration adds **36 skills** across programming, SQL, data science, machine learning, software development, AI engineering, and career categories. The Phase 3 migration adds `ai_usage_events` (3 more policies) and `is_demo` flags. The Phase 4 migration adds `template_key` to `project_milestones` plus a unique `(project_id, template_key)` index, so a project created from a template can be re-linked to that template's guidance and a re-run cannot duplicate its milestones. The Phase 5 career migration adds a unique `(user_id, career_slug)` index on `career_experiments` and one owner-only delete policy on `career_preferences`. The Phase 5 interview migration creates `mock_interviews` and `interview_attempts` with four owner-only policies each (8 more), adds a partial unique `(interview_id, question_id)` index so a double tap cannot record two answers for one question, adds a `description` column to `job_applications` so a saved posting keeps the words the comparison was run against, and replaces that table's status check with the six statuses the screen records. The schema ends at **24 tables** and **90 policies**, of which 89 are owner-only and one is the public read of the skill catalogue. `job_applications` had a `skills` column from the first migration, and nothing here drops or rewrites a table in place. The Phase 6 materials migration creates `application_materials` with four owner-only policies, a unique `(user_id, kind)` index so one document cannot stack competing drafts, and a `built_from jsonb` holding the record counts the saved wording was written against; its `application_id` references `job_applications` `on delete set null`, because the learner wrote the text and losing it to a deleted role would be worse than losing the pointer. The Phase 7 hardening migration adds the `profiles` delete policy that account closure needs and that the first migration never included, and rebuilds the `interview_attempts` and `application_materials` insert and update policies so a row can only point at an interview or a saved role the same account owns — the pattern the first migration's child tables already used and the two newest tables had skipped.

### Tables used by Phases 2–5

- `profiles` — one row per auth user, primary key `id` references `auth.users(id) on delete cascade`.
- `skills` — global read-only catalogue.
- `skill_assessments` — completed assessment summary and scores.
- `assessment_answers` — per-question answers linked to an assessment; ownership checked through the parent.
- `learning_roadmaps` — one active plan plus archived plans, with weekly-hours and summary metadata.
- `roadmap_tasks` — 41 tasks per plan with week, status, estimate, and `resources` JSON for the session plan.
- `roadmap_task_prerequisites` — directed edges; child rows authorized through owned tasks.
- `learning_sessions` — study sessions with planned and actual minutes, status, and timestamps. A unique partial index enforces at most one `active` session per user.
- `projects` — one row per started project: template slug, title, problem statement, status, repository and deployment links, `self_assessment` JSONB rubric scores, and start/completion timestamps. Owner-only select/insert/update/delete policies.
- `project_milestones` — ordered steps belonging to a project with status, `evidence_url`, `completed_at`, and the `template_key` that ties the copy back to its template guidance. Authorized through the owning project, and deleted by `on delete cascade` with the project.
- `user_skill_evidence` — one row per skill a piece of work touched, with `source_type`, `evidence_level`, and a `verified` flag. Project completion writes these with `verified = false`; reopening the project withdraws exactly the rows that completion created.
- `saved_prompts` — reusable prompt title, category, body, tags, source, and `is_demo` provenance.
- `tutor_conversations` — conversation title, mode, and timestamps per user.
- `tutor_messages` — ordered user/assistant messages with `is_demo` provenance; ownership checked through the parent conversation.
- `ai_usage_events` — one row per successful AI action (`tutor` or `prompt`) with `is_demo`; backs rolling quota checks. Owner-only select/insert/delete policies.
- `career_experiments` — one row per career track the learner has tried: the work description as it read when the experiment was started, the status, the four whole-number reflections and the written notes, the link to the work produced, and the timestamps. A unique `(user_id, career_slug)` index means one role cannot hold several competing results at once. Owner-only select/insert/update/delete policies.
- `career_preferences` — one row per learner holding the chosen track, the alternative track, and the written reason for choosing against the ranking. Saving replaces the row rather than stacking history. Owner-only select/insert/update, with the delete policy added by the Phase 5 migration so the learning-data deletion workflow reaches it.

Session insert/update policies additionally verify that a linked `roadmap_task_id` belongs to a roadmap owned by the same user and that a linked `lesson_id` (when lessons exist) belongs to that user. A user cannot attach a session to another account's task by guessing an ID.

`ai_usage_events` uses a bigint identity key and cascades from `auth.users`. The application grants select/insert/delete to `authenticated` and sequence usage to the same role; RLS still restricts rows to the owning user.

### Schema groundwork, not used by the current UI

`lessons`, `quiz_attempts`, and `weekly_reviews` exist in the schema for later phases and no screen writes them; they are given row and insert types because account closure deletes them and a delete that names a table has to know its columns. Their presence is not evidence that those features work; the lesson and quiz evidence lanes on the Progress page therefore report zero records and say so in their own note. `career_experiments` and `career_preferences` are read and written by the Career Explorer. `job_applications` is written by the Interview Preparation tracker, and `mock_interviews` and `interview_attempts` were added for it by the Phase 5 interview migration, so the interview evidence lane now holds rows — all of them written from a self-rating, none of them `verified`, and the Progress note says that in full rather than implying a check that never happened. `application_materials` was added by the Phase 6 migration and is written only with what the learner types: the three generated documents are never stored there, because a saved copy of them would go stale against the rows they are read from.

Two deletion workflows exist. "Delete learning data" takes the typed word `DELETE`, removes the 14 record sets that carry the learner's work, and keeps the profile row and the sign-in so the workspace can be rebuilt. "Close this account" takes the typed phrase `CLOSE ACCOUNT`, removes all 18 record sets keyed by `user_id` — the learning data plus `lessons`, `quiz_attempts`, `weekly_reviews`, `saved_prompts`, `ai_usage_events` and finally `profiles` — and lets the 5 child tables with no `user_id` (`assessment_answers`, `project_milestones`, `roadmap_tasks`, `roadmap_task_prerequisites`, `tutor_messages`) leave through their `on delete cascade` parents. Both run as a table-by-table loop that stops at the first failing table and names it, so a partial closure is never reported as complete. The deletes are separate requests rather than one transaction: an interruption can leave some tables emptied and others untouched, the message says where it stopped, and retrying finishes the rest.

`src/lib/workspace/tables.ts` is the single source of truth for those lists and `src/lib/workspace/tables.test.ts` reads every `supabase/migrations/*.sql` file to police it: the test fails if a created table is unaccounted for, if a table with a `user_id` column is missing from the closure list, if a cascade child does not reach a parent that list really deletes, if a child is deleted after its parent, or if `profiles` is not last. The gap this closes is the ordinary one — a later phase adds a table, forgets the delete list, and the app keeps claiming it deletes everything.

What neither workflow can remove is the `auth.users` row. The email address and password hash live in Supabase's authentication service, and deleting that row needs a service-role key this application deliberately never holds, so `deleteAccountAction` returns the closed account's own id and the screen shows the exact `delete from auth.users where id = '...';` statement plus the dashboard path. The claim is deliberately narrower than "your account is deleted": every record this app can reach is gone, and the one thing left is named with the step to take.

## 6. Domain logic

### Profile

- `src/lib/profile/schema.ts` defines the shared Zod schema and FormData parser.
- `src/lib/profile/defaults.ts` creates preview and unsaved Supabase defaults.
- `src/lib/profile/repository.ts` maps snake_case database rows to a typed camelCase `Profile` and back.
- `src/lib/profile/progress.ts` calculates required-profile readiness and actionable missing fields.
- `src/lib/profile/actions.ts` implements the authenticated save and revalidation.

Self-reported skill levels are type-safe enums but remain unverified. The UI labels them explicitly and does not convert them into percentages or mastery claims.

### Assessment

- `src/lib/assessment/questions.ts` contains 13 technical probes, each with a core question and conditional follow-ups, plus 4 confidence questions and career-interest inputs.
- `src/lib/assessment/engine.ts` is pure: it validates answers, selects adaptive questions, scores demonstrated correctness, separates confidence, identifies strengths/gaps, maps incorrect concepts to remedial steps, and derives career-fit hypotheses.
- Option order is deterministically shuffled per question key (excluding "Not sure", which stays last), so the correct answer is not always in the same position and the UI remains stable across reloads.
- `src/lib/assessment/record.ts` builds a versioned result record; `repository.ts` persists and loads it; `career-fit.ts` shapes interest and style signals.
- The server action re-runs the engine on submission. Client-provided scores are not accepted.
- Retakes are supported and recorded as `retake`; a retake does not automatically replace an active roadmap.

### Roadmap

- `src/lib/roadmap/generate.ts` deterministically builds 13 weeks and 41 tasks from the assessment summary, exactly two focus tracks, weekly hours, start date, and constraints. A 10 h/week plan budgets exactly 600 minutes per week (7,800 total); every task carries an estimate.
- Weeks 11–12 are small experiments in the two chosen career tracks; week 13 is a checkpoint that compares them and recommends choosing a specialization and a next plan. The UI does not claim that completing the calendar equals readiness.
- Prerequisite edges are generated alongside tasks. Completion is refused while prerequisites are unmet; reopening is refused while completed dependents exist.
- Each task has a curated learn/exercise/knowledge-check/revision plan with references and, where relevant, an assessment-gap note. This content is static domain data selected by rules, not AI output.
- `src/lib/roadmap/initial.ts` creates a balanced initial plan after the first assessment; `repository.ts` handles active/archived plans and task updates.

### Sessions and progress

- `src/lib/sessions/types.ts` defines the 20/45/90/120-minute presets and session states.
- `src/lib/sessions/repository.ts` enforces one active session, inserts starts, and finishes with server-computed elapsed minutes.
- `src/lib/workspace/progress.ts` computes week ranges, unlocked tasks, weekly recorded minutes, and overall completion from records only. Planned minutes are never displayed as recorded time.
- Abandoned sessions stay in history but contribute zero recorded minutes and do not complete the task.
- Rescheduling changes only the target week and resets a pending task; completion state is not erased.

### AI Tutor and Prompt Studio

- `src/lib/ai/types.ts` defines the 11 tutor modes, 16 prompt categories, length limits, failure codes, and record shapes.
- `src/lib/ai/context.ts` builds a bounded learner-context block from the profile, the latest assessment screen, and an optional roadmap task. Self-reported levels are labeled unverified; the block is marked as data, not instructions, and is truncated at 4,000 characters.
- `src/lib/ai/prompts.ts` builds the system prompts. The tutor prompt fixes the teaching mode, separates safety rules from learner context, and forbids tool use, secret disclosure, invented credentials, and fabricated live data. The prompt-generation prompt requires a JSON object with `title`, `body`, and `tags`; the response is fence-stripped, parsed, and validated with Zod before display.
- `src/lib/ai/provider.ts` implements the server-only Chat Completions adapter. It caps history to the last 12 messages and each message to 6,000 characters, times out after 20 seconds, retries once on network errors and 5xx responses, maps 429 to a retryable rate-limit failure, and caps output at 40,000 characters. Provider request IDs may be logged, but keys and response bodies are never logged.
- `src/lib/ai/demo.ts` produces deterministic tutor replies for each mode, using only the learner context that actually exists. `src/lib/ai/templates.ts` builds prompt templates for all 16 categories with a demo header and explicit no-provider notice.
- `src/lib/ai/quotas.ts` evaluates rolling windows: 10 requests per 10 minutes and 60 per 24 hours. It returns remaining counts and a retry timestamp. Preview uses the same function over local events.
- `src/lib/ai/repository.ts` maps rows, enforces conversation ownership, inserts user/assistant pairs atomically enough to report failure, and records usage events. Usage is recorded only after a successful reply or prompt.
- `src/lib/ai/text.ts` normalizes tags (lowercase, `#` stripped, spaces to hyphens, length-capped, deduplicated, maximum eight) and derives conversation titles.

AI output is always rendered as text. React escapes it, and no rendered content is interpreted as HTML, executed, or used to construct shell commands or database queries.

### Projects

- `src/lib/projects/templates.ts` holds the 10 curated templates. Each carries motivation, prerequisites, dataset guidance, ordered milestones with per-milestone evidence hints and effort estimates, folder structure, testing checklist, metrics to report, interview questions, portfolio checklist, and the skills the work touches. Templates are read-only; starting one copies its milestones into a project owned by the learner.
- `src/lib/projects/readiness.ts` decides whether a template is open. A prerequisite counts as met only by a scored assessment section at `PREREQUISITE_PERCENT_THRESHOLD` (60%) or higher, a completed roadmap task covering that skill, or a completed earlier project that used it. Degree, self-reported level, and confidence are never inputs. The same function produces the recommendation ranking and the exact blocker sentences shown in the UI, so a locked row always explains itself, and `summariseRubric()` keeps the six self-scored criteria separate from any score.
- `src/lib/projects/types.ts` defines project and milestone states, the six rubric criteria scored 0–3, and `PROJECT_RUBRIC_DISCLAIMER`, which is carried into analytics so the rubric can never be read as verified skill evidence.
- `src/lib/projects/repository.ts` and `src/lib/evidence/repository.ts` read and write the Supabase rows; every mutation re-checks that the project belongs to the authenticated user before touching it.
- `src/lib/projects/actions.ts` implements start, milestone submit, link save, complete, reopen, and rubric save. A milestone refuses to complete without a link to the work it produced; milestones complete in order, and an out-of-order attempt names the steps still open; completion requires every milestone submitted plus a repository link; the rubric is refused before completion; and completion writes `user_skill_evidence` rows with `verified = false`, which reopening withdraws.
- `src/lib/preview/project-store.ts` mirrors the identical guards against the browser workspace so preview and Supabase mode cannot disagree about what counts.
- `src/lib/workspace/load.ts` loads the whole workspace for server rendering, with `includeAssessmentAnswers` for the analytics path, because accuracy and repeated mistakes are computed from stored answers.

### Progress analytics

- `src/lib/progress/analytics.ts` derives everything on the Progress page from stored records; no figure is estimated, smoothed, or filled in, and each number is shown with the sentence that explains it.
- Study time sums `actualMinutes` of completed sessions only. Still-running and abandoned sessions are named in the explanation instead of being silently dropped or counted.
- Accuracy counts only answers with a right or wrong verdict, so `self_report` and `preference` questions are excluded rather than padded into the denominator.
- Evidence lanes are grouped by `source_type` and never summed together, and each lane carries a note about what it can and cannot prove, including which source types are not built yet.
- A concept becomes a repeated mistake only after it was missed in two separate assessment attempts; missing it twice inside one attempt is a single result.
- The revision backlog prefers the remedial lesson the assessment named and falls back to the missed concept routed to the tutor; a skill already at intermediate is skipped.
- `buildNextAction` returns exactly one ranked action with its priority and the rule that selected it, ordered unfinished assessment, running session, missing plan, nearest unlocked task, revision, then project work.

### Career exploration

- `src/lib/career/tracks.ts` defines the 9 career tracks the app knows about, with the name, family, and the skills each one touches. It is the only list of roles, so a screen cannot rank a role that another screen does not know.
- `src/lib/career/role-profiles.ts` writes one profile per track: responsibilities, the tools that kind of work normally uses, the skills the workspace can actually evidence, portfolio projects chosen from the existing template library, interview topics, an entry bar, and a progression note. `CAREER_ROLE_PROFILE_DISCLAIMER` and the note that nothing was fetched from a job board are rendered with the profiles, and no salary, hiring statistic, or open role appears in the file.
- `src/lib/career/experiments.ts` defines one experiment per track (9 total) and groups them into the 5 kinds the plan promised: analytics, data science, AI applications, data engineering, and machine learning engineering. Each has the task, numbered steps, what to notice while doing it, the result to keep, an estimated minutes figure shown as an estimate, and the four reflection scales with both ends explained. `CAREER_EXPERIMENT_COMPLETION_RULE` states that a link to the work is required before a role counts as tested.
- `src/lib/career/exploration.ts` does the scoring. `rankAllCareerRecommendations` (reused from the assessment career fit, not copied) produces the fit out of 100 from the latest assessment answers, and `rankCareersForExploration` adds `getEvidenceAdjustment`, which moves a tested role by at most `EVIDENCE_ADJUSTMENT_MAX` (15) points from interest, enjoyment, and willingness. Difficulty is recorded so the learner can see it and is deliberately left out of the arithmetic, because a hard task is not automatically a bad choice. Confidence labels name what each position is based on: assessment only, one experiment done, or experiment plus finished project work. `getSpecializationStage` keeps the whole page exploratory until the leader has been tested, two experiments are finished, and a project is complete, and it returns the list of what is still missing. `describeOverride` reports agreement or disagreement between your saved choice and the ranking, quoting your own written reason. `buildCareerExplorationModel` combines all of it, takes the target role from the live profile when one is saved (falling back to the older summary only when the profile has none, so clearing a target really clears the bonus), and counts completed projects as evidence for every track the template covers while paused projects count for none.
- `src/lib/career/repository.ts` and `src/lib/career/actions.ts` read and write the two career tables. Every mutation checks that the row belongs to the authenticated user first, a second experiment for the same role is refused, a result without all four ratings or without a link is refused, a choice with both slots filled by the same role or with no written reason is refused, and saving a choice replaces the single stored row instead of adding another.
- `src/lib/preview/workspace-store.ts` holds the same career records in the browser workspace with the same refusals, and its reader drops a stored experiment whose role the app does not know and repairs ratings stored outside the 1–5 range instead of trusting them.

### Industry intelligence

- `src/lib/intelligence/types.ts` fixes the vocabulary: the 7 areas the plan promised, the 5 kinds of source (official documentation, release notes, project release, engineering blog, research paper), the `IndustryUpdate` shape, and the three attention levels with the sentence that explains each one. `tracks` is typed `CareerTrackSlug[]`, so an entry cannot name a role this app does not know.
- `src/lib/intelligence/sources.ts` is the content, and the honesty rule lives here. `INTELLIGENCE_SNAPSHOT` records the single day every entry was read (2026-10-27) and states that this is a dated snapshot, not live research. `INDUSTRY_UPDATES` holds 22 entries, each with the source name, its kind, an https URL, its publication date, and a `datePrecision` of `day`, `month`, or `undated` matching what the source page itself shows — a release list that dates only by month is recorded as a month, and a documentation page with no date is recorded with an empty `publishedOn` rather than a guessed one. `INTELLIGENCE_MISSING_DATA` names the three things the plan promised that could not be sourced (salaries, hiring statistics and open roles, news commentary) and why each is absent instead of estimated. Nothing in this file is fetched at runtime; refreshing the page is an editing act that re-reads the sources and re-runs the date tests.
- `src/lib/intelligence/briefing.ts` computes the personalisation, and writes none of it by hand. `getIntelligenceGoal` picks the direction in a fixed order — the choice saved on the Career Explorer, then the target role in the live profile, then the highest-scoring role in the latest assessment — and records which of those produced it, because that sentence is displayed. `classify` assigns learn now when an entry names that role or needs a skill the learner's own assessment scored under `LEARN_NOW_PERCENT_CEILING` (60 out of 100, the line the project readiness rules already use), learn later for a role already tested or a role in the same family as the direction, and just monitor it otherwise; each branch returns the sentence naming the record that caused it, and with no direction on file every entry lands on just monitor it with that stated. `weekOf` groups the dated entries into ISO weeks, newest first, and keeps undated sources in a separate list. `formatPublishedDate` says what the source shows rather than inventing a day.
- The page reads profile, assessment, career experiment, and career preference records and writes nothing, so it adds no table, no migration, no server action, and no new entry in the export or deletion workflows.

### Interview preparation

- `src/lib/interview/types.ts` fixes the vocabulary: the 6 areas, the 3 answer ratings with `ANSWER_RATING_META` carrying the label, the sentence explaining what each one proves, and `countsAsEvidence`, `MockInterviewRecord`, `InterviewAttemptRecord`, `JobApplicationRecord`, the 6 application statuses and the 2 source kinds (`real`, `example`), plus every field limit — 1,500 characters for a written answer, 80 to 6,000 for a posting, 160 for the other role fields, 1,000 for notes.
- `src/lib/interview/questions.ts` is the question bank: 42 written questions (Python 8, SQL 8, statistics 6, machine learning 7, behavioural 5, role-specific 8), each with the prompt, what a good answer contains as numbered points, follow-ups, the catalogue skills it needs, and the tracks it applies to. `INTERVIEW_BANK_DISCLAIMER` states that no company's real questions were used, and `INTERVIEW_EVIDENCE_RULE` states the only way an interview can produce a skill record. The ids are stable, and both the tests and the reader police that a stored answer's question still exists.
- `src/lib/interview/mock.ts` builds and scores a plan. `chooseMockQuestions` fills the requested length from the chosen areas and the selected role, ordering by how few times each question has been answered, so a repeat session is not a copy of the last one and nothing is chosen at random; it returns the reasons and says out loud when the bank cannot fill the order. `summarizeInterview` counts only questions that carry a rating and refuses readiness while any is unrated. `buildInterviewEvidence` is the single path to a skill record: a completed interview, one row per distinct catalogue skill on a question rated "I answered it", nothing otherwise. `buildPracticeMaterials` derives the study list from an assessment percentage under 40 or an answer rated "I could not answer it", capped at 6 skills, and produces nothing when no record shows a weakness.
- `src/lib/interview/description.ts` reads a pasted posting with a phrase list (`SKILL_PHRASES`), not a model: it quotes the words that matched, separates required from preferred, reads a role only from the title, refuses word fragments inside longer unrelated words, and pushes pay, location and seniority wording into `ignored` with the sentence explaining why it was not turned into a claim. `buildGapReport` then labels each skill it found against the learner's own assessment percentage and evidence level: `supported` when a finished project or a practice interview already names it, or the assessment scored 70 or above; `partial` between 40 and 69, or when a record exists with no score to compare; `gap` under 40; `untested` when neither a score nor a record mentions it — and each row carries the sentence naming the number or the record behind its own label. It counts required and preferred apart, and points at one next action. `DESCRIPTION_DISCLAIMER` says the reading is a phrase match, not an AI.
- `src/lib/interview/repository.ts` and `src/lib/interview/actions.ts` do the Supabase side. Every mutation resolves the session and filters on `user_id` before writing; Zod parses each input on the server (uuid, rating union, topic union, status union, dates in `YYYY-MM-DD`, length limits, `http(s)` links); an answer copies `prompt` and `skills` at the moment of answering so a later edit to the bank cannot rewrite what this learner was asked; finishing re-checks readiness on the server rather than trusting the button; and an answer belonging to a finished interview cannot be edited or removed — only removing the interview clears what it wrote.
- `src/lib/preview/workspace-store.ts` holds the same three record kinds in the browser workspace with the same refusals and the same messages. Its reader drops a stored answer whose question the bank no longer has, drops an application with a status outside the six, and drops a malformed interview rather than trusting it.
- The interview lane is the only place where a self-rating becomes a record. It writes `verified = false`, `score = null`, and `evidence_level = 'interview_evidence'`, so the Progress page can keep it in its own lane and no arithmetic can read it as a demonstrated score. An interview adds no study minutes, because it is not a logged session.

### Phase 6: application materials

- `src/lib/materials/types.ts` is the vocabulary: the three kinds with `MATERIAL_KIND_META` carrying each document's label and the two sentences that say what it holds and how it is built, `RESUME_LISTABLE_PERCENT = 70` (the same line the Phase 5 gap report calls "your records support it", so the two screens cannot disagree), the draft limits (60 to 20,000 characters), the two LinkedIn ceilings this app assumes (220 and 2,600) with `PLATFORM_LIMIT_NOTE` saying they were never read from the platform, `CLAIM_STRENGTHS` and `CLAIM_STRENGTH_META` for the five buckets, `NEVER_FROM_THIS_APP` and `PORTFOLIO_NOT_IN_RECORDS` as the explicit lists of what no builder may write, `MATERIALS_DISCLAIMER`, the `MaterialSource` / `MaterialEntry` / `MaterialBlock` shapes, `DraftBuiltFrom`, `MaterialDraftRecord`, and the three guards (`isMaterialKind`, `isDraftBuiltFrom`, `isClaimStrength`) the readers use.
- `src/lib/materials/backing.ts` is the single source of truth for what a record proves. `buildSkillProofs` folds the latest assessment, the completed projects' named skills, and the finished interviews' self-rated answers into one `SkillProof` per skill with exactly one `ClaimStrength`, and it drops evidence rows whose project no longer exists so an orphan cannot raise a claim. `summarizeProofs` counts the five buckets and the listable set; `targetRole` resolves the role the documents are written for from the profile and the latest assessment rather than a guess; `proofSources` turns a proof into the labelled records a line came from, marking only rows confirmed by something outside the app as verified. `draftFingerprint`, `describeDraftFingerprint` and `draftDrift` build the count of records a draft was written against, the sentence that reads it back, and the list of what has moved since — the same three functions the persistence paths and the screen use, so a draft cannot be described one way on save and another way on display.
- `src/lib/materials/resume.ts`, `linkedin.ts`, and `portfolio.ts` build the three documents as `MaterialBlock` lists. Each block carries its title, purpose, entries with their `sources`, the gaps it could not fill, and a note; a section the records do not reach is emitted with no entries and its gaps named, never as a blank card. The résumé keeps skills with finished work separate from skills resting on a score, refuses to write a line for employment, grades, salary, awards, certifications, references or any measurement (the `NEVER_FROM_THIS_APP` list is rendered as its own block), and states project questions as questions rather than results. The LinkedIn builder counts the headline and the about text against the assumed ceilings, labels every work line `Project work` or `Self-directed work`, and leaves one bracketed figure slot in the about text when no measurement is stored. The portfolio builder admits only three kinds of proof — a repository link, a live link, and a milestone with the work attached — sorts each checklist item with `checkNeeds` into `reachable`, `no-link`, or `not-checkable`, and lists what no record in this workspace touches.
- `src/lib/materials/tailoring.ts` reuses the Phase 5 reader instead of writing a second one: `tailorToPosting` takes the stored posting text through `readJobDescription` and `buildGapReport`, then orders the skills you may write, the ones you cannot back, and which finished project leads with the most of that posting's skills, with a refusal sentence when the text is too short to read.
- `src/lib/materials/text.ts` holds the shared rendering rules — `formatMaterialDay`, `materialYear`, `clipText`, `joinList`, `pluralise`, `countInstructionSlots`, `withoutInstructionSlots`, and `renderBlocksAsText`. A bracketed line is an instruction to the learner, not content: it stays visible on screen and is stripped from the copied text, together with cautions and provenance, so nothing handed to an employer starts with a square bracket.
- `src/lib/materials/repository.ts` and `src/lib/materials/actions.ts` do the Supabase side: `listMaterialDraftRecords` reads only the resolved user's rows, `saveMaterialDraftRow` upserts on the `(user_id, kind)` uniqueness so one document cannot stack competing drafts, and both server actions recompute `builtFrom` from the workspace loaded from the database — a `builtFrom` sent by the browser is ignored. `src/lib/preview/workspace-store.ts` keeps the same two refusals in preview mode (wording below 60 characters, and a target role that is not saved in this browser) and the same messages, and `removePreviewJobApplication` mirrors the schema's `on delete set null` so deleting a saved role clears a draft's pointer but keeps the wording the learner typed.
- Nothing in Phase 6 stores a generated document. The three builds run from the loaded workspace on every visit, so a record changed elsewhere moves the documents the next time they are read; only the learner's own wording is persisted.

## 7. UI architecture

- `src/components/shell/app-shell.tsx` provides the responsive sidebar/header, current-section context, preview-mode banner, and native `<dialog>` mobile navigation.
- `src/lib/navigation.ts` is the single source for the 12 destinations and their availability labels.
- `src/components/assessment/assessment-experience.tsx` drives the adaptive flow, confidence questions, constraints, review, and submission; `assessment-results.tsx` renders scores, strengths, gaps, career hypotheses, and the first-30-days plan.
- `src/components/roadmap/roadmap-experience.tsx` renders the active plan, week filter, task states, and replacement entry point; `roadmap-builder.tsx` creates a plan from a completed assessment; `task-plan.tsx` renders the curated session plan and references.
- `src/components/dashboard/dashboard-overview.tsx` is the daily workspace: assessment-first empty states, today's objective, session controls, rescheduling, weekly and overall progress, and recent sessions. `active-session.tsx` shows a live session.
- `src/components/tutor/tutor-experience.tsx` provides conversation history, 11-mode selection, optional roadmap-task attach, quota display, message list with demo badges, quick starts, a bounded composer, and deletion. Supabase history loads on demand through `loadTutorConversationAction`; preview history comes from the local AI store.
- `src/components/prompts/prompt-studio.tsx` provides category selection, optional context overrides, generation, title/body/tag editing, save/update, copy with a clipboard fallback, reuse, search, and deletion.
- `src/components/projects/project-lab.tsx` is the Project Lab: the template library with status filters, one readiness evaluation shared by the library and the recommendations so a row cannot disagree with itself, per-template lock state with the exact blocker, and the ranking against the learner's weekly hours. `project-workbench.tsx` is the opened copy of a template: ordered milestones with their evidence links, repository and deployment links, completion and reopen, the six-criterion rubric, and the portfolio checklists. `use-project-feedback.ts` dispatches every action to the preview store or the server action and surfaces the result.
- `src/components/progress/progress-analytics.tsx` renders the analytics payload from `buildProgressAnalytics`: the ranked next action first, then recorded study time, evidence lanes, roadmap and project summaries, learning activity, repeated mistakes, revision backlog, weekly consistency, and proficiency by category, with the standing disclaimers last. Nothing renders a number without the sentence that explains it, and the whole page collapses to a single empty state when no record exists yet.
- `src/components/career/career-explorer.tsx` is the `/careers` screen: the stage card with the label and every condition still missing, the choice form (two role selectors and a written reason, with the save button held until both roles differ and the reason is long enough), the ranked list where each row shows its confidence label and the sentence explaining where its points came from, then the experiments and the role profiles. The explanation is computed, not written by hand: a role with no career answers and no tested experiment says its score is 0 of 100 and that the order below is alphabetical rather than evidence-based, so the list never implies support it does not have.
- `src/components/career/experiment-board.tsx` runs one experiment at a time: Start opens the row and records the attempt, the steps and things-to-notice are shown while it is in progress, and the result is refused until all four whole-number reflections are picked and a link to the work is pasted in. Clearing a result returns the role to untested and takes the score back down. A note above the board says that starting an experiment records no study minutes; minutes only come from a session on the Dashboard.
- `src/components/career/role-profile-board.tsx` shows the 9 profiles as rows that expand on click, with the skills labeled as a listing that does not mark anything as mastered, and a card that explains the arithmetic in plain terms: the assessment fit out of 100, the reflection adding or subtracting up to 15, and difficulty excluded.
- `src/components/career/use-career-actions.ts` dispatches each action to the browser workspace in preview mode or the server action in Supabase mode, keeps one busy button at a time, shows the refusal message from the code that made it, and refreshes the server view only when there is a server to refresh.
- `src/components/intelligence/intelligence-board.tsx` is the `/intelligence` screen: the snapshot warning with the day it was read, the card that explains how the page sorted itself (the recorded direction and which record produced it, the skills scored under 60 out of 100 or the sentence saying there is nothing to compare against, then the three attention labels with their counts and meanings), the week groups newest first with "{matched} of {total} entries in this week match your filters", the area and label filters as pressable buttons carrying their own counts, a "Sources with no date shown" section, and the card listing what the page deliberately does not have. Every entry row shows its attention badge, its area, what changed, why it matters labeled as this app's reading, the sentence naming the record behind its label, the roles and skills it touches by name, and the source line with its link, kind, publication date and read date. Links open in a new tab with `rel="noreferrer noopener"`; nothing on the page is user input, so nothing on it is rendered as HTML.
- `src/components/interview/interview-prep.tsx` is the `/interview` screen. It takes the loaded workspace once, derives the assessment percentages and the highest evidence level per skill from it in one memo, and hands both down; it then stacks the practice board, the bank browser, the practice-material list and the role tracker under a card that states what an interview can and cannot prove here, quoting `INTERVIEW_EVIDENCE_RULE` rather than paraphrasing it.
- `src/components/interview/practice-board.tsx` holds the setup form (the 6 areas as chips, the optional target role, and the question counts the bank can actually fill, each hint computed from the real per-area counts), the open interview cards with "X of Y rated" progress and a finish button held until nothing is unrated, and `QuestionAnswer`, the panel that stores the written answer with one of the three ratings taken from `ANSWER_RATING_META`. `src/components/interview/question-bank.tsx` is a read-only browser by area, and each row says that reading it records nothing. `src/components/interview/materials-board.tsx` lists up to 6 skills with the cause sentence, up to 4 bank questions each, and links to the roadmap and the tutor; its empty state distinguishes "no assessment score to read" from "nothing qualifies, which is itself the result".
- `src/components/interview/application-board.tsx` is the tracker: the save form reads the pasted text live and can show the exact words it matched, the saved-role card holds status, dates, next action, notes and the posting text (editable, so the comparison can be re-run as records change), and the gap panel renders one row per skill the posting named with its position label, the quoted posting words, the evidence level and the `ignored` refusals under `DESCRIPTION_DISCLAIMER`. `src/components/interview/use-interview-actions.ts` dispatches each action to the browser workspace in preview mode or the server action in Supabase mode, keeps one busy control at a time, shows the refusal from the code that made it, and refreshes the server view only when there is a server to refresh.
- `src/components/materials/materials-workspace.tsx` is the `/materials` screen. It loads the workspace once, derives `buildSkillProofs` → `summarizeProofs` → the three document builds and the live `draftFingerprint` in memos over that one snapshot, and stacks the claim-strength card, the three `DocumentShell`s and the `TailoringBoard` under a header that counts the records it is writing from — projects and how many are finished, skill records, finished practice interviews, saved roles, and how many documents hold wording you saved. Its preview banner and `MATERIALS_DISCLAIMER` alert state what the page cannot see.
- `src/components/materials/document-shell.tsx` renders one document: the kind's own label and its two build sentences, three counts that each say what they count (lines written, lines carrying a caution, gaps named), the build summary, then `MaterialBlocks`, the plain-text export, and the `DraftPanel`. `material-blocks.tsx` renders each block with its entries, cautions, an instruction-slot warning when a line still holds a bracketed slot, and a collapsible provenance list naming the records behind that one line; an empty block prints the sentence that says no record reached it rather than nothing. `export-text.tsx` is the shared collapsible plain-text panel with the clipboard copy and its own failure message.
- `src/components/materials/draft-panel.tsx` is where the learner's wording lives. It seeds from the saved draft, keeps one draft per kind, shows the stored fingerprint read back as a sentence, and lists what moved since it was saved — or says plainly that nothing moved. A draft stored without a readable fingerprint reports that the counts are missing and does not guess them. The save button is held while the box is under `MIN_DRAFT_LENGTH`, with the remaining characters named, and a button that puts the generated text into the box warns that it replaces what is there and saves nothing by itself. Removing asks first, then clears the box.
- `src/components/materials/tailoring-board.tsx` shows nothing until a saved role is chosen, offers only the roles whose stored posting text is long enough to read, and renders `tailorToPosting` output through the same `MaterialBlocks` and `ExportText`, stating that the comparison has no saved wording of its own. `use-materials-actions.ts` dispatches to the preview store or the server action, keeps one busy control at a time, and tags each message with the panel that produced it so a refusal appears beside the box it belongs to rather than at the top of a long page.
- Loading, error, and not-found states live at the app root. Errors do not expose stack traces or raw provider messages.
- Client state is limited to forms, dialogs, hydration-safe preview data, and user feedback. Server components load persistent Supabase data.

### Accessibility and responsiveness

- Semantic landmarks and headings.
- Skip link to `#main-content`.
- Visible focus styles and labeled form controls with hints and error associations.
- Category and mode controls expose pressed/selected state; demo output is labeled in text, not color alone.
- Mobile navigation is a modal dialog and closes on navigation.
- Reduced-motion CSS disables smooth scrolling.
- Generated Next.js loading skeleton exposes `aria-busy` and screen-reader text.
- A full independent WCAG audit has not been performed.

## 8. Security boundaries

| Concern | Control |
| --- | --- |
| Supabase keys | Only public anon/publishable credentials reach the client; no service-role key exists in runtime config |
| AI keys | Provider credential is read only in server modules; the client receives mode/provider/model/status text only |
| User isolation | RLS on all user data; server actions scope reads/writes to the authenticated user; parent ownership re-checked for tasks, sessions, and tutor messages |
| CSRF/session | Supabase SSR cookie sessions; mutations use server actions |
| Input validation | Zod for profile and prompt generation; bounded normalization and server-side re-evaluation for assessment and workspace mutations; database constraints as a second layer |
| Score integrity | Assessment results are recomputed on the server from the stored question bank; client scores are ignored |
| Study-time integrity | Elapsed minutes derive from stored timestamps; only completed sessions count; abandoned sessions add zero |
| Evidence integrity | A milestone needs a link to the work it produced; completion needs every milestone plus a repository link; evidence rows are written only on completion and always with `verified = false`; reopening withdraws them |
| Prerequisite gating | Unlock decisions come from server-evaluated demonstrated evidence (scored section, completed task, completed project), never from degree, self-reported level, or confidence, and both data modes run the same `evaluateProjectReadiness` rules |
| Rubric isolation | Self-scored rubric results are stored on the project row and kept out of every demonstrated score and evidence count |
| Career claim limits | Role profiles, experiments, and the ranking contain no salary, hiring statistic, or open role, because nothing here reads a job board or a market source; the disclaimer and the note that entry bars are written descriptions, not data, are rendered with the content rather than hidden behind a menu |
| Intelligence content limits | The 22 entries are repository content, never fetched at runtime, so the page cannot be fed anything by a source changing underneath it; each carries the day it was read and the page states that it is a snapshot, not live research; a test rejects salary, hiring, vacancy, or open-role wording in any visible field, and only role and skill names already defined elsewhere in the app are allowed |
| Outbound links | Source links are https URLs written into the repository (not user input) and render with `rel="noreferrer noopener"` and no referrer leaking the learner's session; nothing from a source page is inserted as HTML |
| Career score integrity | A reflection can move a role by at most 15 of its 100 points, is ignored entirely until the experiment is recorded as tested with a link to the work, and never changes the assessment score itself; difficulty is stored and displayed but excluded from the arithmetic; the ranking is derived from stored records on every load, so no screen keeps a stale number |
| Experiment time honesty | Starting, completing, or clearing a career experiment writes no session row and adds no study minutes; only a session started and completed on the Dashboard counts toward recorded time, and both data modes enforce this |
| AI prompt injection | Trusted system instructions separated from untrusted learner context; context explicitly marked as data; no tools or function calling provided to the model |
| AI output integrity | Plain-text rendering; length caps; JSON-only prompt generation parsed with Zod; invalid shapes rejected and reported generically |
| AI abuse | Per-user rolling quotas (10/10 minutes, 60/day); provider timeout and single retry; bounded history and output |
| Misconfiguration | Missing or invalid AI settings produce an explicit error or demo mode; never a silent live fallback |
| Open redirects | Allowlist-style internal path validation; auth routes rejected |
| Sensitive errors | Generic user-facing messages; provider/DB codes logged server-side without credentials or response bodies |
| Local data | Explicit preview labeling; schema/structural validation on read; deliberate export and deletion controls; no multi-user security claim |
| Boundary proven | The policies above were executed, not just written: `scripts/rls/` applies every migration to a real PostgreSQL server and drives the schema as two accounts through 128 assertions covering reads, cross-account writes, forged ownership, anonymous access, the Phase 6 constraints, and cascade completeness. It found the missing `profiles` delete policy and the two pointer columns that checked only their own `user_id` |
| Deletion | Two workflows, each behind its own typed confirmation: learning data (keeps profile and sign-in) and account closure (18 record sets plus 5 cascading children). Neither can remove the `auth.users` row, so the screen states that limit and hands over the exact SQL and dashboard path for the remaining step |

Quotas are enforced by application logic over event rows, not by a database-level atomic limiter. Concurrent requests could briefly exceed a window. This is deliberate, documented best-effort protection rather than a billing control.

## 9. AI execution model (Phase 3, implemented)

- The browser submits a server action; it cannot supply a user id, provider name, model, key, or system prompt.
- The action re-authenticates, validates bounded input, loads owned profile/assessment/roadmap data, and builds the learner context on the server.
- Configuration is resolved in `getAiConfig()`. In `demo` mode, deterministic content is used. In `misconfigured` mode, the action returns a safe error. In `live` mode, quota is checked before the provider call.
- The provider adapter sends a system message plus bounded conversation history to a Chat Completions endpoint, with `cache: "no-store"` and an abort timeout.
- Responses are treated as untrusted text. Tutor replies are trimmed and persisted; generated prompts must parse as the expected JSON object before use.
- Only successful actions record usage. Demo and live calls are both recorded, with `is_demo` preserving provenance.
- The model is never given tools, function definitions, shell access, file access, browser access, or database credentials. Prompt instructions explicitly forbid claiming otherwise.

## 10. Testing and verification

- Vitest covers pure and stateful domain logic: profile schema and readiness; auth redirects; navigation invariants (all 12 destinations resolving, and none of them left as a placeholder); assessment scoring, adaptivity, answer handling, and option ordering; initial and regenerated roadmap shape, minute budgets, experiments, checkpoints, and prerequisites; preview workspace integrity, session lifecycle, abandoned-vs-completed accounting, rescheduling, and roadmap replacement; weekly and overall progress arithmetic; AI configuration, quotas, learner-context framing, prompt JSON validation, tag normalization, and demo determinism; project template shape, prerequisite readiness, rubric summarisation, milestone ordering, evidence creation and withdrawal, and the preview project store; progress analytics accounting for study time, evidence lanes, accuracy, repeated mistakes, revision backlog, weekly consistency, roadmap and project summaries, and next-action ranking; role profile and experiment content shape; career ranking arithmetic, the specialization stage, the choice summary, and the preview career store; the shape and date honesty of the 22 sourced intelligence entries, the direction precedence, the learn-now and learn-later rules against a learner's own records, and the weekly grouping; the interview bank's shape and its skill and role references, the posting reader's matching and its refusals, the gap report's four positions against the learner's own numbers, plan building and its refusals, the readiness count and the evidence rule, the derived practice list, and the preview interview store's refusals including the posting-text edit path; the application-material rules: the five claim strengths partitioning all 36 skills, the résumé's finished-work-or-score-70 gate and its refusal to promote your own rating of one answer, orphan evidence rows and unmatched templates counting as nothing, source provenance on every entry and the verified mark reserved for records confirmed outside the app, the two assumed LinkedIn ceilings and their character counts, the portfolio's three kinds of proof and its `reachable` / `no-link` / `not-checkable` split, the `NEVER_FROM_THIS_APP` and `PORTFOLIO_NOT_IN_RECORDS` lists reaching the screen as named gaps, the plain-text renderer stripping bracketed slots while keeping the section names, the draft fingerprint and its drift comparison, the tailoring build over a stored posting, and the preview material store's refusals (short wording with its length quoted, an over-long draft, a role not saved in this browser, one draft per document replaced rather than stacked, removal when there is nothing to remove, and wording surviving the deletion of the role it pointed at).
- The current suite is **337 tests across 27 files**, all passing.
- TypeScript strict mode, ESLint, and a production build are required checks.
- The Interview Preparation run, in preview mode with no Supabase tables to write to, checked: a 3-question plan built from one area; finishing being refused while a question was unrated, with the message naming the count as 2 of the 3 questions; the finished interview then writing 4 unverified skill records for the 4 distinct skills carried by the questions rated "I answered it"; answers and removals both being locked once the interview is finished; a second interview in which every answer was rated missed writing no record at all and instead producing the practice list derived from those misses; a saved posting whose pay and remote-work lines the reader reports as ignored rather than turned into skills; the gap report quoting the words it matched for each skill; the posting editor refusing a 78-character fragment against the 80-character minimum and then accepting a 219-character posting and recomputing its skills; and both interviews, both answer sets, the skill records and the saved posting still present after a page reload. It found one real defect: `/progress` showed "Nothing measured yet" to a learner whose only stored records were the 4 interview rows, because the flag deciding whether that page has anything to display did not look at skill records. `hasAnyData` in `src/components/progress/progress-analytics.tsx` now includes them, and the same screen was re-read afterwards showing the interview lane at "4 records, 4 skills, 0 verified".
- Headless-Chrome checks during Phase 5 covered the Career Explorer in preview mode: all 9 roles listed at 0 of 100 with no assessment stored, an experiment result refused until all four reflections and a link to the work were present, a saved reflection lifting the top role from 28 to 41 of 100, the confidence label changing after one experiment, the stage card naming what was still missing, a choice that disagreed with the ranking showing both role names and the written reason, clearing the result and watching the score fall back, and the study minutes and session records staying at zero because an experiment is not a logged session. Phase 4 checks covered the Project Lab golden path (start, ordered-milestone rejection, milestone submission with links, repository-link gate, completion evidence rows, rubric gating and persistence, reopen and withdrawal, status filters) and the Progress page in both its empty and populated states, including console cleanliness and link targets. Phase 3 checks covered tutor conversations, demo labeling, quota decrement, and prompt Studio persistence, saving, reload, search, reuse, and deletion. None of those drivers is part of the repository, so there is no maintained browser test suite yet.
- The browser used for these checks is attached to no visible window, so screenshots and synthesized clicks are unreliable and page content is read from the DOM instead. Local-preview pages fill their numbers after the shell arrives, and reading one sooner than one to two seconds after navigation shows only the skeleton — which is what made an earlier run report that Settings, Dashboard, Projects and Progress "never loaded". Waiting for hydration first, `/interview` and `/progress` were both read on screen during the interview run; Settings, Dashboard and Projects were read in the code during that run rather than on screen. `/careers` and `/intelligence` were both inspected on screen during their own runs.
- The Industry Intelligence run checked: 22 entry cards with their source links, publication dates and read dates; the week groups newest first from 26 October 2026 back to 16 June 2025; the month-dated DeepEval entry reading "July 2026 (the source dates this by month)"; the undated OpenTelemetry entry reading "no date shown on the source, read 27 October 2026" and landing in its own section; the filter counts (Learn now 4, Learn later 0, Just monitor it 18 once a target role was on file); selecting the empty label producing the no-entries notice with zero cards instead of a blank box; and, after temporarily removing and then restoring the local profile, all 22 entries reporting just monitor it with the reason naming the missing record and the headline recounting itself.
- Supabase end-to-end behavior and RLS require a live project with all eight migrations applied; the policies themselves have been executed against a real PostgreSQL server with two accounts (see the security table above and `scripts/rls/`), but they are explicitly unverified **on a hosted project** in this environment, including the Project Lab, Progress, Career Explorer, Industry Intelligence, Interview Preparation and Application Materials screens, which have only been exercised in preview mode. Live provider behavior requires a real key and has not been exercised here.

## 11. Phase roadmap

| Phase | Scope |
| --- | --- |
| 1 (complete) | Foundation, app shell, Supabase auth/profile code paths, local preview, honest dashboard/reference roadmap |
| 2 (complete) | Adaptive assessment, demonstrated-score results, personalized 13-week roadmap, prerequisite gates, session tracking, daily dashboard |
| 3 (complete) | Provider-independent AI Tutor, Prompt Studio, server-side safety, demo mode, and quotas |
| 4 (complete) | Project Lab with 10 gated templates, ordered milestones and links, rubric, evidence rows that completion creates and reopen withdraws, and evidence-based progress analytics with a single ranked next action |
| 5 (complete) | Career Explorer: 9 role profiles, 9 experiments with reflections, the ranking with its adjustment and confidence labels, the stage and the removable choice — done. Industry Intelligence: 22 sourced entries with dates, attention rules computed from your records, weekly grouping — done. Interview Preparation: 42-question bank in 6 areas, self-assembled plans, three self-ratings per answer, the unverified interview evidence rule, the practice list from your own gaps, the posting reader compared skill by skill against your records, and a 6-status role tracker — done. Its application-materials screen was the one part not built at the time, and Phase 6 below is that part |
| 6 (complete) | Application Materials: a résumé, LinkedIn guidance, and a portfolio review built only from rows the account already holds, over one shared claim-strength rule; provenance on every generated line, named gaps where a section has no record behind it, plain-text export with cautions and instructions stripped, the saved posting comparison, and one saved draft per document holding the learner's own wording with the record fingerprint it was written against |
| 7 | Hardening: security boundary tests, failure-state coverage, mobile checks, production operations and compliance review. Complete account deletion — done: two confirmation-gated workflows, a migration-derived coverage test, and an explicit statement of the `auth.users` row this app cannot remove |
