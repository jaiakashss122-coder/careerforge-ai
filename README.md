# CareerForge AI

A personalized learning and career workspace for data science and future-tech roles. CareerForge AI is built in reviewable phases; this repository currently contains **Phase 6: Application Materials, where a résumé, LinkedIn guidance and a portfolio review are assembled only from records already stored on your account — every line names the record it came from, every gap is stated instead of papered over, and the wording you save is yours, kept with a fingerprint of the records it was written against so the screen can tell you when your records have moved**. Phase 5 (Career Explorer, Industry Intelligence and Interview Preparation), Phase 4 (Project Lab and progress analytics), Phase 3 (AI Tutor and Prompt Studio) and Phase 2 (assessment, roadmap, dashboard) are also in the repository.

The application is intentionally honest about scope:

- It does not invent skill mastery, study activity, projects, or career evidence.
- Self-reported confidence is kept separate from the assessment's demonstrated score. A skipped or incorrect answer points to a concept and a remedial step; it never silently lowers or raises a mastery claim.
- Without Supabase credentials, the app runs in a clearly labeled **local preview mode**. Profile, assessment, roadmap, session, project, evidence, career experiment, career choice, practice interview, written answer, saved role, application-material draft, tutor, and prompt records live in this browser only; no account is simulated.
- Without an AI provider key, tutor replies and generated prompts come from deterministic curated demo content and are labeled as demo output in the UI and in stored records.
- All twelve destinations in the navigation work. Nothing is faked to fill a screen: a feature that does not exist is left out of the interface and named in the limitations at the end rather than shown as a placeholder chart.
- Weekly hours and task minutes are **plans**, not recorded activity. Recorded study time starts at zero and only accumulates when a session is started and completed.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, security boundaries, and phase plan.

## What works in Phase 6

| Area | Status |
| --- | --- |
| Responsive application shell with 12 destinations, all 12 working | Working |
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
| Interview Preparation: a 42-question bank across 6 areas (Python 8, SQL 8, statistics 6, machine learning 7, behavioural 5, role-specific 8), each with what a good answer contains and follow-ups | Working — the bank is written content, and the page says so |
| Practice interviews you build yourself: any of the 6 areas, 3, 5, 7, 10 or 12 questions, an optional target role that adds the questions written for that role, least-practised question first | Working — nothing is chosen at random, so a plan can be traced back to the area it came from |
| Three ratings per answer ("I answered it", "I got part of it", "I could not answer it") with the written answer kept beside it, edit by removing and re-answering | Working — a question you skipped is never counted as a question you answered |
| Interview evidence rule: a finished interview writes one unverified skill record per distinct skill on a question you rated "I answered it", and only for skills this app's 36-skill catalogue knows | Working — refusing to finish until every question is rated, `verified = false` on every row, partial and missed answers write nothing |
| Question bank browser: read any question, its points, its follow-ups, its skills, and every answer you recorded to it and which interview that answer came from | Working — reading the bank records nothing, and the page says so |
| What to work on before the interview: up to 6 skills your own assessment scored under 40 of 100, or that an answer you rated "I could not answer it" needed, each with up to 4 bank questions, the last time you answered one of them, and links to the roadmap and the tutor | Working — nothing is suggested from a guess about the person |
| Job posting reader: paste 80 to 6,000 characters and it names the catalogue skills found, the roles it recognized, the words it read, and the lines it refused to treat as a requirement (pay, where the work happens, seniority) | Working — a phrase list matched against your pasted text, not an AI reading, and the screen says so |
| Skill-by-skill comparison of that posting against your own records: your records support it, part of the way, no record either way, below the line — from assessment percentages and evidence levels, with the record quoted under each | Working — the posting text is stored on your own account and read back only there |
| Role tracker with 6 statuses (Saved, Prepared, Applied, Interviewing, Offer, Closed) and two kinds (an opening you found, a written example), with next action, dates, notes, and posting text you can edit later | Working — status and dates are what you typed; nothing is fetched from a job board |
| Application Materials — résumé: the skills with finished work behind them, the ones only a score carries, the ones this app refuses to write, your projects with their stored repository links, practice labelled as practice, and education in the words you gave | Working — it writes no line for employment, grades, salary, awards or any measurement it does not hold, and a section it cannot fill says so and lists what is missing |
| One claim-strength rule shared by all three documents: finished work / a score at or above 70 / only your own rating of one answer / below the line / no record at all, with every one of the 36 skills landing in exactly one bucket | Working — the five counts are shown adding to 36 so a skill cannot sit in two rows |
| LinkedIn guidance: headline and about counted against the 220 and 2,600 characters this app was told, work lines labelled project or self-directed rather than a job, a skills list limited to what your records back, and featured links taken only from stored URLs | Working — nothing here opens LinkedIn, so the two ceilings are stated as this app's own assumption and the screen says to check the live number |
| Portfolio review: only a repository link, a live link, or a milestone with the work attached counts as proof, so each checklist item is sorted into openable by a reviewer, missing its link, or not checkable from inside this app | Working — no link is ever opened here, so a matching link means a reviewer could look, not that this app did |
| Written for one posting: pick a saved role and its stored posting text is matched at the same 70-of-100 line the interview screen uses, listing what you may write for this job, what you cannot back, and which finished project leads best | Working — it shows nothing until you choose the role, and it has not checked that the posting exists |
| Every generated line can be opened to the records it came from, verified ones marked as confirmed outside this app; a bracketed line means this app could not write one and stays on screen | Working — the copied text drops those cautions, provenance and brackets |
| Your own saved wording, one draft per document, stored with a count of the records it was written against and compared again on every visit | Working — both save paths recompute that count from stored records, never from what the browser sends, and a damaged stored count is reported as missing rather than guessed |
| Plain text of each document for a résumé builder or a file, with the section names kept and the instructions stripped out | Working — copying needs a browser clipboard, and the text stays selectable when it does not |
| Full account export and account deletion workflow | Working — the export covers everything including interviews, answers, saved roles and saved application-material drafts, and "Close this account" deletes all 18 record sets the account owns plus 5 child tables that leave through their parent. The sign-in row itself stays, because it lives in Supabase's authentication service and the only key that could delete it is one this project never holds; the screen hands you that one remaining step with your own id filled in |

