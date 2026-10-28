import { ArrowLeft, Lock, LogOut, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { ProfileForm } from "@/components/profile/profile-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/viewer";
import { createUnsavedProfile } from "@/lib/profile/defaults";
import { getCurrentProfile } from "@/lib/profile/repository";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Set up your profile",
};

const steps = [
  { label: "Profile", state: "current" as const },
  { label: "Assessment", state: "next" as const },
  { label: "Roadmap", state: "next" as const },
];

export default async function OnboardingPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  const profile = await getCurrentProfile();

  if (viewer.mode === "supabase" && profile?.onboardingCompleted) {
    redirect("/dashboard");
  }

  const fullName =
    viewer.mode === "supabase" &&
    typeof viewer.user?.user_metadata?.full_name === "string"
      ? viewer.user.user_metadata.full_name
      : "";

  const initialProfile =
    profile ??
    (viewer.mode === "supabase" && viewer.user
      ? createUnsavedProfile({
          id: viewer.user.id,
          email: viewer.user.email ?? "",
          fullName,
        })
      : null);

  return (
    <div className="relative min-h-dvh">
      <div
        aria-hidden="true"
        className="grid-backdrop pointer-events-none absolute inset-x-0 top-0 h-96 opacity-50"
      />

      <header className="relative mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-5 sm:px-6">
        <Logo href={viewer.mode === "preview" ? "/" : "/dashboard"} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={viewer.mode === "preview" ? "warning" : "success"}>
            {viewer.mode === "preview" ? "Preview mode" : "Private account"}
          </Badge>
          {viewer.mode === "supabase" ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
              >
                <LogOut aria-hidden="true" className="size-3.5" />
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Dashboard
            </Link>
          )}
        </div>
      </header>

      <main
        id="main-content"
        className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10"
      >
        <div className="space-y-7">
          <div className="space-y-5">
            <ol className="flex flex-wrap items-center gap-2 text-xs">
              {steps.map((step, index) => (
                <li key={step.label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
                      step.state === "current"
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-border bg-surface/50 text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 place-items-center rounded-full text-[0.625rem] font-semibold",
                        step.state === "current"
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-raised text-muted",
                      )}
                    >
                      {index + 1}
                    </span>
                    {step.label}
                  </span>
                  {index < steps.length - 1 ? (
                    <span aria-hidden="true" className="h-px w-4 bg-border" />
                  ) : null}
                </li>
              ))}
            </ol>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa7c7]">
                Starting profile
              </p>
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Give the plan an honest starting point
              </h1>
              <p className="max-w-2xl text-pretty text-sm leading-6 text-muted">
                These defaults mirror your stated background: second-year B.Tech
                CSE (Data Science), 10 hours per week, VS Code with an AI coding
                agent, and an undecided career direction. Confirm or correct
                anything before continuing.
              </p>
            </div>

            <Alert variant="info" title="Confidence is not evidence">
              Level fields are self-reported. They help choose an appropriate
              starting difficulty, but they are never counted as proof of mastery
              or shown as verified progress.
            </Alert>

            {viewer.mode === "preview" ? (
              <Alert variant="warning" title="Local preview mode">
                Supabase is not configured, so this profile is stored in this
                browser only. Accounts, cross-device sync, and database row-level
                security activate after setup.
              </Alert>
            ) : null}
          </div>

          <ProfileForm
            mode={viewer.mode}
            initialProfile={initialProfile}
            variant="onboarding"
          />

          <div className="flex items-start gap-2.5 text-xs leading-5 text-muted">
            <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Next after this form: the adaptive assessment. It measures
              demonstrated knowledge separately from the confidence you select
              here, then generates your first 30-day plan and 13-week roadmap.
            </p>
            <Sparkles
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 text-primary"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
