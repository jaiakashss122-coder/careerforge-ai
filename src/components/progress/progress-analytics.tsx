"use client";

import {
  ArrowRight,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FolderKanban,
  Lightbulb,
  Repeat,
  Route,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldHint } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { getDemonstratedLevelLabel } from "@/lib/assessment/engine";
import type { DemonstratedLevel } from "@/lib/assessment/types";
import { buildProgressAnalytics } from "@/lib/progress/analytics";
import {
  ASSESSMENT_LANE_LABELS,
  type CategoryProficiency,
  type ProgressAnalytics,
  type SkillProficiency,
} from "@/lib/progress/types";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";
import { formatMinutes } from "@/lib/utils";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";

const LEVEL_VARIANT: Record<DemonstratedLevel, BadgeVariant> = {
  intermediate: "success",
  basic: "success",
  beginner: "warning",
  foundational: "warning",
  none: "muted",
};

function DividerHeading({ children }: { children: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa7c7]">
      {children}
    </h2>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading your progress analytics</span>
      <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-36 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

function shortDate(value: string) {
  return value.slice(0, 10);
}

function SkillRow({ skill }: { skill: SkillProficiency }) {
  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-surface-raised/30 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{skill.skillName}</p>
        <div className="flex flex-wrap items-center gap-2">
          {skill.demonstratedLevel ? (
            <Badge variant={LEVEL_VARIANT[skill.demonstratedLevel]}>
              {getDemonstratedLevelLabel(skill.demonstratedLevel)}
            </Badge>
          ) : (
            <Badge variant="outline">Not covered yet</Badge>
          )}
          {typeof skill.demonstratedPercent === "number" ? (
            <Badge variant="muted">{skill.demonstratedPercent}% right</Badge>
          ) : null}
        </div>
      </div>

      {typeof skill.demonstratedPercent === "number" ? (
        <Progress
          value={skill.demonstratedPercent}
          label={`Demonstrated score for ${skill.skillName}`}
        />
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {skill.evidenceSources.length > 0 ? (
          skill.evidenceSources.map((source) => (
            <Badge key={source} variant="outline">
              {ASSESSMENT_LANE_LABELS[source]}
            </Badge>
          ))
        ) : (
          <Badge variant="outline">No evidence recorded yet</Badge>
        )}
      </div>

      <FieldHint>{skill.explanation}</FieldHint>

      {skill.confidenceMismatch ? (
        <Alert
          variant="warning"
          title={
            skill.confidenceMismatch === "overconfident"
              ? "Your confidence is higher than your answers show"
              : "Your answers are stronger than your confidence"
          }
        >
          You rated your confidence {skill.confidence}/5 and got{" "}
          {skill.demonstratedPercent ?? 0}% of the questions right. These stay
          two separate numbers on purpose.
        </Alert>
      ) : null}
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryProficiency }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>{category.label}</CardTitle>
            <CardDescription>{category.explanation}</CardDescription>
          </div>
          <Badge
            variant={category.summaryPercent === null ? "outline" : "accent"}
          >
            {category.summaryPercent === null
              ? "No answers yet"
              : `${category.summaryPercent}% category average`}
          </Badge>
        </div>
        {category.summaryPercent !== null ? (
          <Progress
            value={category.summaryPercent}
            label={`Average demonstrated score for ${category.label}`}
            className="mt-2"
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {category.strongestSkill &&
        category.weakestSkill &&
        category.strongestSkill.skillSlug !==
          category.weakestSkill.skillSlug ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs leading-5 text-muted">
            <span>
              Strongest here:{" "}
              <span className="text-foreground">
                {category.strongestSkill.skillName}
              </span>{" "}
              ({category.strongestSkill.demonstratedPercent ?? 0}%)
            </span>
            <span>
              Weakest here:{" "}
              <span className="text-foreground">
                {category.weakestSkill.skillName}
              </span>{" "}
              ({category.weakestSkill.demonstratedPercent ?? 0}%)
            </span>
          </div>
        ) : null}

        {category.skills.map((skill) => (
          <SkillRow key={skill.skillSlug} skill={skill} />
        ))}
      </CardContent>
    </Card>
  );
}

function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-32 flex-1 space-y-1 rounded-xl border border-border/70 bg-surface-raised/30 p-3.5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}

export function ProgressAnalyticsView({
  mode,
  initialWorkspace,
}: {
  mode: "preview" | "supabase";
  initialWorkspace: WorkspaceSnapshot;
}) {
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    initialWorkspace,
    previewMode,
  );

  const analytics: ProgressAnalytics = useMemo(
    () => buildProgressAnalytics({ workspace }),
    [workspace],
  );

  if (previewMode && !hydrated) {
    return <AnalyticsSkeleton />;
  }

  const hasAnyData =
    workspace.assessments.length > 0 ||
    workspace.roadmaps.length > 0 ||
    workspace.sessions.length > 0 ||
    workspace.projects.length > 0 ||
    workspace.evidence.length > 0;

  const {
    nextAction,
    learningActivity,
    studyTime,
    evidenceLanes,
    consistency,
    roadmapProgress,
    projectSummary,
    categories,
  } = analytics;

  const accuracy = learningActivity.questionAccuracy;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Progress"
        title="What your evidence actually shows"
        description="Exposure, practice, submitted projects, and interview attempts stay in separate lanes. Study time only counts sessions you actually started or completed, and every number on this page carries the explanation behind it."
        actions={
          <>
            <Badge variant="muted">
              {accuracy.total > 0
                ? `${accuracy.correct} of ${accuracy.total} questions right`
                : "No answered questions yet"}
            </Badge>
            <Link
              href="/assessment"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Target aria-hidden="true" className="size-4" />
              Assessment
            </Link>
          </>
        }
      />

      {previewMode ? (
        <Alert variant="warning" title="Local preview mode">
          These numbers come from this browser only, because Supabase is not
          configured. Clearing site data resets them to zero.
        </Alert>
      ) : null}

      <Card className="border-primary/35 bg-primary/6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4" />
            What should I do next?
          </CardTitle>
          <CardDescription>
            One action is ranked highest from your real state — nothing here is
            a generic suggestion. The rule that picked it is shown so you can
            check it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-base font-semibold text-foreground">
            {nextAction.title}
          </p>
          <p className="text-sm leading-6 text-muted-strong">
            {nextAction.why}
          </p>
          <FieldHint>{nextAction.detail}</FieldHint>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={nextAction.href}
              className={buttonStyles({ size: "sm" })}
            >
              {nextAction.ctaLabel}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
            <FieldHint className="flex-1">
              Priority {nextAction.priority}. The ranking looks at an unfinished
              assessment first, then a session already running, then building a
              plan, then the nearest task you are allowed to open, then
              revision, then project work.
            </FieldHint>
          </div>
        </CardContent>
      </Card>

      {!hasAnyData ? (
        <EmptyState
          icon={ChartColumn}
          title="Nothing measured yet"
          description="This page has no numbers to show because no assessment, roadmap, session, project, or skill record is stored yet. Taking the assessment fills the skill lanes; starting sessions fills the study-time lane; a finished practice interview fills the interview lane."
          action={
            <Link href="/assessment" className={buttonStyles({ size: "sm" })}>
              Take the assessment
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
        />
      ) : null}

      {hasAnyData ? (
        <>
          <DividerHeading>Evidence and activity</DividerHeading>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer aria-hidden="true" className="size-4" />
                Recorded study time
              </CardTitle>
              <CardDescription>
                Only sessions you started or completed add minutes. Idle time,
                tabs left open, and planned study are never counted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <StatBlock
                  label="Total recorded"
                  value={formatMinutes(studyTime.totalRecordedMinutes)}
                />
                <StatBlock
                  label="This week"
                  value={formatMinutes(studyTime.weekRecordedMinutes)}
                />
                <StatBlock
                  label="Sessions completed"
                  value={String(studyTime.completedSessionCount)}
                />
                <StatBlock
                  label="Sessions started"
                  value={String(studyTime.startedSessionCount)}
                  hint={
                    studyTime.abandonedSessionCount > 0
                      ? `${
                          studyTime.abandonedSessionCount === 1
                            ? "One"
                            : studyTime.abandonedSessionCount
                        } of them ${
                          studyTime.abandonedSessionCount === 1 ? "was" : "were"
                        } abandoned and credited with zero minutes.`
                      : "A session still running is listed here but credited only once you finish it."
                  }
                />
              </div>
              <FieldHint>{studyTime.explanation}</FieldHint>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat aria-hidden="true" className="size-4" />
                Evidence lanes
              </CardTitle>
              <CardDescription>
                Each lane is a different kind of proof and they are never added
                together. A project record does not become mastery because it
                sits next to a good assessment score.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {evidenceLanes.map((lane) => (
                <div
                  key={lane.sourceType}
                  className="space-y-1.5 rounded-xl border border-border/70 bg-surface-raised/30 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {lane.label}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={lane.count > 0 ? "accent" : "outline"}>
                        {lane.count} {lane.count === 1 ? "record" : "records"}
                      </Badge>
                      {lane.skillCount > 0 ? (
                        <Badge variant="muted">
                          {lane.skillCount}{" "}
                          {lane.skillCount === 1 ? "skill" : "skills"}
                        </Badge>
                      ) : null}
                      <Badge
                        variant={lane.verifiedCount > 0 ? "success" : "muted"}
                      >
                        {lane.verifiedCount} verified
                      </Badge>
                    </div>
                  </div>
                  <FieldHint>{lane.note}</FieldHint>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route aria-hidden="true" className="size-4" />
                Roadmap progress
              </CardTitle>
              <CardDescription>{roadmapProgress.explanation}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={roadmapProgress.overallPercent}
                label="Completed roadmap tasks"
              />
              <div className="flex flex-wrap gap-3">
                <StatBlock
                  label="Complete"
                  value={`${roadmapProgress.completedTaskCount} tasks`}
                />
                <StatBlock
                  label="Still open"
                  value={`${roadmapProgress.remainingTaskCount} tasks`}
                  hint="Tasks you marked as not relevant are excluded, not counted as failures."
                />
                <StatBlock
                  label="Current week"
                  value={
                    roadmapProgress.currentWeek === null
                      ? "No active plan"
                      : `Week ${roadmapProgress.currentWeek}`
                  }
                  hint={roadmapProgress.currentWeekTitle ?? undefined}
                />
              </div>
              <Link
                href="/roadmap"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Open roadmap
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban aria-hidden="true" className="size-4" />
                Project work
              </CardTitle>
              <CardDescription>{projectSummary.explanation}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <StatBlock
                  label="Started"
                  value={String(projectSummary.startedCount)}
                />
                <StatBlock
                  label="Completed"
                  value={String(projectSummary.completedCount)}
                />
                <StatBlock
                  label="Evidence records"
                  value={String(projectSummary.evidenceCount)}
                  hint="Created only from submitted milestones and a linked repository."
                />
              </div>
              <Link
                href="/projects"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Open Project Lab
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList aria-hidden="true" className="size-4" />
                Learning activity
              </CardTitle>
              <CardDescription>{learningActivity.explanation}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <StatBlock
                  label="Learning steps"
                  value={String(learningActivity.learningTasksCompleted)}
                />
                <StatBlock
                  label="Practice done"
                  value={String(learningActivity.practiceTasksCompleted)}
                />
                <StatBlock
                  label="Project steps"
                  value={String(learningActivity.projectTasksCompleted)}
                />
                <StatBlock
                  label="Assessments"
                  value={String(learningActivity.assessmentAttempts)}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Accuracy on questions that have a right or wrong answer
                </p>
                {accuracy.total > 0 ? (
                  <>
                    <Progress
                      value={accuracy.percent ?? 0}
                      label="Share of questions with a right or wrong answer that were right"
                    />
                    <FieldHint>
                      {accuracy.correct} of {accuracy.total} questions were
                      right. Confidence ratings and career-preference answers
                      are left out because they cannot be right or wrong.
                    </FieldHint>
                  </>
                ) : (
                  <FieldHint>
                    No questions with a right or wrong answer have been recorded
                    yet. This stays empty rather than showing a made-up
                    percentage.
                  </FieldHint>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat aria-hidden="true" className="size-4" />
                Repeated mistakes
              </CardTitle>
              <CardDescription>
                A concept appears here only when you missed it in two separate
                assessment attempts. Missing it twice in one attempt is a single
                result, not a pattern.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {learningActivity.repeatedMistakes.length === 0 ? (
                <FieldHint>
                  Nothing repeats yet. Either you have taken one assessment
                  attempt, or the concepts you missed you also missed only once.
                </FieldHint>
              ) : (
                learningActivity.repeatedMistakes.map((mistake) => (
                  <div
                    key={mistake.concept}
                    className="space-y-1.5 rounded-xl border border-border/70 bg-surface-raised/30 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {mistake.concept}
                      </p>
                      <Badge variant="warning">
                        missed in {mistake.missedInAttempts} attempts
                      </Badge>
                    </div>
                    <FieldHint>{mistake.explanation}</FieldHint>
                    <FieldHint>
                      First missed {shortDate(mistake.firstMissedAt)}, most
                      recently {shortDate(mistake.lastMissedAt)}, asked{" "}
                      {mistake.questionCount}{" "}
                      {mistake.questionCount === 1 ? "time" : "times"}.
                    </FieldHint>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb aria-hidden="true" className="size-4" />
                Revision backlog
              </CardTitle>
              <CardDescription>
                The specific things worth reopening next, each with the reason
                it is here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {learningActivity.revisionBacklog.length === 0 ? (
                <FieldHint>
                  Empty right now, because no skill scored low enough to need
                  revision. That is a real result, not a missing feature.
                </FieldHint>
              ) : (
                learningActivity.revisionBacklog.map((item) => (
                  <div
                    key={`${item.skillSlug ?? "concept"}-${item.title}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface-raised/30 p-3.5"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <FieldHint>{item.reason}</FieldHint>
                      {item.remedialSlug ? (
                        <FieldHint>
                          Your result names this topic, but there is no lesson
                          page to open yet. The roadmap holds the tasks that
                          cover this skill.
                        </FieldHint>
                      ) : (
                        <FieldHint>
                          Opens the AI Tutor with an empty box — type or paste
                          this topic there.
                        </FieldHint>
                      )}
                    </div>
                    <Link
                      href={item.href}
                      className={buttonStyles({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      {item.remedialSlug ? "Open your roadmap" : "Ask the tutor"}
                      <span className="sr-only">: {item.title}</span>
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="size-4" />
                Weekly consistency
              </CardTitle>
              <CardDescription>{consistency.note}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <StatBlock
                  label={
                    consistency.weeksBasis === "plan"
                      ? "Plan weeks so far"
                      : "Calendar weeks so far"
                  }
                  value={String(consistency.weeksElapsed)}
                />
                <StatBlock
                  label="Weeks with activity"
                  value={String(consistency.activeWeeks)}
                />
                <StatBlock
                  label="Best current run"
                  value={`${consistency.consecutiveActiveWeeks} ${
                    consistency.consecutiveActiveWeeks === 1 ? "week" : "weeks"
                  }`}
                  hint="A week with nothing recorded ends the run; it is not labelled as a failure anywhere."
                />
              </div>
              <FieldHint>
                {consistency.activeWeekNumbers.length > 0
                  ? `${
                      consistency.weeksBasis === "plan" ? "Plan" : "Calendar"
                    } weeks with a completed session: ${consistency.activeWeekNumbers.join(
                      ", ",
                    )}.`
                  : `${
                      consistency.weeksBasis === "plan" ? "Plan" : "Calendar"
                    } weeks with a completed session: none yet.`}
              </FieldHint>
            </CardContent>
          </Card>
        </>
      ) : null}

      <DividerHeading>Skill proficiency by category</DividerHeading>

      {categories.map((category) => (
        <CategoryCard key={category.category} category={category} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>How to read these numbers</CardTitle>
          <CardDescription>
            Limits of the evidence, stated the same way every time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {analytics.disclaimers.map((text) => (
            <p key={text} className="flex gap-2 text-sm leading-6 text-muted">
              <span aria-hidden="true" className="text-[#9aa7c7]">
                •
              </span>
              {text}
            </p>
          ))}
        </CardContent>
        <CardFooter>
          <FieldHint>
            Nothing on this page is estimated, smoothed, or filled in. If a
            number is missing it is because the underlying activity was never
            recorded.
          </FieldHint>
        </CardFooter>
      </Card>
    </div>
  );
}
