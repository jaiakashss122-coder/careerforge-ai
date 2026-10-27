"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Compass,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import {
  getConfidenceLabel,
  getDemonstratedLevelLabel,
  getSectionLabel,
} from "@/lib/assessment/engine";
import type {
  AssessmentRecord,
  DemonstratedLevel,
} from "@/lib/assessment/types";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import { getActiveRoadmap, getAssessmentById } from "@/lib/workspace/progress";
import type { LearningRoadmap } from "@/lib/roadmap/types";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

const EMPTY_WORKSPACE = createEmptyWorkspace();

function levelVariant(level: DemonstratedLevel) {
  if (level === "intermediate" || level === "basic") return "success" as const;
  if (level === "foundational" || level === "beginner") return "warning" as const;
  return "muted" as const;
}

function SummaryList({
  title,
  items,
  empty,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  empty: string;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="muted">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs leading-5 text-muted-strong"
              >
                {tone === "success" ? (
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-success"
                  />
                ) : tone === "warning" ? (
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-warning"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
                  />
                )}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-5 text-muted">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AssessmentResults({
  mode,
  assessmentId,
  initialRecord,
  initialRoadmap,
}: {
  mode: "preview" | "supabase";
  assessmentId: string;
  initialRecord: AssessmentRecord | null;
  initialRoadmap: LearningRoadmap | null;
}) {
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );

  if (previewMode && !hydrated) {
    return (
      <div className="space-y-5" aria-busy="true">
        <span className="sr-only">Loading the saved result</span>
        <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-surface/60" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface/60" />
      </div>
    );
  }

  const record = previewMode
    ? getAssessmentById(workspace.assessments, assessmentId)
    : initialRecord;
  const roadmap = previewMode
    ? getActiveRoadmap(workspace.roadmaps)
    : initialRoadmap;

  if (!record) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="That assessment result is not available"
        description={
          previewMode
            ? "It may have been removed from this browser or the link is wrong."
            : "It does not belong to this account or no longer exists."
        }
        action={
          <Link href="/assessment" className={buttonStyles({ size: "sm" })}>
            Open the assessment
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
      />
    );
  }

  const { summary } = record;
  const remedial = Array.from(
    new Map(
      summary.sections
        .flatMap((section) => section.skills)
        .flatMap((skill) => (skill.remedial ? [skill.remedial] : []))
        .map((lesson) => [lesson.slug, lesson]),
    ).values(),
  );
  const topRecommendations = summary.careerRecommendations.slice(0, 3);
  const overall = summary.overall;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${record.type === "initial" ? "Initial" : "Retake"} assessment result`}
        title="What the short screen shows today"
        description={`Completed ${new Date(
          record.completedAt,
        ).toLocaleString()}. Scores reflect this screen only. They are separate from confidence and are not a certification.`}
        actions={
          <>
            <Badge variant="accent">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Scored on the server
            </Badge>
            <Link
              href="/assessment"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Retake
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="panel-highlight overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Demonstrated score
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
                  {overall.percent}%
                </p>
                <p className="mt-1 text-xs text-muted">
                  {overall.score} of {overall.maxScore} points across{" "}
                  {summary.sections.length} technical sections
                </p>
              </div>
              <div className="space-y-2 text-right">
                <Badge
                  variant={
                    overall.confidenceMismatch === "overconfident"
                      ? "warning"
                      : overall.confidenceMismatch === "underconfident"
                        ? "accent"
                        : "outline"
                  }
                >
                  Confidence {overall.confidenceAverage}/5
                </Badge>
                <p className="text-[0.6875rem] leading-4 text-muted">
                  {overall.confidenceMismatch === "overconfident"
                    ? "Confidence ran ahead of demonstrated answers."
                    : overall.confidenceMismatch === "underconfident"
                      ? "Demonstrated answers ran ahead of confidence."
                      : "Confidence and demonstrated answers were broadly aligned."}
                </p>
              </div>
            </div>

            <Progress
              value={overall.percent}
              label="Demonstrated score"
              className="mt-5"
            />

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {summary.sections.map((section) => (
                <div
                  key={section.section}
                  className="rounded-xl border border-border bg-background/40 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-strong">
                      {section.label}
                    </p>
                    <span className="text-xs font-semibold text-foreground">
                      {section.percent}%
                    </span>
                  </div>
                  <Progress
                    value={section.percent}
                    label={`${section.label} score`}
                    className="mt-2"
                  />
                  <p className="mt-2 text-[0.6875rem] text-muted">
                    Self-rated {getConfidenceLabel(section.confidence)}
                    {section.confidenceMismatch
                      ? ` · flagged ${section.confidenceMismatch}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted">
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-warning"
              />
              {summary.disclaimer}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>Constraints you reported</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                ["Weekly study time", `${summary.constraints.weeklyHours} hours`],
                ["Environment", summary.constraints.environment],
                ["Internet", summary.constraints.internet],
                ["Timeline", summary.constraints.timeline],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-muted">{label}</span>
                  <span className="text-right font-medium text-muted-strong">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Compass aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>Career signals</CardTitle>
              </div>
              <CardDescription>
                Interest ratings shape experiments, not verified ability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {summary.careerSignals.map((signal) => (
                <div
                  key={signal.key}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-muted-strong">{signal.label}</span>
                  <Badge variant="outline">{signal.rating}/5</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SummaryList
          title="Demonstrated strengths"
          items={summary.strengths}
          empty="No section reached basic evidence on this screen. The roadmap starts from foundations."
          tone="success"
        />
        <SummaryList
          title="Gaps to close first"
          items={summary.gaps}
          empty="No foundational gaps were detected on this screen."
          tone="warning"
        />
        <SummaryList
          title="Application practice needed"
          items={summary.applicationGaps}
          empty="No concept-versus-application split was detected."
        />
      </div>

      {summary.confidenceNotes.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="size-4 text-[#b8c3ff]" />
              <CardTitle>Where confidence and evidence disagree</CardTitle>
            </div>
            <CardDescription>
              These notes are feedback, not penalties. They are the reason
              confidence is stored separately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {summary.confidenceNotes.map((note) => (
                <li
                  key={note}
                  className="flex items-start gap-2 rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-xs leading-5 text-muted-strong"
                >
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-warning"
                  />
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-[#b8c3ff]" />
            <CardTitle>Section detail and remedial steps</CardTitle>
          </div>
          <CardDescription>
            Every missed concept points to the exact lesson the roadmap starts
            with. Advanced work stays gated until the prerequisite is done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {summary.sections.map((section) => (
            <div key={section.section} className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {getSectionLabel(section.section)}
                </p>
                <Badge variant="outline">
                  {section.score}/{section.maxScore} · {section.percent}%
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {section.skills.map((skill, index) => (
                  <div
                    key={`${skill.skillSlug}-${skill.concept}-${index}`}
                    className="rounded-xl border border-border bg-background/40 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">
                        {skill.skillName}
                      </p>
                      <Badge variant={levelVariant(skill.level)}>
                        {getDemonstratedLevelLabel(skill.level)}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[0.6875rem] leading-5 text-muted">
                      {skill.concept}
                    </p>
                    {skill.feedback.length > 0 ? (
                      <ul className="mt-2 space-y-1.5">
                        {skill.feedback.map((line) => (
                          <li
                            key={line}
                            className="text-[0.6875rem] leading-5 text-muted-strong"
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {skill.remedial ? (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/8 px-2.5 py-2 text-[0.6875rem] leading-5 text-[#c7d0ff]">
                        <Route
                          aria-hidden="true"
                          className="mt-0.5 size-3 shrink-0"
                        />
                        Remedial: {skill.remedial.title}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Compass aria-hidden="true" className="size-4 text-[#b8c3ff]" />
              <CardTitle>Career paths worth testing</CardTitle>
            </div>
            <CardDescription>
              Ranked by your stated interests and this screen&apos;s evidence.
              Treat each as a hypothesis until an experiment produces something
              you can show.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRecommendations.map((track, index) => (
              <div
                key={track.slug}
                className={cn(
                  "rounded-xl border p-4",
                  index === 0
                    ? "border-primary/30 bg-primary/8"
                    : "border-border bg-background/40",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full border border-border bg-surface-raised text-[0.625rem] font-semibold text-muted-strong">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {track.name}
                    </p>
                  </div>
                  <Badge variant="outline">{track.fitScore}% fit</Badge>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {track.reasons.slice(0, 3).map((reason) => (
                    <li
                      key={reason}
                      className="text-[0.6875rem] leading-5 text-muted-strong"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 border-t border-border/70 pt-2.5 text-[0.6875rem] leading-5 text-muted">
                  <span className="font-medium text-muted-strong">
                    Week 11–12 experiment:{" "}
                  </span>
                  {track.experiment}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          {roadmap ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Route aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                  <CardTitle>Your initial roadmap exists</CardTitle>
                </div>
                <CardDescription>{roadmap.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted">Plan length</span>
                  <span className="font-medium text-muted-strong">
                    {roadmap.summary.totalWeeks} weeks ·{" "}
                    {roadmap.summary.weeklyHours} h/week
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-strong">
                    First 30 days
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    {roadmap.summary.thirtyDayPlan.slice(0, 5).map((item) => (
                      <li
                        key={`${item.week}-${item.title}`}
                        className="flex items-center justify-between gap-2 text-[0.6875rem] leading-5 text-muted"
                      >
                        <span>
                          W{item.week} · {item.title}
                        </span>
                        <span className="shrink-0 flex items-center gap-1 text-muted-strong">
                          <Clock3 aria-hidden="true" className="size-3" />
                          {item.minutes}m
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <Link
                  href="/roadmap"
                  className={buttonStyles({ size: "sm", className: "w-full" })}
                >
                  Open the roadmap
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  href={`/roadmap/new?assessment=${record.id}`}
                  className={buttonStyles({
                    variant: "ghost",
                    size: "sm",
                    className: "w-full",
                  })}
                >
                  Rebuild with different tracks or hours
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Route aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                  <CardTitle>No active roadmap yet</CardTitle>
                </div>
                <CardDescription>
                  Build a plan from this result. Nothing advances without the
                  prerequisites inside it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/roadmap/new?assessment=${record.id}`}
                  className={buttonStyles({ className: "w-full" })}
                >
                  Build my roadmap
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Remedial lessons queued</CardTitle>
            </CardHeader>
            <CardContent>
              {remedial.length > 0 ? (
                <ul className="space-y-2">
                  {remedial.map((lesson) => (
                    <li
                      key={lesson.slug}
                      className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-strong"
                    >
                      {lesson.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-5 text-muted">
                  No remedial lesson was triggered by this screen. The roadmap
                  still begins with an application exercise rather than assuming
                  mastery.
                </p>
              )}
              <p className="mt-3 flex items-start gap-2 text-[0.6875rem] leading-5 text-muted">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-3 shrink-0 text-success"
                />
                Lessons are recommendations from this result. They are not
                marked complete until you actually do the work.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {previewMode ? (
        <Alert variant="warning" title="Stored in this browser only">
          This result and its roadmap live in localStorage. Connecting Supabase
          later does not upload them automatically, and clearing this
          browser&apos;s data removes them.
        </Alert>
      ) : null}
    </div>
  );
}