Every destination in the navigation is reachable and works. The features that do not exist are listed under "Privacy, limitations, and known gaps" rather than shown as placeholders.

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
12. **Practise.** Interview Preparation opens a practice interview you assemble — any of the 6 areas, 3 to 12 questions, optionally weighted toward a target role — and you write each answer and rate it yourself: "I answered it", "I got part of it", or "I could not answer it". Finishing is refused while any question is unrated, because a question you skipped is not a question you answered. When it does finish, one unverified skill record is written for each distinct skill on a question you rated as answered, and only for a skill in the 36-skill catalogue. Nothing else is written: a part-answered or missed question adds no record, and every row carries `verified = false` because the only person who checked it was you. The same screen reads a job posting you paste (80 to 6,000 characters) against the catalogue with a phrase list — not an AI — shows the exact words that matched, refuses to turn pay, location or seniority wording into a claim, and then compares each skill it found to your own assessment percentage and evidence level, quoting the record under each verdict. Saved roles carry a status, dates, a next action, notes, and the posting text, which stays editable so the comparison can be re-read as your records change.
13. **Assemble the application.** Application Materials writes three documents — a résumé, LinkedIn guidance, and a portfolio review — from the rows already on the account and nothing else. A skill reaches the résumé only when a project you completed names it or your own assessment scored it at 70 or above; your own rating of a practice answer never puts a skill on a résumé. Each line can be opened to the record it came from, and a section your records do not reach is left empty on purpose with the missing items listed under it. The same screen keeps the wording you typed yourself, one draft per document, beside a count of the records that count was written against, so when your projects or scores move on, the draft says so instead of looking current. Below the three documents, choose a saved role and its posting text is compared to your records at the same line the interview screen uses, so the application can be written for that job without inventing a skill to fit it.

Roadmap content is a curated, deterministic curriculum shaped by assessment results, focus tracks, weekly hours, and constraints. It is not AI-generated and does not claim to verify mastery. Tutor replies and generated prompts are AI output only when a provider is configured; otherwise they are deterministic demo content. Project and rubric records are self-submitted: every evidence row created here is stored with `verified = false` until something outside the app confirms it, and the six rubric criteria are scored by you and kept apart from assessment results. Career experiment records are self-submitted too — the link to the work is stored but never opened, and a tested experiment is evidence that you did the activity, not that anyone external reviewed it. Industry Intelligence is quoted rather than authored: each "what changed" line repeats what the linked page states, each "why it matters" line is labeled as this app's reading of it, and the page publishes no salary, hiring or open-role figure because nothing was read that could support one. The 42 interview questions, their points and their follow-ups are written content in the repository, and the screen says so. An interview rating is your own judgment with nobody outside it checking, so it writes an unverified record at most and never a demonstrated score. The job-posting reader is a phrase list matched against text you pasted, not an AI reading the role, and the role tracker holds only what you typed: no job board was fetched, so no opening shown here is claimed to be live, and the tracker makes you label each entry as an opening you found or a written example. The three application documents are derived rather than authored: every line names the record it came from, employment and any measurement this app did not take are never written, a bracketed line marks a sentence this app could not write and stays on screen instead of going into the copied text, and the wording you save is yours — the app puts text in that box only when you press the button that says it will, and it never edits what you typed afterwards.

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
   - `supabase/migrations/20261027000300_phase5_interview_prep.sql`
   - `supabase/migrations/20261027000400_phase6_application_materials.sql`
   - `supabase/migrations/20261028000100_phase7_rls_hardening.sql`

   Use the Supabase SQL editor or the Supabase CLI. Across the eight files the schema ends at 24 tables and 90 row-level-security policies: 89 owner-only, and one public read of the 36-row skill catalogue, which holds no personal data. The first migration creates the 20-table schema, 73 policies, the profile trigger, and the 36-skill catalogue. The Phase 3 migration adds `is_demo` flags to tutor messages and saved prompts and creates `ai_usage_events` with three owner-only policies. The Phase 4 migration adds `template_key` to `project_milestones` with a unique `(project_id, template_key)` index; `projects` and `project_milestones` themselves, with their owner-only policies, already exist in the first migration. The Phase 5 career migration adds a unique `(user_id, career_slug)` index on `career_experiments`, so one role cannot accumulate several competing results, and adds the missing owner-only delete policy on `career_preferences`, so your recorded career choice is covered by the deletion workflow. `career_experiments` and `career_preferences`, with their other owner-only policies, already exist in the first migration. The Phase 5 interview migration creates `mock_interviews` and `interview_attempts` with four owner-only policies each, adds a unique `(interview_id, question_id)` index so a double tap cannot record two answers for one question, adds a `description` column to `job_applications` so a saved posting keeps the words it was read from, and replaces that table's status check with the six statuses the screen actually records. The Phase 6 materials migration creates `application_materials` with four owner-only policies and a unique `(user_id, kind)` index, so one document cannot accumulate several competing drafts; it stores only the wording you typed plus a JSON fingerprint of the records that wording was written against, because the generated sections are re-read from your rows every visit and a copy of them would go stale. Its `application_id` column points at a saved role `on delete set null`, so deleting the role keeps your text and drops only the pointer. Nothing is dropped or rewritten in place, and no row used the old `rejected` and `withdrawn` values because the database had not been created when that decision was made. The Phase 7 migration closes two gaps the boundary probe found on a real PostgreSQL server: `profiles` had select, insert and update policies but no delete policy, so account closure could never remove the profile row; and the Phase 5 and Phase 6 tables checked only their own `user_id`, unlike the first migration's child tables, which also prove the row they point at belongs to the same account — so an answer could name another account's interview and a saved document could name another account's role. Both writes are now refused, and the id stops being an existence oracle.
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
6. Restart the dev server, then sign up. Leave **Confirm emails** off for local testing, as decided below, so both test accounts can sign in immediately. Turn it on before anyone else uses a deployment.
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

### Email confirmation: the decision for local testing

**Off locally, on in production.** In Supabase Authentication → **Sign In / Up**, the "Confirm emails" toggle stays off for the project you develop against.

Why off locally:

- The checklist below is run with two accounts and needs each one signed in before the next step. With confirmation on, sign-up returns no session until a link is clicked, so every one of the 35 items waits on an inbox.
- Supabase's built-in sender is rate-limited and intended for development, so a confirmation mail that never arrives blocks testing in a way that looks like an app bug and is not one.
- Nothing about the app's behavior depends on the toggle. `signUpAction` already branches: when Supabase hands back a session it redirects into onboarding, and when it does not it returns "Account created. Check your inbox and confirm your email address, then sign in to continue." `/auth/callback` exchanges the confirmation code for a session and redirects only to a validated internal path. Turning the toggle on later is therefore a configuration change, not a code change.

Why on in production: without confirmation, an account can be created for any address, including someone else's. Anyone who can read that mailbox can set a password and sign in. Keep it on for any project that holds another person's records, and point the confirmation template at your real domain before you announce the app to anyone.

With confirmation off, one honest limit remains: this app never verifies an email address, so a profile's email is only what the learner typed into it. Nothing in the application materials, the export, or any on-screen claim treats a verified address as proof of anything.

### Verify a Supabase connection

These checks are required before treating a deployment as verified, because Supabase behavior has not been executed against a live project in this environment:

