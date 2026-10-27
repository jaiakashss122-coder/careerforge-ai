"use client";

import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CirclePlay,
  Clock3,
  Compass,
  Flag,
  Info,
  Lock,
  RefreshCw,
  Route,
  Sparkles,
  Target,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TaskPlanDetails } from "@/components/roadmap/task-plan";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
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
import { getCareerTrack } from "@/lib/career/tracks";
import {
  reschedulePreviewTask,
  setPreviewTaskCompletion,
} from "@/lib/preview/workspace-store";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import type {
  LearningRoadmap,
  RoadmapTask,
  RoadmapTaskCategory,
} from "@/lib/roadmap/types";
import type { LearningSessionRecord } from "@/lib/sessions/types";
import { getSessionModeLabel } from "@/lib/sessions/types";
import {
  getActiveRoadmap,
  getCurrentPlanWeek,
  getPlanWeekRange,
  getRoadmapOverallPercent,
  getTaskLockState,
  getWeeklyProgress,
  sortRoadmapTasks,
} from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import {
  rescheduleTaskAction,
  setTaskCompletionAction,
} from "@/lib/workspace/actions";
import { cn, formatMinutes } from "@/lib/utils";

const EMPTY_WORKSPACE = createEmptyWorkspace();

const CATEGORY_META: Record<
  RoadmapTaskCategory,
  { label: string; variant: BadgeVariant }
> = {
  learning: { label: "Learning", variant: "accent" },
  practice: { label: "Practice", variant: "outline" },
  project: { label: "Project", variant: "success" },
  experiment: { label: "Career experiment", variant: "warning" },
  review: { label: "Review", variant: "muted" },
  checkpoint: { label: "Checkpoint", variant: "danger" },
};

const STATUS_META: Record<
  RoadmapTask["status"],
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: "Not started", variant: "muted" },
  in_progress: { label: "In progress", variant: "accent" },
  completed: { label: "Completed", variant: "success" },
  skipped: { label: "Skipped", variant: "outline" },
  rescheduled: { label: "Moved", variant: "warning" },
};

function formatPlanDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatRangeDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading your roadmap</span>
      <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-surface-raised" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-border bg-surface/60"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

