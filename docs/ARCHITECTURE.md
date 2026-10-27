# CareerForge AI — Architecture

## 1. Purpose and design principles

CareerForge AI is a personalized learning and career workspace for data science and future-tech roles. The long-term product includes adaptive assessment, a personalized roadmap, an AI tutor, prompt tooling, project work, career experiments, sourced industry intelligence, and interview preparation.

The application follows these rules in every phase:

1. **No fabricated state.** Unbuilt features are labeled as planned. Confidence is self-reported and shown separately from demonstrated assessment results. Study time starts at zero and only records real, completed sessions. Simulated AI output is labeled as demo output in the UI and in storage.
2. **Server-authoritative authorization.** User-specific reads and writes run on the server using the authenticated Supabase session. The browser never receives a service-role key or an AI provider key.
3. **Database-enforced isolation.** Every user-owned table has row-level security. Child rows are authorized through ownership of their parent.
4. **Honest modes.** Missing Supabase configuration produces an explicitly labeled local preview mode, not a simulated account. Missing AI configuration produces an explicitly labeled demo mode, not simulated live AI.
5. **Rules before generation.** The assessment and roadmap are deterministic, testable domain logic. AI is used only for conversational tutoring and reusable prompt generation, never for scores or mastery claims.
6. **Provider-independent AI.** AI calls pass through a server-only adapter. Provider selection, credentials, timeouts, validation, and quotas stay outside UI components.
7. **Small, testable phases.** Each phase must build, typecheck, lint, and pass tests before the next begins.

Phase 3 implemented the AI Tutor, the Prompt Studio, server-side AI actions and persistence, a provider-independent adapter, durable per-user usage quotas, and a clearly labeled demo mode.

Phase 4 added the Project Lab — 10 curated templates gated by demonstrated evidence, ordered milestones that each require a link to the work produced, a repository link before completion, and a self-scored rubric — and the progress analytics computed from those records.

Phase 5 begins the career side with the Career Explorer: 9 role profiles, 9 hands-on experiments (one per role, grouped into the five kinds the plan promised), a four-part reflection recorded after each one, a ranking that shows the assessment fit out of 100 and the reflection adjustment of up to 15 points, a stage that stays exploratory until the evidence is there, and a removable choice where you disagree with the ranking. It continues with Industry Intelligence: 22 entries read from their own sources on one stated day, grouped by week, each labelled learn now, learn later, or just monitor it by a rule that reads your records rather than an editor's opinion. Interview tooling remains planned.

## 2. System context