1. Sign up with an email address and password and confirm the account signs straight into onboarding, because **Confirm emails** is off as decided above. Finish onboarding and confirm one `profiles` row exists — written by the `on_auth_user_created` trigger, not by the browser. Then turn confirmation on in the project settings, sign up a third address, and confirm the app shows "Account created. Check your inbox…" instead of signing that account in, and that the link lands on `/auth/callback`.
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
12. Open `/settings/export` and confirm the JSON contains the signed-in account's profile, answers, roadmaps, sessions, projects with milestones, skill evidence, career experiments with reflections, career choice, interviews with written answers, saved roles with their posting text, application-material drafts with their fingerprints, prompts, and tutor conversations only.
13. Delete learning data, then confirm the profile and sign-in account remain, and that AI conversations, prompts, usage events, projects with their milestones, skill evidence, career experiments, the recorded career choice, saved roles, interviews with their answers, and the application-material drafts were removed.
14. Open `/projects`, start an unlocked template, and confirm one `projects` row plus its `project_milestones` rows with `template_key` set. Confirm a locked template cannot be started by calling the action directly.
15. Try to complete a later milestone before the earlier one, and confirm the server refuses. Submit each milestone in order with a link, then confirm completion is refused until a repository link exists.
16. Complete a project and confirm `user_skill_evidence` rows appear with `verified = false`, that the rubric is refused before completion and accepted after, and that reopening the project removes exactly those evidence rows.
17. Open `/progress` and confirm every figure matches the stored rows: recorded minutes come only from completed sessions, accuracy excludes self-report and preference answers, the lesson and quiz lanes stay at zero because those features are not built, the interview lane holds only rows from finished interviews, and the next action names the rule that picked it.
18. Open `/careers` and confirm all nine roles are listed, that each score states where its points came from, and that starting an experiment writes one `career_experiments` row with the role, the status, and the work description as it read at that moment.
19. Try to record a result with a rating missing or with no link to the work, and confirm the server refuses both. Then supply all four ratings and a link, confirm the row becomes completed, and confirm no `learning_sessions` or minute total changes, because an experiment is not a study session.
20. Start a second experiment for the same role from a direct action call and confirm the unique `(user_id, career_slug)` index refuses it. Clear the result, confirm the ranking falls back to the assessment-only score, and confirm the second test account cannot see the row.
21. Save a career choice that disagrees with the ranking, with a written reason, and confirm one `career_preferences` row holds both slots and the reason. Confirm a choice with two identical roles or no reason is refused, that saving again replaces the row rather than stacking, and that the delete workflow removes it.
22. Open `/intelligence` and confirm the entry list, the week groups and the read dates render from the same `career_preferences`, `assessments`, and `career_experiments` rows the Career Explorer writes — change your saved choice, reload, and the learn-now count moves. The page writes nothing, so confirm no new row appears in any table and that a second account cannot see the first account's labels.
23. Open `/interview`, choose an area and a question count, and start a practice interview. Confirm one `mock_interviews` row with its label, the areas picked, the question ids it planned and `completed_at` null — and that no `user_skill_evidence` row exists yet, because an open interview writes nothing.
24. Rate every question but one and press finish; confirm the server refuses and names how many are unrated. Rate the last one and finish: confirm `completed_at` is set, one `interview_attempts` row per question carrying the `prompt` and `skills` copied at the time of answering, and `user_skill_evidence` rows at `source_type = 'interview'` for exactly the distinct catalogue skills on the questions rated "I answered it" — each with `verified = false`, and none for a part-answered or missed question.
25. Send a second answer for a question already rated in the same interview and confirm the unique `(interview_id, question_id)` index refuses it rather than stacking a rival row. Try to change or remove an answer after finishing and confirm both are refused. Then remove the interview and confirm its attempts and its own evidence rows go with it while another interview's rows stay.
26. Save a role with 80 to 6,000 characters of posting text and confirm the `job_applications` row stores that text and the skill list read from it. Confirm a posting shorter than 80 characters is refused, that editing the text later re-reads the skills instead of keeping the old list, that clearing the field leaves the row with nothing to compare, that an `applied` status needs a date, and that only a status from the six the check allows is stored. Then confirm `/settings/export` contains the interviews, every written answer and the saved roles with their text, and that the second account cannot read any of it.
27. Open `/materials` on the account that has finished project work and confirm the résumé lists a skill only when a completed project names it or the assessment scored it at 70 or above, that each line opens to the records it came from, and that a skill resting only on your own rating of a practice answer stays out of the résumé skill list. Confirm the five claim-strength counts add to 36.
28. Open `/materials` on a fresh account with no records and confirm every section writes no line, states why, and lists what is missing underneath — and that no job title, employer, grade, salary, certification or institution name appears anywhere on the page.
29. Save your own wording for the résumé and confirm one `application_materials` row holding the content, the target role, the linked `application_id` and the `built_from` fingerprint. Confirm wording under 60 characters is refused with its own length quoted, that saving again replaces that row instead of stacking, that a second résumé pushed through the action directly is refused by the unique `(user_id, kind)` index, and that wording over 20,000 characters is refused.
30. Finish a project or complete an assessment, then reload `/materials` and confirm the saved draft lists the counts that moved rather than looking current, and that the fingerprint stored on the new save was recomputed from the database rows — sending a false `builtFrom` from the browser must not change what is stored.
31. Delete the saved role a draft was linked to and confirm the draft keeps its wording with `application_id` set to null. Then confirm `/settings/export` carries each draft with its fingerprint, that the second account cannot read them, and that deleting learning data removes the `application_materials` rows while the profile and sign-in stay.
32. On the throwaway account, open `/settings` → "Close this account", confirm the button stays disabled until `CLOSE ACCOUNT` is typed exactly, and confirm a wrong word is refused server-side with the wording of the requirement rather than deleting anything.
33. Confirm closure leaves zero rows for that user id in all 18 record sets and zero cascade children (`assessment_answers`, `project_milestones`, `roadmap_tasks`, `roadmap_task_prerequisites`, `tutor_messages`), that `public.skills` still holds 36 rows, and that the second account's rows are untouched — this is the check that would expose a delete list that drifted from the schema.
34. Confirm the result screen states the remaining step instead of hiding it: the `auth.users` row is still there, the SQL shown carries the closed account's own id, the dashboard path is named, signing back in restarts onboarding rather than restoring the old workspace, and "Sign out now" ends the session.
35. Measure `/sign-in`, `/sign-up`, `/account/close` and the closure result at 320 px and 390 px wide. Preview mode redirects all four, so they are the only screens the narrow-viewport sweep in Phase 7c could not reach, and a hosted project is where their horizontal fit and tap targets get checked.

The verification checklist above needs a hosted project. This section needs a local PostgreSQL server instead, and it is the only way the row-level-security claims in this repository have actually been executed anywhere.

`scripts/rls/` holds the harness. It is test scaffolding, not application code, and nothing in it ships:

- `shim.sql` — a local stand-in for what Supabase itself provides: the `auth` schema, `auth.users`, and `auth.uid()` / `auth.role()` reading the `request.jwt.claim.sub` / `request.jwt.claim.role` settings exactly as PostgREST sets them on a real request. On a hosted project these objects already exist and are platform-owned, so this file is never applied there.
- `apply.sh` — drops and recreates the scratch database `careerforge_rls_test` (it refuses to run against any other name), creates the `anon` / `authenticated` / `service_role` roles if missing, applies the shim, then applies every file in `supabase/migrations/` in strict filename order with `ON_ERROR_STOP=1`, and prints the resulting inventory. It also grants the two API roles broad table privileges through default privileges, so a row the probe says is blocked is blocked by a **policy**, not by a missing grant.
- `probe.sql` — seeds two accounts through the real `handle_new_user()` trigger, writes at least one row per table for each of them with FK-consistent parents, and then switches identity the way the API does to drive the assertions.

