import {
  ArrowRight,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  ChartColumn,
  Check,
  CirclePlay,
  ClipboardCheck,
  Compass,
  Database,
  FileText,
  FolderKanban,
  GitBranch,
  Lock,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { CAREER_TRACKS } from "@/lib/career/tracks";
import { INTERVIEW_QUESTIONS } from "@/lib/interview/questions";
import { INTERVIEW_TOPIC_ORDER } from "@/lib/interview/types";
import {
  BLUEPRINT_TOTAL_HOURS,
  BLUEPRINT_TOTAL_WEEKS,
  NINETY_DAY_BLUEPRINT,
} from "@/lib/roadmap/blueprint";
import { SKILLS } from "@/lib/skills/catalog";
import {
  ACCOUNT_DATA_TABLES,
  CASCADE_ONLY_TABLES,
} from "@/lib/workspace/tables";

export const metadata: Metadata = {
  title: "CareerForge AI — Learn deliberately, choose with evidence",
};

const liveFeatures = [
  {
    icon: Lock,
    title: "Private accounts and profiles",
    body: "Supabase Auth sessions, profile ownership, and row-level security policies for every user record.",
    note: "Requires Supabase environment variables",
  },
  {
    icon: ClipboardCheck,
    title: "Adaptive skills assessment",
    body: "Thirteen adaptive probes across Python, SQL, statistics, and software foundations, scored separately from confidence.",
    note: "No degree-based assumptions",
  },
  {
    icon: CalendarDays,
    title: "A personalized 13-week roadmap",
    body: "Forty-one ordered tasks sized to your hours, with explicit prerequisites and two career experiments to test.",
    note: "Generated from evidence, not guesswork",
  },
  {
    icon: Sparkles,
    title: "An editable starting profile",
    body: "Education, self-reported levels, availability, learning preferences, tools, goals, and constraints — all editable.",
    note: "Works in preview mode too",
  },
  {
    icon: CirclePlay,
    title: "Daily dashboard and sessions",
    body: "Today's objective with each task's own learn, exercise and revision text, plus rescheduling. A knowledge check reveals its answer rather than scoring you, and study time is recorded only once a session is finished.",
    note: "No fabricated activity",
  },
  {
    icon: Bot,
    title: "AI Tutor and Prompt Studio",
    body: "Eleven teaching modes and sixteen prompt categories that carry your real context, with saved history and reusable templates.",
    note: "Live AI or clearly labeled demo mode",
  },
  {
    icon: FolderKanban,
    title: "Project Lab with milestones",
    body: "Portfolio projects broken into ordered steps. A step only becomes a skill record once you link the work you produced for it, and advanced projects stay locked until their prerequisites have evidence.",
    note: "No credit for unfinished work",
  },
  {
    icon: ChartColumn,
    title: "Progress analytics in separate lanes",
    body: "Assessment scores, project work and interview practice are counted separately, so a rating you gave yourself never turns into a demonstrated score.",
    note: "Study time only from sessions you started",
  },
  {
    icon: Compass,
    title: `Career Explorer across ${CAREER_TRACKS.length} roles`,
    body: "Adjacent data and AI roles ranked from your own answers, each with a short experiment you can finish and a reflection you write afterwards. Your recorded choice stays visible even when it disagrees with the ranking.",
    note: "A score is a hypothesis until the work is linked",
  },
  {
    icon: Radar,
    title: "Industry Intelligence with sources",
    body: "Named developments with the page that says so and its date, checked by hand. Where nothing has been verified, the screen says that instead of inventing a figure.",
    note: "No invented news, hiring counts or salaries",
  },
  {
    icon: BriefcaseBusiness,
    title: "Interview Preparation",
    body: `${INTERVIEW_QUESTIONS.length} practice questions across ${INTERVIEW_TOPIC_ORDER.length} areas that you rate yourself, and a job posting you paste is read against the ${SKILLS.length} skills this app scores and the records on your own account.`,
    note: "Interview results stay labeled as self-rated",
  },
  {
    icon: FileText,
    title: "Application materials from your own records",
    body: "A résumé, LinkedIn guidance and a portfolio review assembled only from what this workspace already holds. Every line names the record it came from, and a section your records do not reach says so instead of being filled.",
    note: "Nothing here that this app did not see",
  },
  {
    icon: Route,
    title: "A real workspace foundation",
    body: "Responsive navigation, accessible components, loading and empty states, and honest phase labels on unfinished areas.",
    note: "No fake dashboards",
  },
  {
    icon: ShieldCheck,
    title: "Deletion that is proven, not promised",
    body: "Clearing your learning data and closing the whole account are separate workflows behind a confirmation phrase, and a test reads every migration to fail the build if a table that carries your user id is missing from the delete list. The same policies are exercised by a two-account security probe run against a real Postgres server.",
    note: `Closes ${ACCOUNT_DATA_TABLES.length} record sets plus ${CASCADE_ONLY_TABLES.length} child tables`,
  },
];

const nextPhases = [
  {
    phase: 8,
    title: "Lesson reader and scored quizzes",
    body: "Each roadmap task carries its own learn, exercise and check text, but there is no lesson page to read and no standalone quiz that records a score. The tables, row-level security policies and export paths for both already exist; the content and the screens that would write to them do not, so nothing here claims a topic has been taught or tested.",
  },
];

export default async function HomePage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && viewer.user) {
    redirect("/dashboard");
  }

  const previewMode = viewer.mode === "preview";
  const primaryHref = previewMode ? "/dashboard" : "/sign-up";
  const primaryLabel = previewMode ? "Open preview workspace" : "Create your account";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="grid-backdrop pointer-events-none absolute inset-x-0 top-0 h-[42rem] opacity-70"
      />

      {previewMode ? (
        <div className="relative border-b border-warning/20 bg-warning/8 px-4 py-2 text-center text-xs leading-5 text-[#f3d9a5]">
          <span className="inline-flex flex-wrap items-center justify-center gap-2">
            <TriangleAlert
              aria-hidden="true"
              className="size-3.5 text-warning"
            />
            Supabase is not configured, so the app is in local preview mode.
            <Link
              href="/settings#environment"
              className="font-semibold text-warning underline-offset-4 hover:underline"
            >
              Review setup steps
            </Link>
          </span>
        </div>
      ) : null}

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Logo href="/" />
        <nav
          aria-label="Landing navigation"
          className="hidden items-center gap-6 text-sm text-muted md:flex"
        >
          <a href="#blueprint" className="hover:text-foreground">
            90-day blueprint
          </a>
          <a href="#build-status" className="hover:text-foreground">
            Build status
          </a>
          <a href="#tracks" className="hover:text-foreground">
            Career tracks
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            Sign in
          </Link>
          <Link
            href={primaryHref}
            className={buttonStyles({ size: "sm", className: "hidden sm:inline-flex" })}
          >
            {previewMode ? "Preview" : "Get started"}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:pt-16">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Phase 7 security verified</Badge>
              <Badge variant="outline">Built for one real learner</Badge>
            </div>

            <div className="space-y-5">
              <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Learn deliberately.
                <br />
                <span className="text-gradient">Choose your direction with evidence.</span>
              </h1>
              <p className="max-w-xl text-pretty text-base leading-7 text-muted sm:text-lg sm:leading-8">
                CareerForge AI is a personal data science and future-tech career
                workspace. It starts with your real starting point — not your
                degree title — then builds toward internships with a flexible
                plan, honest assessments, and portfolio evidence.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href={primaryHref} className={buttonStyles({ size: "lg" })}>
                {primaryLabel}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="#blueprint"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                See the 90-day plan
              </Link>
            </div>

            <dl className="grid max-w-lg grid-cols-3 gap-4 border-t border-border/70 pt-6">
              <div>
                <dt className="text-xs text-muted">Plan length</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {BLUEPRINT_TOTAL_WEEKS} weeks
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Weekly time</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  10 hours
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Career paths</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {CAREER_TRACKS.length} to test
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl"
            />
            <div className="panel-highlight relative overflow-hidden rounded-3xl border border-border bg-surface/85 p-5 shadow-2xl backdrop-blur sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Reference route
                  </p>
                  <h2 className="mt-1.5 text-lg font-semibold text-foreground">
                    {BLUEPRINT_TOTAL_HOURS} hours across 13 weeks
                  </h2>
                </div>
                <Badge variant="outline">Reference curriculum</Badge>
              </div>

              <ol className="mt-4 space-y-1">
                {NINETY_DAY_BLUEPRINT.slice(0, 5).map((phase, index) => (
                  <li
                    key={phase.weeks}
                    className="flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-raised/60"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-background/60 text-xs font-semibold text-muted-strong">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <p className="text-sm font-medium text-foreground">
                          {phase.title}
                        </p>
                        <span className="text-[0.6875rem] text-muted">
                          {phase.weeks}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                        {phase.topics.slice(0, 3).join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-4 rounded-xl border border-border bg-background/50 p-3.5 text-xs leading-5 text-muted">
                <p className="flex items-start gap-2">
                  <GitBranch
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-primary"
                  />
                  Your assessment builds a personalized version of this
                  blueprint. This reference curriculum is not itself a generated
                  plan.
                </p>
              </div>
            </div>

            <div className="relative mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs text-muted-strong">
                <ShieldCheck aria-hidden="true" className="size-3.5 text-success" />
                Self-reported ≠ verified
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs text-muted-strong">
                <Database aria-hidden="true" className="size-3.5 text-primary" />
                Postgres + RLS
              </span>
            </div>
          </div>
        </section>

        <section className="relative border-y border-border/60 bg-surface/25">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa7c7]">
                The operating principle
              </p>
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Your degree is context. Evidence is the signal.
              </h2>
              <p className="text-sm leading-7 text-muted">
                A Data Science programme proves exposure, not mastery. This
                workspace keeps self-reported confidence, exercise performance,
                project evidence, and interview performance in separate lanes so
                your plan responds to what you can actually do.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Compass,
                  title: "Explore first",
                  body: "Nine adjacent roles, tested with small experiments.",
                },
                {
                  icon: BrainCircuit,
                  title: "Teach the why",
                  body: "Explanations and debugging feedback, not answer dumps.",
                },
                {
                  icon: Database,
                  title: "Build real evidence",
                  body: "Projects and milestones that survive interview scrutiny.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border bg-background/40 p-5"
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-5 text-[#b8c3ff]"
                    />
                    <p className="mt-4 text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-muted">
                      {item.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6" id="build-status">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa7c7]">
                Build status
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                What is real today
              </h2>
              <p className="text-sm leading-6 text-muted">
                Unfinished areas are labeled as planned. No screen is filled with
                invented progress or simulated AI output.
              </p>
            </div>
            <Badge variant="success">Phases 1 to 7 implemented</Badge>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {liveFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-surface/60 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-[#c7d0ff]">
                      <Icon aria-hidden="true" className="size-4.5" />
                    </span>
                    <Check
                      aria-label="Implemented"
                      className="size-4 text-success"
                    />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {feature.body}
                  </p>
                  <p className="mt-4 border-t border-border/70 pt-3 text-[0.6875rem] text-muted">
                    {feature.note}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 grid gap-3">
            {nextPhases.map((item) => (
              <div
                key={item.phase}
                className="rounded-xl border border-border/80 bg-background/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Phase {item.phase} — not built yet
                  </span>
                  <span className="size-1.5 rounded-full bg-border-strong" />
                </div>
                <p className="mt-2 text-sm font-medium text-muted-strong">
                  {item.title}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="blueprint"
          className="border-y border-border/60 bg-surface/25"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa7c7]">
                The starting curriculum
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                A practical 13-week foundation
              </h2>
              <p className="text-sm leading-6 text-muted">
                Python, data handling, SQL, statistics, introductory machine
                learning, two career experiments, and a checkpoint. Every segment
                ends with a deliverable you can show.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {NINETY_DAY_BLUEPRINT.map((phase) => (
                <article
                  key={phase.weeks}
                  className="rounded-2xl border border-border bg-background/40 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">{phase.weeks}</Badge>
                    <span className="text-[0.6875rem] text-muted">
                      {phase.topics.length} topics
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {phase.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-muted">
                    {phase.summary}
                  </p>
                  <p className="mt-3 flex gap-2 border-t border-border/70 pt-3 text-xs leading-5 text-muted-strong">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-success"
                    />
                    {phase.deliverable}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6" id="tracks">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa7c7]">
                Career exploration
              </p>
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Nine directions, one exploratory first step
              </h2>
              <p className="text-sm leading-7 text-muted">
                Data Science is a specialization, not a career decision. The plan
                keeps your direction exploratory until assessment results and
                project evidence justify a recommendation — and you can always
                override it.
              </p>
              <Link
                href={primaryHref}
                className={buttonStyles({ variant: "secondary", className: "mt-2" })}
              >
                Start with the assessment
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {CAREER_TRACKS.map((track) => (
                <span
                  key={track.slug}
                  className="rounded-xl border border-border bg-surface/60 px-3.5 py-2 text-xs text-muted-strong transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {track.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="relative border-t border-border/60">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Build the profile. Then earn the evidence.
              </h2>
              <p className="text-sm leading-6 text-muted">
                Every area above works today: a real account, a private editable
                profile, an adaptive assessment, a personalized 13-week roadmap, a
                daily learning loop that records only real sessions, an AI Tutor
                and Prompt Studio that are honest about demo mode, a project lab
                that credits only linked work, and career, industry and interview
                screens that say where their information comes from. What it does
                not have is a lesson reader or a scored quiz — each roadmap task
                carries its own session text instead, and that gap is listed
                under Build status rather than papered over.
              </p>
            </div>
            <Link href={primaryHref} className={buttonStyles({ size: "lg" })}>
              {primaryLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border/60 bg-background/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/" compact />
            <span>CareerForge AI</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.625rem] uppercase tracking-wider">
              Phase 7
            </span>
          </div>
          <p>
            Next.js · TypeScript · Tailwind CSS · Supabase · Built to be verified,
            not assumed.
          </p>
        </div>
      </footer>
    </div>
  );
}
