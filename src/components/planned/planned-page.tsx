import { ArrowRight, Check, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buttonStyles } from "@/components/ui/button";

export function PlannedPage({
  title,
  eyebrow,
  phase,
  icon: Icon,
  summary,
  features,
}: {
  title: string;
  eyebrow: string;
  phase: number;
  icon: LucideIcon;
  summary: string;
  features: string[];
}) {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={summary}
        actions={
          <Badge variant="warning">
            <Lock aria-hidden="true" className="size-3.5" />
            Planned for Phase {phase}
          </Badge>
        }
      />

      <Card className="panel-highlight">
        <CardHeader className="flex-row items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-[#c7d0ff]">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="space-y-1.5">
            <CardTitle>Why this page is not live yet</CardTitle>
            <CardDescription>
              CareerForge AI is being built in reviewable phases. This page is
              explicitly a planned feature, not a working screen dressed up with
              placeholder data. Phase 3 delivered the AI Tutor and Prompt
              Studio; later phases add projects, progress analytics, and career
              preparation.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Agreed scope for Phase {phase}
            </p>
            <ul className="mt-3 space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-sm text-muted-strong">
                  <Check
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-primary"
                  />
                  <span className="leading-6">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className={buttonStyles({ variant: "secondary" })}>
          Back to dashboard
        </Link>
        <Link href="/roadmap" className={buttonStyles({ variant: "ghost" })}>
          Open your roadmap
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );
}