```bash
bash scripts/rls/apply.sh
psql -h localhost -U "$USER" -d careerforge_rls_test -v ON_ERROR_STOP=1 -f scripts/rls/probe.sql
```

The probe prints one PASS/FAIL row per table per assertion and raises an exception at the end if anything failed, so a green run means exit code 0 rather than a glance at a wall of text. What it covers, and what each part would catch:

| Assertion | What it does | What a failure would mean |
| --- | --- | --- |
| onboarding | Inserting into `auth.users` as the trigger does | A signup that gets no profile row, so onboarding never ends |
| a | As account A, the rows visible in every table are exactly A's, with the counts printed | A read path that leaks another learner's records |
| b | As B, selecting, updating or deleting A's literal row ids touches 0 rows, and A's row is unchanged afterwards | One account rewriting or wiping another's work |
| c | As A, inserting a row whose `user_id` is B's is refused on every table | Forging a record into someone else's workspace |
| d | As `anon`, 0 rows are visible in all 23 owner-scoped tables and 36 in `skills` | An unauthenticated read of personal data |
| e | The Phase 6 constraints: one draft per document kind, the `kind` check, the 20,000-character ceiling, and a pointer at another account's saved role | An unenforced rule the application layer alone was protecting |
| f | Deleting the account the way closure does, then checking that every A row is gone including the cascade children, every B row survives untouched, and `skills` still holds 36 | A closure that quietly leaves rows behind |
| g | Negative control: a temporary `using (true)` policy is installed on one table, the probe proves it leaks, then drops it and proves the boundary returns | A probe that passes because it never had the power to fail |

Latest local run: 24 tables, RLS on 24 of 24, 90 policies of which 89 are owner-scoped and the only exception is the public read of the skill catalogue, 13 non-internal triggers, 36 skill rows, and **128 checks passing across the onboarding and a–g assertions with 0 failures**.

Three things this harness cannot prove, stated because the run is green: it is not a hosted Supabase project, so the API gateway, the real JWT claims and the platform's own `service_role` (which carries `BYPASSRLS` there and not here) are only modelled; no table uses `FORCE ROW LEVEL SECURITY`, so a table owner bypasses policies, which is the Supabase convention and is why the app never connects as an owner; and it proves the database boundary, not the server actions that sit in front of it.

What it did find, and what was done about it, is the reason to keep running it: `profiles` had no delete policy at all, so the closure workflow this repository ships would have reported success while leaving the profile row standing, and the Phase 5/6 tables checked only their own `user_id` rather than also proving that the row they point at belongs to the same account, which let one account write a reference to another's row and learn that the id existed. Both are closed by `20261028000100_phase7_rls_hardening.sql`, and the legitimate paths were re-checked by hand afterwards: an own-role pointer inserts and updates fine, deleting the saved role still sets the pointer to null rather than taking the draft with it, and the owner can now delete their own profile row.

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
    (app)/                 Signed-in shell: dashboard, assessment, roadmap, tutor, prompts, projects, progress, careers, intelligence, interview, settings
    (auth)/                Sign-in and sign-up screens
    auth/callback/         Supabase confirmation callback
    onboarding/            Profile setup outside the app shell
    account/close/         Account closure, outside the shell so a deleted profile cannot redirect the learner away from the result
  components/
    assessment/            Assessment flow and results
    dashboard/             Daily objective, session controls, progress
    roadmap/               Roadmap view, builder, task details
    tutor/                 Tutor chat, mode and task selection, conversation history
    prompts/               Prompt Studio builder, editor, saved prompt list
    projects/              Project Lab library, workbench (milestones, links, rubric), feedback hook
    career/                Career Explorer, experiment board, role profile board, feedback hook
    intelligence/          Industry Intelligence snapshot board: entry rows, source lines, area and attention filters
    interview/             Interview Preparation board: setup form, answer panel, question bank browser, practice-material list, role tracker and posting comparison, action hook
    materials/             Application Materials: three document cards, provenance list, saved-wording draft panel, plain-text export, posting tailoring board, action hook
    progress/              Progress analytics cards and category breakdown
    shell/ profile/ settings/ ui/
  lib/
    ai/                    Config, provider adapter, prompts, demo content, context, quotas, repositories, actions
    assessment/            Question bank, adaptive engine, scoring, records, career fit
    auth/                  Session viewer, route rules, auth actions
    career/                Nine career-track definitions, role profiles, nine experiments with reflections, exploration scoring, repository, actions, types
    evidence/              Skill evidence records and lane definitions
    intelligence/          The 22 sourced entries with their dates, topic and source-kind labels, attention rules, and weekly grouping
    interview/             The 42-question bank in 6 areas, the three answer ratings, the mock-interview builder and its evidence rule, the posting reader and gap report, practice-material list, repository, actions, types
    materials/             Claim-strength rules over the 36 skills, the résumé, LinkedIn and portfolio builders, the posting tailoring builder, the draft fingerprint and its drift comparison, plain-text renderer, repository, actions, types
    preview/               Browser-only profile, workspace, assessment-draft, project, career, interview, materials, and AI stores
    profile/               Zod schema, repository, readiness logic, actions
    projects/              Ten project templates, readiness gates, rubric, repository, actions, types
    progress/              Analytics builder, next-action ranking, types
    roadmap/               Deterministic 13-week generator, initial plan, repository
    sessions/              Session presets, types, repository
    workspace/             Server actions, action types, progress calculations, server workspace loader, the owned-table lists both deletion workflows read, and the shared delete loop with the sentences each workflow says
    supabase/              Browser/server clients and generated-style types
  proxy.ts                 Next.js 16 request proxy for session refresh and guards