```text
Browser
  ├─ Public landing / auth screens
  ├─ Onboarding
  ├─ App shell: 11 destinations
  ├─ Dashboard, assessment, roadmap, tutor, prompts, projects, progress, settings
  └─ Local preview storage (localStorage)
        ├─ profile
        ├─ workspace: assessments, roadmaps, tasks, sessions, projects, milestones, evidence
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
- Signed-in users without a completed profile are redirected from the app shell to onboarding; completed users are redirected away from onboarding.
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
| `deleteLearningDataAction` | Typed `DELETE` confirmation; deletes sessions, roadmaps, assessments, evidence, projects (cascading their milestones), career experiments, the recorded career choice, tutor conversations, saved prompts, and usage events scoped to the authenticated user; profile and account are kept |

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

The migration `supabase/migrations/20261023000100_initial_schema.sql` defines **20 normalized tables** and **73 RLS policies**. The seed migration adds **36 skills** across programming, SQL, data science, machine learning, software development, AI engineering, and career categories. The Phase 3 migration adds `ai_usage_events` (3 more policies) and `is_demo` flags. The Phase 4 migration adds `template_key` to `project_milestones` plus a unique `(project_id, template_key)` index, so a project created from a template can be re-linked to that template's guidance and a re-run cannot duplicate its milestones. The Phase 5 migration adds a unique `(user_id, career_slug)` index on `career_experiments` and one owner-only delete policy on `career_preferences`, bringing the policy count to **77**.

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

`lessons`, `quiz_attempts`, job applications, and weekly reviews exist for later phases. Their presence is not evidence that those features work; the lesson, quiz, and interview evidence lanes on the Progress page therefore report zero records and say so in their own note. `career_experiments` and `career_preferences` are now read and written by the Career Explorer; `job_applications` still has no screen, which is why the Interview Preparation destination stays labeled planned.

Ownership is aligned with auth users so a future account-deletion workflow can cascade all user data safely. Deleting learning data through the current UI does not delete the account, and account deletion is not implemented yet.

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

## 7. UI architecture

- `src/components/shell/app-shell.tsx` provides the responsive sidebar/header, current-section context, preview-mode banner, and native `<dialog>` mobile navigation.
- `src/lib/navigation.ts` is the single source for the 11 destinations and their availability labels.
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
- `src/components/planned/planned-page.tsx` renders a real route with a "Planned for Phase N" badge, rationale, and agreed phase scope. It avoids dead links and fake dashboards.
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
| Deletion | Learning-data deletion requires typed confirmation and keeps the account; cascading schema supports future account deletion (Phase 6) |

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

- Vitest covers pure and stateful domain logic: profile schema and readiness; auth redirects; navigation invariants (including which destinations are working and which stay labeled planned); assessment scoring, adaptivity, answer handling, and option ordering; initial and regenerated roadmap shape, minute budgets, experiments, checkpoints, and prerequisites; preview workspace integrity, session lifecycle, abandoned-vs-completed accounting, rescheduling, and roadmap replacement; weekly and overall progress arithmetic; AI configuration, quotas, learner-context framing, prompt JSON validation, tag normalization, and demo determinism; project template shape, prerequisite readiness, rubric summarisation, milestone ordering, evidence creation and withdrawal, and the preview project store; progress analytics accounting for study time, evidence lanes, accuracy, repeated mistakes, revision backlog, weekly consistency, roadmap and project summaries, and next-action ranking; role profile and experiment content shape; career ranking arithmetic, the specialization stage, the choice summary, and the preview career store; the shape and date honesty of the 22 sourced intelligence entries, the direction precedence, the learn-now and learn-later rules against a learner's own records, and the weekly grouping.
- The current suite is **269 tests across 25 files**, all passing.
- TypeScript strict mode, ESLint, and a production build are required checks.
- Headless-Chrome checks during Phase 5 covered the Career Explorer in preview mode: all 9 roles listed at 0 of 100 with no assessment stored, an experiment result refused until all four reflections and a link to the work were present, a saved reflection lifting the top role from 28 to 41 of 100, the confidence label changing after one experiment, the stage card naming what was still missing, a choice that disagreed with the ranking showing both role names and the written reason, clearing the result and watching the score fall back, and the study minutes and session records staying at zero because an experiment is not a logged session. Phase 4 checks covered the Project Lab golden path (start, ordered-milestone rejection, milestone submission with links, repository-link gate, completion evidence rows, rubric gating and persistence, reopen and withdrawal, status filters) and the Progress page in both its empty and populated states, including console cleanliness and link targets. Phase 3 checks covered tutor conversations, demo labeling, quota decrement, and prompt Studio persistence, saving, reload, search, reuse, and deletion. None of those drivers is part of the repository, so there is no maintained browser test suite yet.
- The browser used for these checks had no window attached to it during the Phase 5 run, so the pages that stream their content after the shell (Settings, Dashboard, Projects, Progress) did not finish loading there and were read in the code instead of on screen. `/careers` and `/intelligence` render in one step and were both inspected on screen.
- The Industry Intelligence run checked: 22 entry cards with their source links, publication dates and read dates; the week groups newest first from 26 October 2026 back to 16 June 2025; the month-dated DeepEval entry reading "July 2026 (the source dates this by month)"; the undated OpenTelemetry entry reading "no date shown on the source, read 27 October 2026" and landing in its own section; the filter counts (Learn now 4, Learn later 0, Just monitor it 18 once a target role was on file); selecting the empty label producing the no-entries notice with zero cards instead of a blank box; and, after temporarily removing and then restoring the local profile, all 22 entries reporting just monitor it with the reason naming the missing record and the headline recounting itself.
- Supabase end-to-end behavior and RLS require a live project with all five migrations applied; they are explicitly unverified in this environment, including the Project Lab, Progress, and Career Explorer screens, which have only been exercised in preview mode. Live provider behavior requires a real key and has not been exercised here.

## 11. Phase roadmap

| Phase | Scope |
| --- | --- |
| 1 (complete) | Foundation, app shell, Supabase auth/profile code paths, local preview, honest dashboard/reference roadmap |
| 2 (complete) | Adaptive assessment, demonstrated-score results, personalized 13-week roadmap, prerequisite gates, session tracking, daily dashboard |
| 3 (complete) | Provider-independent AI Tutor, Prompt Studio, server-side safety, demo mode, and quotas |
| 4 (complete) | Project Lab with 10 gated templates, ordered milestones and links, rubric, evidence rows that completion creates and reopen withdraws, and evidence-based progress analytics with a single ranked next action |
| 5 (mostly complete) | Career Explorer: 9 role profiles, 9 experiments with reflections, the ranking with its adjustment and confidence labels, the stage and the removable choice — done. Industry Intelligence: 22 sourced entries with dates, attention rules computed from your records, weekly grouping — done. The interview and job-application workspace — not started |
| 6 | Hardening, complete account export/deletion, production operations and compliance review |
