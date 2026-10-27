import {
  BrainCircuit,
  Check,
  Compass,
  Database,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

const principles: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Compass,
    title: "Explore before committing",
    body: "Test nine data and AI career paths with small experiments instead of guessing.",
  },
  {
    icon: BrainCircuit,
    title: "Evidence over assumptions",
    body: "Self-reported confidence is tracked separately from demonstrated skill.",
  },
  {
    icon: Database,
    title: "Your data stays yours",
    body: "Private records are protected with database row-level security.",
  },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="grid-backdrop pointer-events-none absolute inset-0 opacity-60"
      />
      <div className="relative mx-auto grid min-h-dvh w-full max-w-[76rem] lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden flex-col justify-between gap-12 px-10 py-12 lg:flex xl:px-14">
          <Logo href="/" />

          <div className="max-w-lg space-y-8">
            <div className="space-y-4">
              <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-gradient">
                Find the technical direction that fits the evidence, not the
                label on your degree.
              </h2>
              <p className="text-sm leading-7 text-muted">
                CareerForge AI is a personal learning and career workspace for
                data science and future-tech roles. It starts with your real
                starting point and builds outward from there.
              </p>
            </div>

            <ul className="space-y-5">
              {principles.map((principle) => {
                const Icon = principle.icon;
                return (
                  <li key={principle.title} className="flex gap-3.5">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-raised text-[#b8c3ff]">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {principle.title}
                      </p>
                      <p className="text-xs leading-5 text-muted">
                        {principle.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <Check aria-hidden="true" className="size-3.5 text-success" />
            Built in reviewable phases — no fake dashboards, no invented
            experience.
          </div>
        </section>

        <section className="flex min-h-dvh flex-col justify-center px-4 py-10 sm:px-8 lg:border-l lg:border-border/60 lg:bg-surface/25 lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Logo href="/" />
              <Link
                href="/"
                className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                Back home
              </Link>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa7c7]">
                {eyebrow}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="text-sm leading-6 text-muted">{description}</p>
            </div>

            <div className="mt-8">{children}</div>
            {footer ? (
              <div className="mt-6 text-sm text-muted">{footer}</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