supabase/migrations/       PostgreSQL schema, RLS, triggers, skill seed, Phase 3 AI tables, Phase 4 project tables, Phase 5 career tables, Phase 5 interview tables, the Phase 6 application-materials table, and the Phase 7 policy hardening
scripts/rls/               Local security-boundary harness: the auth shim, the ordered migration runner, and the two-account RLS probe. Test scaffolding, never shipped or imported by the app
docs/ARCHITECTURE.md       Architecture and security notes
```

## Testing

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The current suite is **441 Vitest tests across 32 files** covering:

- profile schema, readiness, navigation, and safe redirects;
- deletion coverage read from the migrations themselves: every table the schema creates is accounted for, every table carrying a `user_id` appears in the account-closure list, every child with no account column cascades from a parent that list really deletes, children are deleted before their parents, `profiles` goes last and is never the parent another row hides behind, the learning-data list sits inside the account list, and the shared skill catalogue is never claimed as the account's own;
- the two deletion workflows' failure states: the table-by-table loop reaching every table in order, halting at the first failure without touching a later one and waiting per table rather than racing, each table attempted exactly once, the confirmation phrase each screen displays being the same phrase the server demands, no sentence shared between the two workflows, and the half-done message naming the table it stopped at and promising only what its own list makes true;
- assessment scoring, adaptive follow-ups, answer-key handling, and deterministic option ordering;
- initial and regenerated roadmap shape, weekly minute budgets, experiments, checkpoints, and prerequisite edges;
- preview workspace integrity, session lifecycle, abandoned-vs-completed accounting, rescheduling, and roadmap replacement;
- weekly/overall progress arithmetic;
- AI configuration resolution and demo fallback, quota windows and retry timing, learner-context framing and truncation, prompt JSON parsing and tag normalization, demo reply/template determinism, and provider-independent request boundaries;
- every way the live AI provider can fail, driven against a stubbed transport: demo and misconfigured modes opening no connection at all, a rate limit read once and reported as retryable, a rejected credential not retried, a server-side error retried exactly once and then reported, a successful retry staying successful, a hang labelled as a timeout, an unreachable host retried once and named as unreachable, a body that is not JSON, six shapes of unusable payload reported as an empty response rather than rendered, and the reply trimmed and capped before it reaches a screen. The request itself is pinned too: URL, bearer header kept server-side, token limit, the system message first, and only the last twelve turns each capped in length;
- project template shape, prerequisite readiness (which evidence unlocks a template and which does not), rubric summarisation, milestone ordering, and evidence creation or withdrawal on completion and reopen;
- progress analytics: recorded-study-time-only accounting including abandoned and still-running sessions, evidence lanes kept apart, accuracy that excludes self-reports and preferences, repeated mistakes requiring two separate attempts, revision backlog and remedial fallbacks, weekly consistency runs, roadmap and project summaries, and the ranked next action;
- role profile content: every career track the app knows about has a profile, each with enough detail to describe the real work, portfolio projects that exist in the project library, and at least four named skills the assessment can screen; the nine experiments cover every track exactly once and group into the five kinds the plan promised; every task description is specific enough to start, and both ends of each rating scale are explained so a number cannot be misread;
- career exploration: the nine roles ranking at zero with no assessment stored, the saved target role staying in the short list even when it scores lower, an untested role keeping its assessment score and being called a hypothesis, a tested role overtaking one that only scored higher on the assessment, difficulty never moving a score, no score passing 100, the live profile target beating an older saved target, completed projects counting as evidence for every role they cover while paused projects count for none, the specialization stage staying exploratory until the leader is tested and a second experiment and a finished project exist, and a choice against the ranking keeping your written reason visible;
- preview career storage: starting an experiment records the work description as it stood then, a second copy of the same role is refused, a start adds nothing to study time, a result requires the experiment to have been started plus a real web address and all four ratings, an existing result is never silently overwritten, clearing lets the role be tried again, a recorded choice needs reasoning and only one choice is kept, and stored rows for unknown roles or out-of-range ratings are dropped or repaired when the workspace is read back.
- industry intelligence: every entry carrying a https source and text long enough to be a real summary, only role and skill names this app actually knows, dates that cannot be after the day the snapshot was read and never invented for a source that dates by month or shows no date, all seven promised areas being covered, no salary, hiring or open-role wording anywhere in the visible text, everything defaulting to just monitor it with no recorded direction, the saved choice beating the profile target beating the highest assessment score, a skill under 60 out of 100 pulling its entry forward while a skill at exactly 60 does not, a tested role landing at learn later, learn-now entries listed first, every dated entry landing in exactly one week with undated sources kept apart, and the month-and-no-date wordings being honest about what the source shows.
- interview content: the 42 questions naming only skills and roles this app actually has, unique ids and every helper in step with the list, each of the 6 areas holding enough questions to fill an interview, at least two role-specific questions for every one of the nine tracks, and the bank stating plainly that no company's real questions were used; posting reading that quotes the words it matched, separates required from preferred, reads the role out of the title instead of inventing one, refuses to turn a pay figure or a seniority word into a claim, says so when the text names nothing it knows, and will not match a phrase buried inside a longer unrelated word; the gap comparison labeling a skill from your own score rather than the posting's confidence, counting required and preferred apart, pointing at one next action, and treating finished project work as support; the application documents: the five claim strengths landing each of the 36 skills in exactly one bucket, a résumé skill needing finished work or a score at 70 or above and never your own rating of one answer, orphan evidence rows and a template with no stored project counting as nothing, every line carrying the records it was written from with verified ones marked as confirmed outside this app, the LinkedIn counts measured against the 220 and 2,600 this app assumes, the portfolio proof rule splitting checks into openable, link-missing and not-checkable-from-here, the plain-text renderer dropping bracketed instructions, cautions and provenance, the draft fingerprint recomputed from stored records with its drift list naming only what actually moved, and the preview store refusing short wording, a role that is not saved in this browser, and a second draft for the same document while keeping your wording when the role it pointed at is deleted.
- interview flow: a plan filled to the length asked from the chosen areas, a plan shorter than the app can run being refused, the bank saying out loud when it cannot fill the order, the least-practised questions coming first on a second pass, the chosen role's own questions being pulled in, a summary counting only questions that carry a rating, evidence written only for a finished interview and only for questions rated "I answered it", nothing written for a skill outside the catalogue, each skill counted once even when two questions need it, the three rating labels being honest about what they prove, and the study list built from a low score or a missed answer, capped so it stays a plan, and empty when no record shows a weakness.
- preview interview storage: an open interview writing no skill record, refusals for an area-less or wrongly-sized plan, the question wording and skills being copied at the moment of answering, a second rating for the same question being refused instead of overwriting, answers longer than the field being refused, finishing being blocked until every question is rated, one unverified record per distinct skill of the answered questions and none when every answer was partial or missed, a finished interview closing its answers to both edits and removals, removing an interview taking its answers and its own records with it, a saved posting storing the text and the skills read from it, the posting editor refusing a fragment but accepting a cleared field, and status changes refusing a missing date, a wrong date form, or a status the app does not record.

A headless-Chrome QA pass verified the Phase 4 preview flows end to end: starting a template, the out-of-order milestone block, submitting each milestone with its link, the repository-link gate before completion, the five unverified evidence rows created on completion and withdrawn on reopen, rubric gating and persistence, both Project Lab filters, and the Progress page in both its empty and populated states. A second pass verified the Phase 5 Career Explorer flows in preview mode: the nine roles listed at zero with no assessment, the experiment start button opening the reflection form, a result being refused until all four ratings and a work link are present, a saved reflection lifting the leader from 28 to 41 of 100, the confidence label changing from "No experiment tested" to "One experiment done", the specialization stage listing exactly what is still missing, saving a choice that disagrees with the ranking and getting the headline that names both roles and your written reason, clearing a result and watching the score fall back, and the study-time arrays staying at zero throughout because an experiment is not a session. A third pass checked Industry Intelligence in preview mode: the 22 entry cards rendering with their source link, publication date and read date, the week groups running newest first, a month-dated source and a no-date source each labelled for what their page actually shows, the area and label filters with their counts (4 learn now against 18 to just monitor it once a target role was on file), an empty filter combination producing the no-entries notice instead of an empty box, and — after temporarily removing the local profile and putting it back — every entry falling to just monitor it with the reason naming the record that is missing. A fourth pass checked Application Materials in preview mode: an empty workspace writing no line in any section and naming every gap instead of showing a blank, a seeded workspace writing 12 résumé lines with 8 cautions and 11 gaps while the same three skills appeared in all three documents, the five claim-strength counts adding to 36, each provenance list opening to the records it names, the copied text holding no bracket, caution or provenance line, saving wording and watching the stored count recompute to the records on file, the drift list naming eight counts that had moved against a draft saved before them, short wording blocking its own save button with the length it needed stated, the fill-from-generated button, then replacing and removing a draft, and deleting a saved role leaving the wording intact with its pointer cleared. That driver is not committed; there is no maintained browser E2E suite yet.

A fourth pass verified Interview Preparation in preview mode: a plan of 3 questions drawn from one area, finishing being refused while one answer was still unrated (the message naming it as 2 of the 3 questions), the finished interview then writing 4 unverified skill records for the 4 distinct skills carried by the answers rated "I answered it", both editing an answer and removing the interview being locked afterwards, a second interview answered entirely with "I did not answer it" writing no record at all and producing the practice list built from those misses, a saved posting reporting its pay and remote-work lines as ignored instead of turning them into skills, the gap report quoting the words it matched for each skill it found, the posting editor refusing a 78-character fragment against the 80-character minimum and then accepting a 219-character posting and re-reading its skills, and all of it — both interviews, the answers, the skill records, the saved posting — still there after a page reload. That pass found a real defect: `/progress` told a learner holding only those 4 interview records that nothing had been measured yet, because the flag deciding whether the page has anything to display did not look at skill records. `hasAnyData` in `src/components/progress/progress-analytics.tsx` now counts them, and the same screen re-read afterwards showed the interview lane at 4 records across 4 skills with none verified.

These QA passes use the app's own Browser tool, which is attached to no visible window, so screenshots and synthesized clicks are unreliable there and page content is read from the rendered document instead. Local-preview pages fill in their numbers a beat after the shell arrives, and reading one sooner than a second or two after navigating shows only the loading skeleton — which is what made an earlier round report that Settings, Dashboard, Projects and Progress never loaded. Waiting for that to settle, `/interview` and `/progress` were both read on screen this round; Settings, Dashboard and Projects were read in the code rather than on screen.

## Deployment

Any host that runs Next.js 16.4.3 on Node.js 20.9 or newer works; Vercel is the simplest target and the steps below are written in its terms. Supabase provides the database and authentication. This is a runbook, not a list of clicks — each step says what it prevents.

### What the build produces, and what that rules out

`npm run build` compiles with Turbopack and leaves every application route dynamic (`ƒ`) — 21 of the 22 routes, `/_not-found` being the prerendered exception — because the pages read the signed-in account through server components and the writes go through server actions. There is no static export: the target has to run a Node server that forwards cookies, so a plan that only serves files from a CDN cannot host this app. `src/proxy.ts` runs on every request that is not a static asset, refreshing the session and enforcing the route guards, and it calls `auth.getUser()` on the way — one Supabase auth round trip per uncached request. That is what makes a signed-out visitor and a stale cookie behave the same on every route, and it is also a real per-request cost to expect in the host's function timings.

The `turbopack.rules` entry in `next.config.ts` is how the Tailwind v4 loader reaches the compiler, and it applies to the production build as well as to `next dev` — it is not a development-only convenience, so leave it in place when trimming configuration.

### One Supabase project per environment, because `NEXT_PUBLIC_*` is baked in

`NEXT_PUBLIC_SUPABASE_URL` and the anon/publishable key are inlined into the bundle at build time, so a single build belongs to exactly one Supabase project. If preview deployments reuse the production values, a preview URL talks to the production database, shares its auth audience and its `sb-<project-ref>-auth-token*` cookies, and a test session on that URL is a session on real data. Either give previews their own development project or turn preview deploys off. Changing a `NEXT_PUBLIC_*` value means a new build, not a restart.

### Variables, and what each one does when it is absent

| Variable | Reaches the browser? | Required | Behaviour when absent |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | For accounts | The app runs in clearly labeled local preview mode; data lives in that browser only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | For accounts | As above. This key is public by design; authorization is enforced by row-level security, not by secrecy |
| `NEXT_PUBLIC_SITE_URL` | Yes | No | The fallback origin for confirmation links. `getSiteOrigin()` prefers the request's `x-forwarded-host` and `x-forwarded-proto` headers, which a normal host such as Vercel sets, and only reaches for this variable when no host header arrived — where it would otherwise build a `http://localhost:3000` link. Set it to the https origin so the fallback is never wrong |
| `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL` | **No — server-only** | No | AI Tutor and Prompt Studio run in demo mode and label every reply as demo |

