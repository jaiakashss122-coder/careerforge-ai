import {
  Check,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/profile/profile-form";
import { AccountSummary } from "@/components/settings/account-summary";
import { ProfileDataControls } from "@/components/settings/profile-data";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { signOutAction } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/viewer";
import { getAiPublicStatus } from "@/lib/ai/config";
import { getCurrentProfile } from "@/lib/profile/repository";

export const metadata: Metadata = {
  title: "Settings",
};

const setupSteps = [
  {
    title: "Create a Supabase project",
    body: "The free tier is enough for Phase 1. Copy the Project URL and the anon (or publishable) key from the project's API settings.",
  },
  {
    title: "Apply the three migration files",
    body: "Run 20261023000100_initial_schema.sql, then 20261023000200_seed_skills.sql, then 20261024000100_phase3_ai.sql in the SQL editor or with the Supabase CLI. They create the schema, RLS policies, triggers, skill catalogue, and AI provenance/usage tables.",
  },
  {
    title: "Set the environment variables",
    body: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local. The anon key is public and safe for the browser; a service-role key is never required or used.",
  },
  {
    title: "Configure authentication redirects",
    body: "In Authentication → URL Configuration, set the Site URL to http://localhost:3000 for local development and add http://localhost:3000/auth/callback plus your production /auth/callback URL.",
  },
  {
    title: "Restart and create your account",
    body: "Restart the dev server, sign up, confirm your email, and finish onboarding. Row-level security scopes every profile read and write to your account.",
  },
];

export default async function SettingsPage() {
  const viewer = await getViewer();
  const profile = await getCurrentProfile();
  const previewMode = viewer.mode === "preview";
  const aiStatus = getAiPublicStatus();
  const email =
    viewer.mode === "supabase"
      ? (viewer.user?.email ?? "Signed in")
      : "Local preview profile";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Control your starting profile, export or delete learning data, and see exactly how accounts, records, and row-level security are configured."
        actions={
          <>
            <Badge variant="accent">Account and data controls</Badge>
            <Link
              href="/dashboard"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Back to dashboard
            </Link>
          </>
        }
      />

      <nav
        aria-label="Settings sections"
        className="flex flex-wrap items-center gap-2 text-xs"
      >
        {[
          { href: "#environment", label: "Environment" },
          { href: "#ai", label: "AI provider" },
          { href: "#data-privacy", label: "Account & data" },
          { href: "#profile", label: "Profile" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-muted-strong transition-colors hover:border-border-strong hover:text-foreground"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="scroll-mt-24" id="environment">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Environment and setup</CardTitle>
              <Badge variant={previewMode ? "warning" : "success"}>
                {previewMode ? "Preview mode" : "Supabase connected"}
              </Badge>
            </div>
            <CardDescription>
              {previewMode
                ? "No Supabase credentials were found. The workspace is usable for the profile, assessment, roadmap, session tracking, project work, progress analytics, and demo AI features, but accounts and server persistence are disabled."
                : "Supabase environment variables are present. Authentication and row-level security now govern every private record, including assessments, roadmaps, sessions, projects with their milestones, skill evidence, tutor conversations, and saved prompts."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewMode ? (
              <>
                <Alert variant="warning" title="What preview mode really means">
                  Your profile, assessment results, roadmaps, tasks, study
                  sessions, projects with their milestones and links, the skill
                  evidence they created, tutor conversations, and saved prompts
                  are stored in this browser&apos;s localStorage only. There is
                  no account, no cloud backup, and no database row. AI replies
                  are clearly labeled demo output, not live model output.
                </Alert>

                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    <KeyRound
                      aria-hidden="true"
                      className="size-3.5 text-primary"
                    />
                    To enable accounts
                  </p>
                  <ol className="mt-4 space-y-4">
                    {setupSteps.map((step, index) => (
                      <li key={step.title} className="flex gap-3">
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-[0.6875rem] font-semibold text-muted-strong">
                          {index + 1}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {step.title}
                          </p>
                          <p className="text-xs leading-5 text-muted">
                            {step.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="flex items-start gap-2 text-xs leading-5 text-muted">
                  <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-warning"
                  />
                  Variables are read at build or server start. Restart the dev
                  server after changing .env.local. If only one variable is set,
                  the app stops with an explicit configuration error instead of
                  silently falling back to preview mode.
                </p>
              </>
            ) : (
              <>
                <Alert variant="success" title="Connected to Supabase">
                  Accounts, email confirmation, cookie-based sessions, and
                  row-level security are active. If profile or AI saves fail,
                  confirm all three migration files have run against this
                  project.
                </Alert>

                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Browser code receives only the public project URL and anon key.",
                    "Every profile read and write is scoped to the signed-in user by RLS.",
                    "Server actions independently re-check the session before saving.",
                    "No service-role credential is used anywhere in this application.",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 rounded-xl border border-border bg-background/40 p-3 text-xs leading-5 text-muted-strong"
                    >
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-success"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Variables in use
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <code className="rounded-md border border-border bg-surface-raised px-2 py-1 font-mono text-[0.6875rem] text-muted-strong">
                      NEXT_PUBLIC_SUPABASE_URL
                    </code>
                    <code className="rounded-md border border-border bg-surface-raised px-2 py-1 font-mono text-[0.6875rem] text-muted-strong">
                      NEXT_PUBLIC_SUPABASE_ANON_KEY
                    </code>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted">
                    Secret and service-role keys must never be exposed to the
                    browser. AI provider credentials are server-only; when no
                    AI_API_KEY is set, the tutor and Prompt Studio run in clearly
                    labeled demo mode.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="scroll-mt-24" id="data-privacy">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Account and data</CardTitle>
              <Badge variant={previewMode ? "warning" : "success"}>
                {previewMode ? "Local only" : "Private account"}
              </Badge>
            </div>
            <CardDescription>
              {previewMode
                ? "A local profile belongs to this browser, not to an account."
                : "Your records are tied to your Supabase user ID and protected by RLS."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AccountSummary
              mode={viewer.mode}
              initialProfile={profile}
              email={email}
            />

            <div className="space-y-3 border-t border-border/70 pt-4">
              <p className="text-sm font-medium text-foreground">
                Export or delete your data
              </p>
              <ProfileDataControls
                mode={viewer.mode}
                initialProfile={profile}
              />
            </div>

            <div className="space-y-2 border-t border-border/70 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Delete account
                </p>
                <Badge variant="muted">Planned — Phase 6</Badge>
              </div>
              <p className="text-xs leading-5 text-muted">
                Full account deletion is not available yet, so no non-working
                button is shown. Deleting learning data above is available now
                and keeps the profile and sign-in intact.
              </p>
            </div>

            <div className="border-t border-border/70 pt-4">
              {viewer.mode === "supabase" ? (
                <form action={signOutAction}>
                  <Button type="submit" variant="outline" size="sm">
                    <LogOut aria-hidden="true" className="size-4" />
                    Sign out
                  </Button>
                </form>
              ) : (
                <p className="flex items-start gap-2 text-xs leading-5 text-muted">
                  <Lock
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-muted"
                  />
                  Signing out and account deletion require Supabase. Preview mode
                  has no session to end.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <section id="ai" className="scroll-mt-24">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>AI provider and demo mode</CardTitle>
              <Badge
                variant={
                  aiStatus.mode === "live"
                    ? "success"
                    : aiStatus.mode === "misconfigured"
                      ? "danger"
                      : "warning"
                }
              >
                {aiStatus.mode === "live"
                  ? "Live AI"
                  : aiStatus.mode === "misconfigured"
                    ? "Misconfigured"
                    : "Demo mode"}
              </Badge>
            </div>
            <CardDescription>
              {previewMode
                ? "Preview mode always uses curated demo responses and templates, even if a server AI key exists. Live AI requires a signed-in Supabase account so usage and conversations can be authorized per user."
                : aiStatus.detail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Server-only credentials",
                  body: "AI_API_KEY is read only on the server. The browser receives a runtime status, never a key or provider URL.",
                },
                {
                  title: "Usage limits",
                  body: "10 AI requests per 10 minutes and 60 per day. Supabase mode records them in ai_usage_events; preview mode counts locally.",
                },
                {
                  title: "Validated output",
                  body: "Prompt generation is parsed as JSON with Zod. Model output is rendered as text and cannot run code or change database permissions.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-background/40 p-3.5"
                >
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                AI variables (server-only)
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "AI_PROVIDER",
                  "AI_MODEL",
                  "AI_API_KEY",
                  "AI_BASE_URL (optional)",
                ].map((name) => (
                  <code
                    key={name}
                    className="rounded-md border border-border bg-surface-raised px-2 py-1 font-mono text-[0.6875rem] text-muted-strong"
                  >
                    {name}
                  </code>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                Leave AI_API_KEY unset to run demo mode. If a key is set without
                a model or with an unsupported provider, the app reports a
                configuration error instead of pretending live AI works.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="profile" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Your profile
            </h2>
            <p className="text-sm leading-6 text-muted">
              Every field can be corrected at any time. Self-reported levels shape
              starting difficulty; they are not treated as verified skill
              evidence.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck
              aria-hidden="true"
              className="size-3.5 text-success"
            />
            {previewMode
              ? "Saved in this browser only"
              : "Protected by row-level security"}
          </span>
        </div>

        <ProfileForm
          mode={viewer.mode}
          initialProfile={profile}
          variant="settings"
        />
      </section>
    </div>
  );
}
