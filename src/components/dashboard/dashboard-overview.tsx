"use client";

import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleCheck,
  CirclePlay,
  Clock3,
  Compass,
  Flag,
  Info,
  ListChecks,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActiveSessionCard } from "@/components/dashboard/active-session";
import { TaskPlanDetails } from "@/components/roadmap/task-plan";
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
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import type { AssessmentRecord } from "@/lib/assessment/types";
import {
  endPreviewSession,
  reschedulePreviewTask,
  setPreviewTaskCompletion,
  startPreviewSession,
} from "@/lib/preview/workspace-store";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import type { Profile } from "@/lib/profile/schema";
import type {
  LearningRoadmap,
  RoadmapTask,
  RoadmapTaskCategory,
} from "@/lib/roadmap/types";
import {
  getSessionModeLabel,
  SESSION_PRESETS,
  type LearningSessionRecord,
  type SessionMode,
} from "@/lib/sessions/types";
import {
  getActiveRoadmap,
  getLatestAssessment,
  getNextTask,
  getPlanWeekRange,
  getRoadmapOverallPercent,
  getTaskLockState,
  getUpcomingTasks,
  getWeeklyProgress,
} from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import {
  endSessionAction,
  rescheduleTaskAction,
  setTaskCompletionAction,
  startSessionAction,
} from "@/lib/workspace/actions";
import { cn, firstName, formatLongDate, formatMinutes } from "@/lib/utils";

const EMPTY_WORKSPACE = createEmptyWorkspace();

const CATEGORY_LABEL: Record<RoadmapTaskCategory, string> = {
  learning: "Learning",
  practice: "Practice",
  project: "Project",
  experiment: "Career experiment",
  review: "Review",
  checkpoint: "Checkpoint",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading your saved dashboard</span>
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-surface-raised" />
        <div className="h-8 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-surface-raised" />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/60 xl:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/60" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

function RescheduleControl({
  task,
  pending,
  onMove,
}: {
  task: RoadmapTask;
  pending: boolean;
  onMove: (weekNumber: number) => void;
}) {
  const [week, setWeek] = useState(task.weekNumber);

  return (
    <details className="rounded-xl border border-border/70 bg-background/30 px-3 py-2.5">
      <summary className="cursor-pointer text-xs font-medium text-muted-strong">
        Reschedule this task
      </summary>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label
            htmlFor={`dashboard-reschedule-${task.id}`}
            className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted"
          >
            <CalendarClock aria-hidden="true" className="size-3.5" />
            Move to week
          </label>
          <select
            id={`dashboard-reschedule-${task.id}`}
            value={week}
            onChange={(event) => setWeek(Number(event.target.value))}
            className="mt-1 h-9 rounded-lg border border-border-strong bg-background/60 px-2.5 text-xs text-foreground focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 [&>option]:bg-surface"
          >
            {Array.from({ length: 13 }, (_, index) => index + 1).map(
              (option) => (
                <option key={option} value={option}>
                  Week {option}
                </option>
              ),
            )}
          </select>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onMove(week)}
          disabled={pending || week === task.weekNumber}
        >
          <ArrowRight aria-hidden="true" className="size-3.5" />
          {pending ? "Moving…" : "Move task"}
        </Button>
      </div>
      <p className="mt-2 text-[0.6875rem] leading-5 text-muted">
        Unfinished work moves without shame or a progress reset. Completed tasks
        cannot be moved.
      </p>
    </details>
  );
}