A key without a model, an unsupported provider or an invalid base URL produces an explicit misconfiguration error and sends no request; nothing pretends to be live AI. **Never add a service-role key.** The application never reads one, and a key in any `NEXT_PUBLIC_*` variable is public by definition — if one is ever pasted there, rotate it in the Supabase dashboard and redeploy rather than waiting for a cache to clear.

### Supabase project settings

1. Apply the eight migration files in filename order, in the SQL editor or with the CLI. Afterwards run the counting query in "Connect Supabase" and expect **24 tables** and **90 policies**. Never edit a migration that has already been applied — add a new file.
2. Authentication → URL configuration: set Site URL to the exact origin, including `https://` and no trailing path, and add `https://<host>/auth/callback` to Additional Redirect URLs (plus `http://localhost:3000/auth/callback` on the development project). `/auth/callback` exchanges the PKCE code for a session and then redirects only to a path that passes `safeNextPath`, so an off-site `?next=` value falls back to onboarding instead of leaving the site.
3. Authentication → Sign In / Up: leave **Confirm emails** off on the project you develop against, for the reasons in "Email confirmation: the decision for local testing". Turn it on for any project that will hold another person's records, and configure SMTP if the mail should come from your own domain — Supabase's built-in sender is rate-limited and meant for development.
4. Confirm the `on_auth_user_created` trigger fired: after the first production sign-up there must be one `profiles` row. If there is none, the migrations went in out of order or only partway.

### On the hosting provider

1. Import the repository; the framework is detected as Next.js, with `npm run build` and `npm start`.
2. Select Node.js 22 or 24 for the runtime.
3. Add the variables above, separated by environment (Production, Preview, Development), and re-deploy after any change to a `NEXT_PUBLIC_*` value.
4. Deploy, then re-check the origin in Supabase's URL configuration against the live address character for character.
5. Add a custom domain to both the host and Supabase's Site URL and redirect list before inviting anyone, and re-run the checks below after the address changes.

### After deploying, before calling it live