export function RoadmapExperience({
  mode,
  initialRoadmap,
  initialSessions,
  initialHasAssessment,
}: {
  mode: "preview" | "supabase";
  initialRoadmap: LearningRoadmap | null;
  initialSessions: LearningSessionRecord[];
  initialHasAssessment: boolean;
}) {
  const router = useRouter();
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );

  const roadmap = previewMode
    ? getActiveRoadmap(workspace.roadmaps)
    : initialRoadmap;
  const sessions = previewMode ? workspace.sessions : initialSessions;
  const hasAssessment = previewMode
    ? workspace.assessments.length > 0
    : initialHasAssessment;

  const [weekFilter, setWeekFilter] = useState<"current" | "all" | number>(
    "current",
  );
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentWeek = roadmap ? getCurrentPlanWeek(roadmap) : 1;
  const overallPercent = roadmap ? getRoadmapOverallPercent(roadmap) : 0;
  const weeklyProgress = useMemo(
    () => (roadmap ? getWeeklyProgress(roadmap, sessions) : null),
    [roadmap, sessions],
  );
  const recordedMinutes = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "completed")
        .reduce((sum, session) => sum + (session.actualMinutes ?? 0), 0),
    [sessions],
  );
  const weekGroups = useMemo(() => {
    if (!roadmap) return [];
    return roadmap.summary.weeks.map((meta) => ({
      meta,
      tasks: sortRoadmapTasks(
        roadmap.tasks.filter((task) => task.weekNumber === meta.week),
      ),
    }));
  }, [roadmap]);

  const recentSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "completed")
        .slice()
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )
        .slice(0, 4),
    [sessions],
  );

  async function handleToggle(task: RoadmapTask, completed: boolean) {
    setPendingTaskId(task.id);
    setError(null);
    setNotice(null);

    try {
      const result = previewMode
        ? setPreviewTaskCompletion(task.id, completed)
        : await setTaskCompletionAction(task.id, completed);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setNotice(
        completed
          ? `Marked “${task.title}” complete.`
          : `Reopened “${task.title}”.`,
      );
      if (!previewMode) router.refresh();
    } catch {
      setError("The task could not be updated. Reload and try again.");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function handleReschedule(task: RoadmapTask, weekNumber: number) {
    setPendingTaskId(task.id);
    setError(null);
    setNotice(null);

    try {
      const result = previewMode
        ? reschedulePreviewTask(task.id, weekNumber)
        : await rescheduleTaskAction(task.id, weekNumber);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setNotice(
        `Moved “${task.title}” to week ${weekNumber}. Your completed work and progress were kept.`,
      );
      if (!previewMode) router.refresh();
    } catch {
      setError("The task could not be moved. Reload and try again.");
    } finally {
      setPendingTaskId(null);
    }
  }

  if (previewMode && !hydrated) {
    return <RoadmapSkeleton />;
  }

  if (!roadmap) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Learning roadmap"
          title="Your personalized 13-week plan"
          description="The roadmap is generated from a completed assessment, your available hours, and the two career tracks you choose to test."
          actions={
            <Link
              href="/assessment"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Target aria-hidden="true" className="size-4" />
              {hasAssessment ? "Retake assessment" : "Take assessment"}
            </Link>
          }
        />

        {previewMode ? (
          <Alert variant="warning" title="Local preview mode">
            This plan will be stored in this browser only. Supabase is not
            configured, so there is no account to sync it to.
          </Alert>
        ) : null}

        <EmptyState
          icon={Route}
          title={
            hasAssessment
              ? "No active roadmap yet"
              : "Start with the adaptive assessment"
          }
          description={
            hasAssessment
              ? "Your assessment is saved but no plan uses it yet. Build a roadmap to turn its strengths, gaps, and career signals into scheduled work."
              : "The generator will not infer a starting point from your degree or confidence. A short adaptive assessment establishes demonstrated knowledge first."
          }
          action={
            <Link
              href={hasAssessment ? "/roadmap/new" : "/assessment"}
              className={buttonStyles({ size: "sm" })}
            >
              {hasAssessment ? "Build my roadmap" : "Take the assessment"}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
        />
      </div>
    );
  }

  const selected =
    weekFilter === "current" ? currentWeek : weekFilter;
  const visibleGroups =
    selected === "all"
      ? weekGroups
      : weekGroups.filter((group) => group.meta.week === selected);
  const completedTasks = roadmap.tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const completableTasks = roadmap.tasks.filter(
    (task) => task.status !== "skipped",
  ).length;
  const allComplete =
    completableTasks > 0 && completedTasks === completableTasks;
  const currentRange = getPlanWeekRange(roadmap, currentWeek);
  const focusNames = roadmap.focusTracks
    .map((track) => getCareerTrack(track)?.name ?? track)
    .join(" and ");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning roadmap"
        title={roadmap.title}
        description={`${focusNames}. Starts ${formatPlanDate(roadmap.startDate)} and ends ${formatPlanDate(roadmap.endDate)}. Weeks 11–12 test both tracks; week 13 is a checkpoint, not an automatic promotion.`}
        actions={
          <>
            <Badge variant={roadmap.status === "active" ? "success" : "muted"}>
              {roadmap.status === "active" ? "Active plan" : roadmap.status}
            </Badge>
            <Link
              href="/dashboard"
              className={buttonStyles({ size: "sm" })}
            >
              <CirclePlay aria-hidden="true" className="size-4" />
              Open dashboard
            </Link>
            <Link
              href="/roadmap/new"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              New plan
            </Link>
          </>
        }
      />

      {previewMode ? (
        <Alert variant="warning" title="Local preview mode">
          This roadmap and every completion below are stored only in this
          browser. Nothing is uploaded, and study time is recorded only when you
          start and finish a session on the dashboard.
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" title="That change was not applied">
          {error}
        </Alert>
      ) : null}

      {notice ? (
        <Alert variant="success" title="Saved">
          {notice}
        </Alert>
      ) : null}

      {allComplete ? (
        <Alert variant="success" title="All scheduled tasks are complete">
          Nothing advances automatically. Review the evidence from weeks 11–12,
          then choose a specialization and build the next plan when you are
          ready.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                Overall progress
              </p>
              <Flag aria-hidden="true" className="size-4 text-[#b8c3ff]" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {overallPercent}%
            </p>
            <Progress
              value={overallPercent}
              label="Tasks completed across the roadmap"
            />
            <p className="text-xs text-muted">
              {completedTasks} of {completableTasks} tasks complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                Current plan week
              </p>
              <CalendarDays
                aria-hidden="true"
                className="size-4 text-[#b8c3ff]"
              />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              Week {currentWeek}
              <span className="ml-1 text-sm font-normal text-muted">
                / {roadmap.summary.totalWeeks}
              </span>
            </p>
            <p className="text-xs text-muted">
              {formatRangeDate(currentRange.weekStart)} –{" "}
              {formatRangeDate(new Date(currentRange.weekEnd.getTime() - 86400000))}
            </p>
            <p className="text-xs leading-5 text-muted">
              Calculated from the start date, not from pressure.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                This week
              </p>
              <Clock3 aria-hidden="true" className="size-4 text-[#b8c3ff]" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {weeklyProgress ? formatMinutes(weeklyProgress.recordedMinutes) : "0 min"}
            </p>
            <Progress
              value={
                weeklyProgress && weeklyProgress.weeklyTargetMinutes > 0
                  ? (weeklyProgress.recordedMinutes /
                      weeklyProgress.weeklyTargetMinutes) *
                    100
                  : 0
              }
              label="Recorded study time against the weekly target"
            />
            <p className="text-xs text-muted">
              Target {formatMinutes(roadmap.summary.weeklyHours * 60)} ·{" "}
              {weeklyProgress?.completedSessionCount ?? 0} finished sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                Recorded study time
              </p>
              <Compass aria-hidden="true" className="size-4 text-[#b8c3ff]" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {formatMinutes(recordedMinutes)}
            </p>
            <p className="text-xs leading-5 text-muted">
              Only sessions you start and finish count. Scheduled minutes are
              not treated as study.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          View week
        </span>
        <button
          type="button"
          onClick={() => setWeekFilter("current")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            weekFilter === "current"
              ? "border-primary/40 bg-primary/10 text-[#c7d0ff]"
              : "border-border text-muted hover:border-border-strong hover:text-foreground",
          )}
        >
          Current (week {currentWeek})
        </button>
        {Array.from({ length: roadmap.summary.totalWeeks }, (_, index) => {
          const week = index + 1;
          const meta = weekGroups.find((group) => group.meta.week === week)
            ?.meta;
          return (
            <button
              key={week}
              type="button"
              onClick={() => setWeekFilter(week)}
              title={meta?.title ?? `Week ${week}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                weekFilter === week
                  ? "border-primary/40 bg-primary/10 text-[#c7d0ff]"
                  : week === currentWeek
                    ? "border-border-strong text-muted-strong hover:text-foreground"
                    : "border-border text-muted hover:border-border-strong hover:text-foreground",
              )}
            >
              W{week}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setWeekFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            weekFilter === "all"
              ? "border-primary/40 bg-primary/10 text-[#c7d0ff]"
              : "border-border text-muted hover:border-border-strong hover:text-foreground",
          )}
        >
          All weeks
        </button>
      </div>

      <div className="space-y-5">
        {visibleGroups.map((group) => {
          const weekScheduledMinutes = group.tasks.reduce(
            (sum, task) => sum + task.estimatedMinutes,
            0,
          );
          const weekCompleted = group.tasks.filter(
            (task) => task.status === "completed",
          ).length;
          const range = getPlanWeekRange(roadmap, group.meta.week);

          return (
            <section
              key={group.meta.week}
              aria-labelledby={`week-${group.meta.week}-heading`}
              className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        group.meta.week === currentWeek ? "accent" : "outline"
                      }
                    >
                      Week {group.meta.week}
                      {group.meta.week === currentWeek ? " · now" : ""}
                    </Badge>
                    <span className="text-xs text-muted">
                      {formatRangeDate(range.weekStart)} –{" "}
                      {formatRangeDate(
                        new Date(range.weekEnd.getTime() - 86400000),
                      )}
                    </span>
                  </div>
                  <h2
                    id={`week-${group.meta.week}-heading`}
                    className="mt-2 text-lg font-semibold tracking-tight text-foreground"
                  >
                    {group.meta.title}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                    {group.meta.summary}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <Badge variant="muted">
                    <Clock3 aria-hidden="true" className="size-3" />
                    {formatMinutes(weekScheduledMinutes)}
                  </Badge>
                  <span className="text-[0.6875rem] text-muted">
                    {weekCompleted}/{group.tasks.length} complete
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    roadmap={roadmap}
                    expanded={expandedTaskId === task.id}
                    pending={pendingTaskId === task.id}
                    onToggleExpand={() =>
                      setExpandedTaskId((current) =>
                        current === task.id ? null : task.id,
                      )
                    }
                    onToggleComplete={handleToggle}
                    onReschedule={handleReschedule}
                  />
                ))}
                {group.tasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                    No tasks are scheduled in this week. That is intentional
                    breathing room, not missing progress.
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target aria-hidden="true" className="size-4 text-[#b8c3ff]" />
              <CardTitle>The first 30 days</CardTitle>
            </div>
            <CardDescription>
              The concrete sequence at the start of this plan. Later weeks adapt
              as you actually complete work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5">
              {roadmap.summary.thirtyDayPlan.map((item) => (
                <li
                  key={`${item.week}-${item.title}`}
                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/30 p-3"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-surface-raised text-[0.6875rem] font-semibold text-muted-strong">
                    W{item.week}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.delayLabel} · {formatMinutes(item.minutes)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>Why this plan</CardTitle>
              </div>
              <CardDescription>
                Derived from your assessment evidence, not your degree.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-5">
              <div>
                <p className="font-semibold uppercase tracking-[0.14em] text-muted">
                  Strengths to build on
                </p>
                <ul className="mt-1.5 space-y-1 text-muted-strong">
                  {roadmap.summary.strengths.slice(0, 4).map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 size-3 shrink-0 text-success"
                      />
                      {item}
                    </li>
                  ))}
                  {roadmap.summary.strengths.length === 0 ? (
                    <li className="text-muted">
                      No demonstrated strength cleared the threshold yet. The
                      foundation tasks start from the beginning on purpose.
                    </li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-[0.14em] text-muted">
                  Gaps addressed first
                </p>
                <ul className="mt-1.5 space-y-1 text-muted-strong">
                  {roadmap.summary.gaps.slice(0, 4).map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <TriangleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-3 shrink-0 text-warning"
                      />
                      {item}
                    </li>
                  ))}
                  {roadmap.summary.gaps.length === 0 ? (
                    <li className="text-muted">
                      No blocking gap was identified in the assessment. The plan
                      still checks foundations before advanced work.
                    </li>
                  ) : null}
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3 text-muted">
                <p className="flex items-start gap-1.5">
                  <Info
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-[#b8c3ff]"
                  />
                  {roadmap.summary.disclaimer}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Recent finished sessions</CardTitle>
                <Link
                  href="/dashboard"
                  className="text-xs font-medium text-[#b8c3ff] hover:underline"
                >
                  Study now
                </Link>
              </div>
              <CardDescription>
                Recorded time comes from sessions you explicitly finished.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <ul className="space-y-2.5">
                  {recentSessions.map((session) => {
                    const task = roadmap.tasks.find(
                      (entry) => entry.id === session.taskId,
                    );
                    return (
                      <li
                        key={session.id}
                        className="flex items-start justify-between gap-3 border-b border-border/60 pb-2.5 text-xs last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-muted-strong">
                            {task?.title ?? "General study"}
                          </p>
                          <p className="mt-0.5 text-muted">
                            {new Intl.DateTimeFormat("en-US", {
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            }).format(new Date(session.startedAt))}{" "}
                            · {getSessionModeLabel(session.mode)}
                          </p>
                        </div>
                        <Badge variant="muted">
                          {session.actualMinutes ?? 0} min
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs leading-5 text-muted">
                  No finished sessions yet. Start one from the dashboard when
                  you actually sit down to study — nothing is recorded before
                  that.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs leading-5 text-muted">
        <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Task completion and study time are separate. Marking a task complete
        records progress only; study time counts only when a session is started
        and finished.
      </p>
    </div>
  );
}

function TaskCard({
  task,
  roadmap,
  expanded,
  pending,
  onToggleExpand,
  onToggleComplete,
  onReschedule,
}: {
  task: RoadmapTask;
  roadmap: LearningRoadmap;
  expanded: boolean;
  pending: boolean;
  onToggleExpand: () => void;
  onToggleComplete: (task: RoadmapTask, completed: boolean) => void;
  onReschedule: (task: RoadmapTask, weekNumber: number) => void;
}) {
  const [rescheduleWeek, setRescheduleWeek] = useState(task.weekNumber);
  const lock = getTaskLockState(task, roadmap);
  const category = CATEGORY_META[task.category];
  const status = STATUS_META[task.status];
  const completed = task.status === "completed";
  const prerequisites = task.prerequisiteIds
    .map((id) => roadmap.tasks.find((entry) => entry.id === id) ?? null)
    .filter((entry): entry is RoadmapTask => entry !== null);
  const missingPrerequisiteCount =
    task.prerequisiteIds.length - prerequisites.length;
  const focus = task.resources.focus;

  return (
    <article
      className={cn(
        "rounded-xl border bg-background/40 p-4 transition-colors",
        completed
          ? "border-success/20"
          : lock.locked
            ? "border-border/70"
            : "border-border-strong/70",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={category.variant}>{category.label}</Badge>
            {focus ? (
              <Badge variant="outline">
                {focus === "foundation"
                  ? "Foundation"
                  : focus === "refresh"
                    ? "Refresh"
                    : "Standard"}
              </Badge>
            ) : null}
            {lock.locked && !completed ? (
              <Badge variant="warning">
                <Lock aria-hidden="true" className="size-3" />
                Prerequisite
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-2 flex items-start gap-2 text-sm font-semibold text-foreground">
            {completed ? (
              <CircleCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-success"
              />
            ) : null}
            <span>{task.title}</span>
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            {task.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted">
            <Clock3 aria-hidden="true" className="size-3" />
            {formatMinutes(task.estimatedMinutes)}
          </span>
        </div>
      </div>

      {task.prerequisiteIds.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
          <span className="font-medium uppercase tracking-[0.12em]">
            Requires
          </span>
          {prerequisites.map((prerequisite) => (
            <span
              key={prerequisite.id}
              className={cn(
                "inline-flex items-center gap-1",
                prerequisite.status === "completed"
                  ? "text-[#8ef0c7]"
                  : "text-warning",
              )}
            >
              {prerequisite.status === "completed" ? (
                <Check aria-hidden="true" className="size-3" />
              ) : (
                <Lock aria-hidden="true" className="size-3" />
              )}
              {prerequisite.title}
            </span>
          ))}
          {missingPrerequisiteCount > 0 ? (
            <span className="text-danger">
              {missingPrerequisiteCount} missing prerequisite link
              {missingPrerequisiteCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      ) : null}

      {lock.locked && !completed ? (
        <p className="mt-2 rounded-lg border border-warning/25 bg-warning/8 px-3 py-2 text-[0.6875rem] leading-5 text-[#f3d9a5]">
          Locked until{" "}
          {lock.unmetPrerequisites.length > 0
            ? lock.unmetPrerequisites.map((entry) => entry.title).join(", ")
            : "the missing prerequisite is restored"}
          . Nothing was auto-completed for you.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {completed ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleComplete(task, false)}
            disabled={pending}
          >
            <Undo2 aria-hidden="true" className="size-3.5" />
            {pending ? "Reopening…" : "Reopen"}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              onClick={() => onToggleComplete(task, true)}
              disabled={pending || lock.locked}
              title={
                lock.locked
                  ? "Finish the prerequisites before completing this task"
                  : undefined
              }
            >
              <Check aria-hidden="true" className="size-3.5" />
              {pending ? "Saving…" : "Mark complete"}
            </Button>
            {!lock.locked ? (
              <Link
                href={`/dashboard?task=${task.id}`}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                <CirclePlay aria-hidden="true" className="size-3.5" />
                Start session
              </Link>
            ) : null}
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleExpand}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp aria-hidden="true" className="size-3.5" />
          ) : (
            <ChevronDown aria-hidden="true" className="size-3.5" />
          )}
          {expanded ? "Hide session plan" : "Session plan"}
        </Button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 rounded-xl border border-border/70 bg-surface/50 p-4">
          <TaskPlanDetails resources={task.resources} />

          {!completed ? (
            <div className="flex flex-wrap items-end gap-2 border-t border-border/60 pt-3">
              <div>
                <label
                  htmlFor={`reschedule-${task.id}`}
                  className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted"
                >
                  <CalendarClock aria-hidden="true" className="size-3.5" />
                  Reschedule
                </label>
                <select
                  id={`reschedule-${task.id}`}
                  value={rescheduleWeek}
                  onChange={(event) =>
                    setRescheduleWeek(Number(event.target.value))
                  }
                  className="mt-1 h-9 rounded-lg border border-border-strong bg-background/60 px-2.5 text-xs text-foreground focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 [&>option]:bg-surface"
                >
                  {Array.from(
                    { length: roadmap.summary.totalWeeks },
                    (_, index) => index + 1,
                  ).map((week) => (
                    <option key={week} value={week}>
                      Week {week}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReschedule(task, rescheduleWeek)}
                disabled={pending || rescheduleWeek === task.weekNumber}
              >
                <ArrowRight aria-hidden="true" className="size-3.5" />
                {pending ? "Moving…" : "Move task"}
              </Button>
              <p className="text-[0.6875rem] leading-5 text-muted">
                Moving work never resets completed tasks or recorded sessions.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