export function DashboardOverview({
  mode,
  initialProfile,
  initialAssessment,
  initialRoadmap,
  initialSessions,
  requestedTaskId,
}: {
  mode: "preview" | "supabase";
  initialProfile: Profile | null;
  initialAssessment: AssessmentRecord | null;
  initialRoadmap: LearningRoadmap | null;
  initialSessions: LearningSessionRecord[];
  requestedTaskId: string | null;
}) {
  const router = useRouter();
  const previewMode = mode === "preview";
  const profileSnapshot = usePreviewProfileSnapshot(
    initialProfile,
    previewMode,
  );
  const workspaceSnapshot = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );
  const profile = profileSnapshot.profile;
  const workspace = workspaceSnapshot.workspace;

  const assessment = previewMode
    ? getLatestAssessment(workspace.assessments)
    : initialAssessment;
  const roadmap = previewMode
    ? getActiveRoadmap(workspace.roadmaps)
    : initialRoadmap;
  const sessions = previewMode ? workspace.sessions : initialSessions;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    requestedTaskId,
  );
  const [sessionChoice, setSessionChoice] = useState<{
    mode: SessionMode;
    minutes: number;
  }>(() => {
    const preferred = SESSION_PRESETS.find(
      (preset) => preset.minutes === (profile?.preferredSessionMinutes ?? 45),
    );
    const preset = preferred ?? SESSION_PRESETS[1];
    return { mode: preset.mode, minutes: preset.minutes };
  });
  const [sessionPending, setSessionPending] = useState(false);
  const [taskPending, setTaskPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.status === "active") ?? null,
    [sessions],
  );

  const nextTask = useMemo(
    () => (roadmap ? getNextTask(roadmap) : null),
    [roadmap],
  );

  const selectedTask = useMemo(() => {
    if (!roadmap) return null;
    const requested = selectedTaskId
      ? roadmap.tasks.find((task) => task.id === selectedTaskId)
      : null;
    if (
      requested &&
      requested.status !== "completed" &&
      !getTaskLockState(requested, roadmap).locked
    ) {
      return requested;
    }
    return nextTask;
  }, [roadmap, selectedTaskId, nextTask]);

  const weeklyProgress = useMemo(
    () => (roadmap ? getWeeklyProgress(roadmap, sessions) : null),
    [roadmap, sessions],
  );

  const upcomingTasks = useMemo(
    () =>
      roadmap
        ? getUpcomingTasks(roadmap, 3, selectedTask?.id)
        : [],
    [roadmap, selectedTask?.id],
  );

  const recentSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status !== "active")
        .slice()
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )
        .slice(0, 5),
    [sessions],
  );

  const recordedMinutes = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "completed")
        .reduce((sum, session) => sum + (session.actualMinutes ?? 0), 0),
    [sessions],
  );

  const activeTask =
    activeSession?.taskId && roadmap
      ? (roadmap.tasks.find((task) => task.id === activeSession.taskId) ?? null)
      : null;

  const greetingName = profile?.fullName ? firstName(profile.fullName) : "";

  async function handleStartSession() {
    if (!selectedTask) return;
    setSessionPending(true);
    setError(null);
    setNotice(null);

    try {
      if (previewMode) {
        const result = startPreviewSession({
          taskId: selectedTask.id,
          mode: sessionChoice.mode,
          plannedMinutes: sessionChoice.minutes,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setNotice(
          "Session started. Time is recorded only when you finish it — abandon if you stop early.",
        );
        return;
      }

      const result = await startSessionAction({
        taskId: selectedTask.id,
        mode: sessionChoice.mode,
        plannedMinutes: sessionChoice.minutes,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(
        "Session started. Time is recorded only when you finish it — abandon if you stop early.",
      );
      router.refresh();
    } catch {
      setError("The session could not be started. Reload and try again.");
    } finally {
      setSessionPending(false);
    }
  }

  async function handleEndSession(
    outcome: "completed" | "abandoned",
    notes: string,
  ) {
    if (!activeSession) return;
    setSessionPending(true);
    setError(null);
    setNotice(null);

    try {
      if (previewMode) {
        const result = endPreviewSession({
          sessionId: activeSession.id,
          outcome,
          notes,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setNotice(
          outcome === "completed"
            ? "Session finished and added to your recorded study time."
            : "Session closed without counting toward your study time.",
        );
        return;
      }

      const result = await endSessionAction({
        sessionId: activeSession.id,
        outcome,
        notes,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(
        result.message ??
          (outcome === "completed"
            ? "Session finished and recorded."
            : "Session closed without counting."),
      );
      router.refresh();
    } catch {
      setError("The session could not be closed. Reload and try again.");
    } finally {
      setSessionPending(false);
    }
  }

  async function handleCompleteTask() {
    if (!selectedTask) return;
    setTaskPending(true);
    setError(null);
    setNotice(null);

    try {
      const result = previewMode
        ? setPreviewTaskCompletion(selectedTask.id, true)
        : await setTaskCompletionAction(selectedTask.id, true);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(`Marked “${selectedTask.title}” complete.`);
      if (!previewMode) router.refresh();
    } catch {
      setError("The task could not be updated. Reload and try again.");
    } finally {
      setTaskPending(false);
    }
  }

  async function handleReschedule(weekNumber: number) {
    if (!selectedTask) return;
    setTaskPending(true);
    setError(null);
    setNotice(null);

    try {
      const result = previewMode
        ? reschedulePreviewTask(selectedTask.id, weekNumber)
        : await rescheduleTaskAction(selectedTask.id, weekNumber);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(
        `Moved “${selectedTask.title}” to week ${weekNumber}. Progress was kept.`,
      );
      if (!previewMode) router.refresh();
    } catch {
      setError("The task could not be moved. Reload and try again.");
    } finally {
      setTaskPending(false);
    }
  }

  if (
    previewMode &&
    (!profileSnapshot.hydrated || !workspaceSnapshot.hydrated)
  ) {
    return <DashboardSkeleton />;
  }

  const headerActions = (
    <>
      <Link
        href="/roadmap"
        className={buttonStyles({ variant: "secondary", size: "sm" })}
      >
        <ListChecks aria-hidden="true" className="size-4" />
        Roadmap
      </Link>
      <Link
        href="/settings#profile"
        className={buttonStyles({ variant: "ghost", size: "sm" })}
      >
        Edit profile
      </Link>
    </>
  );

  if (!assessment) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Daily dashboard"
          title={
            greetingName
              ? `Welcome, ${greetingName}`
              : "Start with evidence, not assumptions"
          }
          description="The first login is a personalized assessment, not a generic dashboard. Nothing is assumed from your degree, and no study time or progress is shown before it is real."
          actions={headerActions}
        />

        {previewMode ? (
          <Alert variant="warning" title="Local preview mode">
            Supabase is not configured, so this assessment and everything after
            it stay in this browser. Accounts and cloud storage turn on after
            setup.
          </Alert>
        ) : null}

        <Card className="panel-highlight overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="flex flex-col p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  Next best step
                </Badge>
                <Badge variant="success">Available now</Badge>
              </div>
              <h2 className="mt-4 text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Take the adaptive skills assessment
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                A short screen across Python, SQL, statistics, data work, and
                software foundations. Incorrect answers surface the underlying
                concept and name the topic to reopen, instead of silently
                lowering a score.
              </p>
              <ul className="mt-5 grid gap-2 text-xs leading-5 text-muted-strong sm:grid-cols-2">
                {[
                  "13 adaptive probes across four technical sections",
                  "Demonstrated score kept separate from confidence",
                  "Interest and working-style signals, not verdicts",
                  "Weekly hours and environment constraints",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-success"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                <Link href="/assessment" className={buttonStyles()}>
                  Start the assessment
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  href={profile ? "/settings#profile" : "/onboarding"}
                  className={buttonStyles({ variant: "ghost" })}
                >
                  {profile ? "Review profile first" : "Complete your profile"}
                </Link>
              </div>
            </div>

            <div className="border-t border-border/70 bg-background/30 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                <Lock aria-hidden="true" className="size-3.5" />
                Why this comes first
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-strong">
                The roadmap, its tasks, and career recommendations must be based
                on demonstrated evidence. Until the assessment is complete, the
                dashboard would only be guessing.
              </p>
              <div className="mt-5 rounded-xl border border-border bg-surface/60 p-3.5 text-xs leading-5 text-muted">
                <p className="flex items-start gap-2">
                  <Info
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-[#b8c3ff]"
                  />
                  {previewMode
                    ? "Preview stores results in this browser only."
                    : "Results are saved to your private account under row-level security."}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-xs leading-5 text-muted">
          No tasks, sessions, or progress are fabricated here. The dashboard
          activates after the assessment produces a skill profile.
        </p>
      </div>
    );
  }

  if (!roadmap) {
    const topGap = assessment.summary.gaps[0] ?? null;
    const topCareer = assessment.summary.careerRecommendations[0] ?? null;

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Daily dashboard"
          title={
            greetingName
              ? `Welcome, ${greetingName}`
              : "Your assessment is saved"
          }
          description="The assessment is complete, but no roadmap uses it yet. Build a plan before expecting a daily objective or study session."
          actions={headerActions}
        />

        {previewMode ? (
          <Alert variant="warning" title="Local preview mode">
            Assessment results and any roadmap you build next are stored in this
            browser only.
          </Alert>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="panel-highlight">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Build your 13-week roadmap</CardTitle>
                <Badge variant="accent">Next best step</Badge>
              </div>
              <CardDescription>
                Turn the assessment into ordered, prerequisite-gated work sized
                to your available hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/40 p-3.5">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Demonstrated score
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {assessment.summary.overall.percent}%
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Confidence average{" "}
                    {assessment.summary.overall.confidenceAverage.toFixed(1)}/5.
                    Kept separate from the score.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/40 p-3.5">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    First gap to address
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {topGap ?? "No blocking gap was detected"}
                  </p>
                  <Link
                    href={`/assessment/results/${assessment.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#b8c3ff] hover:underline"
                  >
                    Full results
                    <ArrowRight aria-hidden="true" className="size-3" />
                  </Link>
                </div>
              </div>

              {topCareer ? (
                <div className="rounded-xl border border-border bg-background/40 p-3.5">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Leading hypothesis
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {topCareer.name}{" "}
                    <span className="font-normal text-muted">
                      ({topCareer.family})
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {topCareer.reasons[0] ?? "Interest signals point here."} This
                    is a hypothesis to test, not a suitability verdict.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/roadmap/new" className={buttonStyles()}>
                  Build the roadmap
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  href="/assessment"
                  className={buttonStyles({ variant: "ghost" })}
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Retake assessment
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Compass aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>Assessment context</CardTitle>
              </div>
              <CardDescription>
                Constraints the generator will respect.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-5 text-muted">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
                <span>Weekly availability</span>
                <span className="font-medium text-muted-strong">
                  {assessment.summary.constraints.weeklyHours} hours
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
                <span>Environment</span>
                <span className="max-w-[60%] text-right font-medium text-muted-strong">
                  {assessment.summary.constraints.environment}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
                <span>Internet</span>
                <span className="max-w-[60%] text-right font-medium text-muted-strong">
                  {assessment.summary.constraints.internet}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Timeline</span>
                <span className="max-w-[60%] text-right font-medium text-muted-strong">
                  {assessment.summary.constraints.timeline}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <EmptyState
          icon={Target}
          title="No daily objective until a plan exists"
          description="Generating a roadmap creates the first unlocked task and sizes it to your weekly hours. Until then there is nothing real to study from."
          action={
            <Link href="/roadmap/new" className={buttonStyles({ size: "sm" })}>
              Choose two career tracks
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
        />
      </div>
    );
  }

  const overallPercent = getRoadmapOverallPercent(roadmap);
  const activeLimitReached = activeSession !== null;
  const selectedPrerequisites = selectedTask
    ? selectedTask.prerequisiteIds
        .map((id) => roadmap.tasks.find((task) => task.id === id) ?? null)
        .filter((task): task is RoadmapTask => task !== null)
    : [];
  const weekRange = weeklyProgress
    ? getPlanWeekRange(roadmap, weeklyProgress.weekNumber)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Daily dashboard · ${formatLongDate()}`}
        title={
          greetingName
            ? `Welcome back, ${greetingName}`
            : "Your honest daily workspace"
        }
        description="One objective at a time, with its learning steps, exercise, knowledge check, and revision. Study time is recorded only when you start and finish a session."
        actions={headerActions}
      />

      {previewMode ? (
        <Alert variant="warning" title="Local preview mode">
          Profile, assessment, roadmap, and sessions are stored in this browser
          only. Nothing here is synced or uploaded.
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" title="That action was not applied">
          {error}
        </Alert>
      ) : null}

      {notice ? (
        <Alert variant="success" title="Saved">
          {notice}
        </Alert>
      ) : null}

      {activeSession ? (
        <ActiveSessionCard
          session={activeSession}
          taskTitle={activeTask?.title ?? null}
          pending={sessionPending}
          onEnd={handleEndSession}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {selectedTask ? (
            <Card className="panel-highlight">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Target
                      aria-hidden="true"
                      className="size-4 text-[#b8c3ff]"
                    />
                    <CardTitle>Today’s objective</CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">Week {selectedTask.weekNumber}</Badge>
                    <Badge variant="muted">
                      {CATEGORY_LABEL[selectedTask.category]}
                    </Badge>
                    <Badge variant="accent">
                      <Clock3 aria-hidden="true" className="size-3" />
                      {formatMinutes(selectedTask.estimatedMinutes)}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {selectedTask.id === nextTask?.id
                    ? "The next unlocked task in your active roadmap."
                    : "A task you selected from this plan."}{" "}
                  Prerequisites are checked before work unlocks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {selectedTask.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted">
                    {selectedTask.description}
                  </p>
                  {selectedPrerequisites.length > 0 ? (
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-muted">
                      <span className="inline-flex items-center gap-1 font-medium text-[#8ef0c7]">
                        <Check aria-hidden="true" className="size-3" />
                        Prerequisites met
                      </span>
                      {selectedPrerequisites.map((task) => (
                        <span key={task.id} className="text-muted">
                          {task.title}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border/70 bg-surface/50 p-4">
                  <TaskPlanDetails resources={selectedTask.resources} />
                </div>

                <div className="space-y-3 border-t border-border/70 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <CirclePlay
                        aria-hidden="true"
                        className="size-4 text-[#b8c3ff]"
                      />
                      Start a study session
                    </p>
                    <span className="text-[0.6875rem] text-muted">
                      Only finished sessions record time
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {SESSION_PRESETS.map((preset) => {
                      const active =
                        sessionChoice.mode === preset.mode &&
                        sessionChoice.minutes === preset.minutes;
                      return (
                        <button
                          key={`${preset.mode}-${preset.minutes}`}
                          type="button"
                          onClick={() =>
                            setSessionChoice({
                              mode: preset.mode,
                              minutes: preset.minutes,
                            })
                          }
                          aria-pressed={active}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-left transition-colors",
                            active
                              ? "border-primary/40 bg-primary/10"
                              : "border-border bg-background/40 hover:border-border-strong",
                          )}
                        >
                          <span className="block text-xs font-medium text-foreground">
                            {preset.label}
                          </span>
                          <span className="mt-0.5 block text-[0.6875rem] text-muted">
                            {formatMinutes(preset.minutes)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleStartSession}
                      disabled={sessionPending || activeLimitReached}
                      title={
                        activeLimitReached
                          ? "Finish or abandon the active session first"
                          : undefined
                      }
                    >
                      <CirclePlay aria-hidden="true" className="size-4" />
                      {sessionPending
                        ? "Starting…"
                        : activeLimitReached
                          ? "Session already active"
                          : "Start session"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCompleteTask}
                      disabled={taskPending}
                    >
                      <CircleCheck aria-hidden="true" className="size-4" />
                      {taskPending ? "Saving…" : "Mark task complete"}
                    </Button>
                  </div>
                  {activeLimitReached ? (
                    <p className="flex items-start gap-2 text-xs leading-5 text-warning">
                      <TriangleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0"
                      />
                      One session at a time. Finish or abandon the active session
                      before starting another.
                    </p>
                  ) : null}
                  <RescheduleControl
                    key={selectedTask.id}
                    task={selectedTask}
                    pending={taskPending}
                    onMove={handleReschedule}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <CircleCheck
                    aria-hidden="true"
                    className="size-5 text-success"
                  />
                  <h2 className="text-lg font-semibold text-foreground">
                    Every task in this plan is complete
                  </h2>
                </div>
                <p className="text-sm leading-6 text-muted">
                  Nothing advances automatically. Review the evidence from the
                  two career experiments, then choose a specialization and the
                  next plan.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/roadmap" className={buttonStyles({ size: "sm" })}>
                    Review the roadmap
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                  <Link
                    href="/roadmap/new"
                    className={buttonStyles({ variant: "ghost", size: "sm" })}
                  >
                    Plan the next 13 weeks
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flag aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                  <CardTitle>This week</CardTitle>
                </div>
                {weeklyProgress ? (
                  <Badge variant="outline">
                    Week {weeklyProgress.weekNumber}
                  </Badge>
                ) : null}
              </div>
              <CardDescription>
                {weekRange
                  ? `${weekRange.weekStart.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })} – ${new Date(
                      weekRange.weekEnd.getTime() - 86400000,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}. Targets come from your plan; recorded time comes only from finished sessions.`
                  : "Weekly progress appears when a plan is active."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyProgress ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {formatMinutes(weeklyProgress.recordedMinutes)}
                        <span className="ml-1 text-sm font-normal text-muted">
                          / {formatMinutes(weeklyProgress.weeklyTargetMinutes)}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {weeklyProgress.completedTasks.length} of{" "}
                        {weeklyProgress.scheduledTasks.length} scheduled tasks
                        complete this week
                      </p>
                    </div>
                    <Badge variant="muted">
                      {weeklyProgress.completedSessionCount} finished session
                      {weeklyProgress.completedSessionCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      weeklyProgress.weeklyTargetMinutes > 0
                        ? (weeklyProgress.recordedMinutes /
                            weeklyProgress.weeklyTargetMinutes) *
                          100
                        : 0
                    }
                    label="Recorded study time against this week's target"
                  />
                  <div className="grid gap-2 text-xs text-muted sm:grid-cols-2">
                    <p>
                      Scheduled task time:{" "}
                      <span className="font-medium text-muted-strong">
                        {formatMinutes(weeklyProgress.scheduledMinutes)}
                      </span>
                    </p>
                    <p>
                      Total recorded so far:{" "}
                      <span className="font-medium text-muted-strong">
                        {formatMinutes(recordedMinutes)}
                      </span>
                    </p>
                  </div>
                  {weeklyProgress.recordedMinutes === 0 ? (
                    <p className="text-xs leading-5 text-muted">
                      No finished sessions this week yet. Numbers stay at zero
                      until you actually complete one.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Overall roadmap</CardTitle>
                <Badge variant="accent">{overallPercent}%</Badge>
              </div>
              <CardDescription>
                {roadmap.summary.totalWeeks} weeks ·{" "}
                {roadmap.summary.weeklyHours} h/week ·{" "}
                {formatMinutes(roadmap.summary.totalMinutes)} planned
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={overallPercent} label="Roadmap tasks completed" />
              <p className="text-xs leading-5 text-muted">
                Task completion and recorded study time are separate measures.
                Neither one promises readiness or employment.
              </p>
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#b8c3ff] hover:underline"
              >
                Open the full roadmap
                <ArrowRight aria-hidden="true" className="size-3" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ListChecks
                  aria-hidden="true"
                  className="size-4 text-[#b8c3ff]"
                />
                <CardTitle>Next unlocked tasks</CardTitle>
              </div>
              <CardDescription>
                Choose one to make it today’s objective. Locked work is not
                listed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length > 0 ? (
                <ul className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className="w-full rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:border-border-strong"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {task.title}
                          </span>
                          <ArrowRight
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted"
                          />
                        </div>
                        <p className="mt-1 text-[0.6875rem] text-muted">
                          Week {task.weekNumber} ·{" "}
                          {formatMinutes(task.estimatedMinutes)} ·{" "}
                          {CATEGORY_LABEL[task.category]}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-5 text-muted">
                  No other unlocked task is waiting. Finish the current one to
                  open the next prerequisite-gated task.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Compass aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>Starting evidence</CardTitle>
              </div>
              <CardDescription>
                The assessment behind this plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Demonstrated score</span>
                <Badge variant="outline">
                  {assessment.summary.overall.percent}%
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Confidence average</span>
                <Badge variant="muted">
                  {assessment.summary.overall.confidenceAverage.toFixed(1)} / 5
                </Badge>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Evidence note
                </p>
                <p className="mt-1 text-muted">
                  {assessment.summary.disclaimer}
                </p>
              </div>
              <Link
                href={`/assessment/results/${assessment.id}`}
                className="inline-flex items-center gap-1.5 font-medium text-[#b8c3ff] hover:underline"
              >
                Review the full results
                <ArrowRight aria-hidden="true" className="size-3" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Recent sessions</CardTitle>
                <Badge variant="muted">
                  {formatMinutes(recordedMinutes)} recorded
                </Badge>
              </div>
              <CardDescription>
                Abandoned sessions stay visible but are never counted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <ul className="space-y-2.5">
                  {recentSessions.map((session) => {
                    const task = roadmap.tasks.find(
                      (entry) => entry.id === session.taskId,
                    );
                    const completed = session.status === "completed";
                    return (
                      <li
                        key={session.id}
                        className="border-b border-border/60 pb-2.5 text-xs last:border-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate font-medium text-muted-strong">
                            {task?.title ?? "General study"}
                          </span>
                          <Badge
                            variant={completed ? "success" : "warning"}
                            className="shrink-0"
                          >
                            {completed
                              ? `${session.actualMinutes ?? 0} min`
                              : "Not counted"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-muted">
                          {new Date(session.startedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            },
                          )}{" "}
                          · {getSessionModeLabel(session.mode)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs leading-5 text-muted">
                  No sessions yet. Start one when you actually sit down to study
                  — nothing is recorded before that.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