- Run the 35-item verification checklist in "Verify a Supabase connection" against the production project with two accounts.
- `/sign-in`, `/sign-up`, `/account/close` and the closure result are the four screens preview mode redirects away, so their narrow-viewport pass happens here: measure them at 320 px and 390 px, as was done for the sixteen screens that do render locally.
- Open the deployed app on a phone once, so the drawer navigation is exercised on hardware and not only inside a simulated frame.
- Close a throwaway account end to end and confirm the result screen's instructions for the remaining `auth.users` row are accurate and work.
- Confirm `/settings/export` offers only the signed-in account's rows, that `ai_usage_events` rows appear after AI actions, and that the demo-versus-live labelling on `/tutor` matches the variables that were actually deployed.

### Updating a live deployment

Migrations are forward-only here, and a screen from a newer phase can reference a column an older schema does not have — so apply the new files in filename order **before** promoting the build that reads them. Keep the previous build available to roll back to; rolling back does not undo an applied migration, which is safe when the migration only adds a table, a column or a policy, and needs an explicit paired revert when it changes what an existing column means. The app logs a Supabase `error.code` or `error.name` and never a token, so anything resembling a session string in the provider's logs means a variable was misused rather than that this is normal.

Hosting and database providers change their plans, limits, and pricing. Check the current Supabase, Vercel, and AI provider pricing pages before choosing a plan. Demo mode remains fully functional without a paid AI provider.

## Privacy, limitations, and known gaps

- Preview data stays in one browser. It is not encrypted, synced, or protected by RLS, and it should not be used for sensitive personal information.
- Supabase authentication, Phase 2/3/4/5/6 writes, and RLS have **not** been executed against a live project here; the eight migrations have not been applied to the hosted project from this environment. They have been applied to a real PostgreSQL 18 server locally, with two accounts driven through 128 boundary assertions — see "Proving the security boundary locally" below. The hosted project still needs the verification checklist above before it is called verified, because a hosted Supabase project also brings the API gateway, the JWT claims and the platform roles this harness can only stand in for.
- Deleting learning data removes assessments, evidence, roadmaps/tasks, sessions, projects with their milestones, career experiments with their reflections and the recorded specialization choice, practice interviews with every written answer, saved roles with their pasted posting text, the application-material drafts with the wording you typed, tutor conversations/messages, saved prompts, and AI usage events — and keeps the profile and the sign-in, so the workspace can be rebuilt. "Close this account" in the same panel removes those same rows plus the profile row: 18 record sets keyed by your user id, and 5 child tables (assessment answers, project milestones, roadmap tasks, roadmap task prerequisites, tutor messages) that leave through their parent. What it cannot remove is the `auth.users` row — the email address and password hash live in Supabase's authentication service, and deleting that needs a service-role key this application deliberately never holds. The screen states this, shows the SQL with your own id already filled in, and points at Authentication → Users in the dashboard. Until you take that step the account can still sign in; because the profile row is gone, signing back in restarts onboarding rather than showing the old workspace. A test reads every migration file and fails if any table with a `user_id` column is left out of the closure list, or if any cascade child does not reach a parent that list really deletes, so the promise cannot rot when a later phase adds a table.
- The server export route covers profile, assessments with answers, roadmaps with task states, sessions, projects with milestones and links, skill evidence records, career experiments and your specialization choice with the reason you wrote, practice interviews with their planned questions and written answers, saved roles with the posting text you pasted, saved application-material drafts with the record counts they were written against, saved prompts, and tutor conversations. It excludes auth secrets, provider credentials, and usage counters. Closing an account deletes the rows this export can reach and then names the auth row it cannot.
- Assessment content and roadmap session plans are curated static material selected by rules. They are not adaptive AI tutoring, and completing a task is self-reported progress, not verified mastery.
- Project work is verified only by you. Milestone links are URLs you supply, the repository link is not checked, and every evidence row is stored with `verified = false`. The lesson and quiz evidence lanes exist and are labeled, but those features are not built yet, so their counts stay at zero.
- Prerequisite unlocking reads the latest assessment result, completed roadmap tasks, and completed projects. It cannot see work done outside this app, so an already-published portfolio project does not unlock anything until it is recorded here.
- Weeks 11–12 experiments and the week 13 checkpoint are structured tasks; they do not produce automatic career verdicts. No salary, hiring, or live-market data is invented.
- The Career Explorer ranks roles from your own answers, not from the job market. Nothing here was fetched from a job board: the entry bars, tool lists, and progression notes are written descriptions, and no salary, hiring statistic, or open role appears anywhere in it. An experiment result is self-reported; the link to your work is stored but never opened or checked, and a reflection moves a score by at most 15 points, so one good afternoon cannot outvote the assessment. Difficulty is recorded so you can see it, but it never changes a ranking, because a hard task is not automatically a bad choice. Completing one experiment does not make a role your specialization: the stage stays exploratory until the top-ranked role is tested, a second experiment is finished, and project work is complete.
- Industry Intelligence is a snapshot stored in the repository, dated by the day each source was read (2026-10-27). Nothing is fetched when the page loads, so a change announced after that day is simply absent, and a source page can be revised underneath an entry without this app knowing. Each entry's "what changed" line is the source's own statement and its "why it matters" line is this app's reading, labelled as such. Where a source showed only a month, or no date at all, the page says so instead of inventing a day. No salary, hiring statistic, or open role appears, because no employer survey or job board was readable while building it. The page also stores nothing: it cannot show which entries you have already read.
- Interview Preparation proves less than it might look like. You rate your own answers and nobody outside this app checks them, so the interview lane holds self-assessed records only, each stored with `verified = false`, and it can never raise an assessment score. A finished interview writes nothing until every question in it carries a rating, and a question you skipped is reported as skipped rather than guessed at. The 42 questions, their "what a good answer contains" points and their follow-ups are written content in this repository, checked by hand, not answers leaked from any employer — the screen says so under the bank. The posting reader is a phrase list, not a model: it can match "window function" to a skill but cannot tell you whether the role actually needs it, and the 80-character floor exists because anything shorter is a title, not a posting. Nothing is fetched from a job board, so a saved role is only as current as the day you typed it and this app cannot tell you whether the opening still exists. Starting or finishing an interview adds no study minutes, because it is not a logged session.
- Application Materials proves less than a finished document usually does. It reads only the rows this workspace holds, so an employer, award, certification or measurement that exists outside this app is simply absent, and each section names that absence instead of filling it. Nothing here opens a link: a repository or live URL stored on a project is reported as a link a reviewer could open, never as work somebody checked. The two LinkedIn ceilings this page counts against, 220 and 2,600 characters, are the numbers this app was told in October 2026, and no screen reads LinkedIn, so the live limit has to be checked before relying on the count. Only one draft is kept per document and saving replaces the earlier wording — the app warns before it overwrites and never deletes a draft on its own, but there is no version history to return to. A skill appearing here means your own record names it, not that anyone outside this app assessed you, and lines resting on a practice interview stay labelled practice.
- Live AI output is model-generated and can be wrong. The system prompt forbids invented mastery, experience, credentials, salaries, or live data, but the application cannot verify every claim. Treat live replies as guidance, not evidence.
- Quotas are enforced per user through application logic and event rows, not a database-level rate limiter. Concurrent requests could briefly exceed a window; the design is best-effort abuse protection, not a billing guarantee.
- Demo content is deterministic and intentionally generic. It demonstrates the flow and labeling, but it does not adapt to the learner's actual message the way a model would.
- No rate limiting beyond Supabase Auth and the AI quotas is implemented yet. Other write paths rely on session checks and RLS.
- Automated accessibility coverage is semantic structure, labels, focus behavior, horizontal-fit and tap-target measurement at 320/390/768 px in a simulated viewport, plus basic browser checks. A full WCAG audit, a screen-reader pass and a real-device test are still pending.

## Next phase

Phases 1 to 6 are complete and most of Phase 7 is: all twelve navigation destinations work in preview mode, the row-level-security boundary around them has been executed against a real PostgreSQL 18 server, and every screen that renders without an account fits a 320 px phone. The résumé, the LinkedIn guidance and the portfolio review are assembled from the rows already on the account, every line can be opened to the record it came from, a section your records do not reach says so and lists what is missing, and the wording you save is stored with a count of the records it was written against so the screen can tell you when they have moved. What is still missing is named here rather than hidden: every Supabase-side check in the list above, because the hosted project has no tables applied to it yet, and the lesson reader, the standalone quiz and the weekly review whose three tables the first migration creates, RLS-protects and now types — but which no screen writes to or reads from. Phase 7b went through the copy that depended on those missing features: a screen no longer says a remedial topic is "the exact lesson the roadmap starts with", the Progress backlog says plainly that the topic it names has no page to open, the landing page lists the lesson reader and the scored quiz as not built, and the daily loop is described as the task's own learn, exercise and check text rather than as lessons.

- **Interview Preparation is built.** 42 questions in 6 areas, plans you assemble, three self-ratings per answer, the unverified interview evidence lane it writes on finishing, the practice list drawn from your own low scores and missed answers, the posting reader and the skill-by-skill comparison against your records, and a 6-status role tracker that keeps an opening you found apart from a written example.
- **Application Materials is built.** Three documents from your own records on one shared claim-strength rule, each line showing the records behind it, the plain text for a résumé builder with the cautions stripped out, the same documents compared to a saved posting you choose, and one saved draft per document carrying the wording you typed.
- **Industry Intelligence** stays a manual snapshot: 22 entries, each with the source page it was read from, its publication date and the date read here (2026-10-27). Sources that could not be opened were dropped rather than paraphrased from memory, and the three things the plan promised that could not be sourced — salaries, hiring statistics, open roles — are listed on the page as deliberately absent. A new snapshot means re-reading the sources and re-running the tests that police their dates.
- **Account closure is built (Phase 7a).** One typed confirmation removes all 18 record sets the account owns and the 5 child tables that cascade from them, a migration-derived test fails the build if a later phase adds a `user_id` table and leaves it out of the list, and the result screen names the one row this app cannot delete — the `auth.users` sign-in — with its own SQL and dashboard path, because the key that could remove it is one this project deliberately never holds.
- **Failure-state coverage and honest copy are built (Phase 7b).** `src/lib/workspace/deletion.ts` holds the table-by-table loop and every sentence the two destructive workflows say, so the phrase a screen shows and the phrase the server demands cannot drift apart; 10 tests drive the loop with a fake delete and prove it stops at the first failing table, names it, and never promises a profile it did not keep. `src/lib/ai/provider.test.ts` adds 19 more, driving each transport failure — 429, a rejected credential, 5xx with and without a successful retry, a hang, an unreachable host, a non-JSON body, six unusable payloads — and pinning the request it sends. The copy that leaned on unbuilt features now says what exists: a remedial topic is a topic this app names, not a lesson the roadmap starts with, the Progress backlog states there is no page to open, and the landing page lists the lesson reader and the scored quiz as not built.
- **Narrow-viewport checks are done (Phase 7c).** Sixteen screens were measured at 320 px, 390 px and 768 px wide — `/`, `/dashboard`, `/assessment`, `/assessment/results/[id]`, `/roadmap`, `/roadmap/new`, `/tutor`, `/prompts`, `/projects`, `/careers`, `/intelligence`, `/interview`, `/materials`, `/progress`, `/settings` and `/onboarding` — and each now reports a horizontal scroll width equal to its viewport width, so nothing needs sideways scrolling on a phone. Six real defects were found and fixed: the tutor's conversation list and its two selects forced the card to 507 px because a `truncate` span and a native `<select>` sit inside grid items whose minimum width defaults to their content, so those items now declare `min-w-0` and the grid columns `minmax(0,1fr)`; the Application Materials "Put the text this app generated into this box" button could not wrap because the shared button style sets `whitespace-nowrap`, so it now wraps inside a fixed-width box; the Career Explorer's action column and the interview question bank's rating row were `shrink-0`, which refuses to give way when a nowrap button no longer fits, so both now shrink; two long button-styled links on Industry Intelligence wrap instead of overflowing; and the onboarding header now wraps its badge and link rather than pushing past the viewport. Tap targets were measured in the same pass: no control on any of those screens is smaller than 24×24 CSS pixels except links set inside a sentence (`/intelligence` source lines, the preview-mode banners) and the checkboxes in the profile form, which sit inside a full-row `<label>` that toggles them — both are the exceptions WCAG 2.5.8 states for inline and label-provided targets, and the mobile menu's open button, close button and all 15 drawer links clear 24 px outright. The mobile drawer itself was driven end to end at 390 px: it opens as a native `<dialog>`, locks body scroll, marks the current page with `aria-current`, closes on its own button and releases the scroll lock, and a link inside it navigates to the right screen.
  Two honesty notes about that method. The widths were simulated with same-origin iframes because the automation harness has no viewport-resize capability, so media queries, layout and hit areas are measured as a phone would render them but no physical device was used. And the browser's own Escape key on a modal dialog could not be exercised — a synthetic key event does not reach a dialog inside a simulated frame — so the close path was verified through the drawer's own close button, which runs the same `onClose` handler Escape would.
- **Deployment is documented (Phase 7d, documentation half).** The section above is a runbook rather than a list of clicks: what the build produces and which hosts it therefore rules out, why one build belongs to one Supabase project, what every variable does when it is missing, the four project settings that have to match the deployed origin, what to check before inviting anyone, and how to apply and roll back migrations on a live schema.
- **Next: the last part of Phase 7** — the two-account verification run against a live Supabase project, which is the one thing no local harness can stand in for. Four screens still need their narrow-viewport pass because preview mode redirects them away and they can only render once Supabase is configured: `/sign-in`, `/sign-up`, `/account/close` and the closure result.
- Before any of this is called production-ready: apply the eight migrations to a live Supabase project, run the verification checklist with two accounts to confirm one account cannot read another's rows, exercise the AI quotas against a real provider, and re-check the Project Lab, Progress, Career Explorer, Industry Intelligence, Interview Preparation and Application Materials screens in Supabase mode, where the records that drive the labels come from the database instead of this browser.
