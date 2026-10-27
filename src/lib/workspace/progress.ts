import type { AssessmentRecord } from "@/lib/assessment/types";
import {
  ROADMAP_TOTAL_WEEKS,
  type LearningRoadmap,
  type RoadmapTask,
  type TaskLockState,
  type WeeklyProgress,
} from "@/lib/roadmap/types";
import type {
  LearningSessionRecord,
  SessionSummary,
} from "@/lib/sessions/types";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStartDate(roadmap: LearningRoadmap) {
  return parseDate(`${roadmap.startDate}T00:00:00.000Z`) ?? new Date(0);
}

export function getLatestAssessment(
  assessments: readonly AssessmentRecord[],
): AssessmentRecord | null {
  return (
    assessments
      .slice()
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() -
          new Date(a.completedAt).getTime(),
      )[0] ?? null
  );
}

export function getAssessmentById(
  assessments: readonly AssessmentRecord[],
  id: string,
) {
  return assessments.find((assessment) => assessment.id === id) ?? null;
}

export function getActiveRoadmap(
  roadmaps: readonly LearningRoadmap[],
): LearningRoadmap | null {
  return (
    roadmaps
      .filter((roadmap) => roadmap.status === "active")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
  );
}

export function getRoadmapById(
  roadmaps: readonly LearningRoadmap[],
  id: string,
) {
  return roadmaps.find((roadmap) => roadmap.id === id) ?? null;
}

export function getTaskLockState(
  task: RoadmapTask,
  roadmap: LearningRoadmap,
): TaskLockState {
  const tasksById = new Map(roadmap.tasks.map((entry) => [entry.id, entry]));
  const unmetPrerequisites: RoadmapTask[] = [];
  let hasMissingPrerequisite = false;

  for (const prerequisiteId of task.prerequisiteIds) {
    const prerequisite = tasksById.get(prerequisiteId);
    if (!prerequisite) {
      hasMissingPrerequisite = true;
      continue;
    }
    if (prerequisite.status !== "completed") {
      unmetPrerequisites.push(prerequisite);
    }
  }

  return {
    locked: unmetPrerequisites.length > 0 || hasMissingPrerequisite,
    unmetPrerequisites,
  };
}

export function sortRoadmapTasks(tasks: readonly RoadmapTask[]) {
  return tasks
    .slice()
    .sort(
      (a, b) =>
        a.weekNumber - b.weekNumber || a.orderIndex - b.orderIndex,
    );
}

export function getNextTask(roadmap: LearningRoadmap): RoadmapTask | null {
  const tasks = sortRoadmapTasks(roadmap.tasks).filter(
    (task) => task.status !== "completed" && task.status !== "skipped",
  );
  const inProgress = tasks.find((task) => task.status === "in_progress");
  if (inProgress && !getTaskLockState(inProgress, roadmap).locked) {
    return inProgress;
  }

  return (
    tasks.find((task) => !getTaskLockState(task, roadmap).locked) ?? null
  );
}

export function getUpcomingTasks(
  roadmap: LearningRoadmap,
  limit = 3,
  excludeTaskId?: string,
) {
  const unlocked = sortRoadmapTasks(roadmap.tasks).filter(
    (task) =>
      task.id !== excludeTaskId &&
      task.status !== "completed" &&
      task.status !== "skipped" &&
      !getTaskLockState(task, roadmap).locked,
  );

  return unlocked.slice(0, limit);
}

export function getCurrentPlanWeek(
  roadmap: LearningRoadmap,
  now: Date = new Date(),
) {
  const start = getStartDate(roadmap);
  const elapsed = now.getTime() - start.getTime();
  if (elapsed < 0) return 1;
  const week = Math.floor(elapsed / WEEK_MS) + 1;
  return Math.min(ROADMAP_TOTAL_WEEKS, Math.max(1, week));
}

export function getPlanWeekRange(
  roadmap: LearningRoadmap,
  weekNumber: number,
) {
  const start = getStartDate(roadmap);
  const weekStart = new Date(
    start.getTime() + (weekNumber - 1) * WEEK_MS,
  );
  const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
  return { weekStart, weekEnd };
}

export function getRecordedMinutesForRange(
  sessions: readonly LearningSessionRecord[],
  start: Date,
  endExclusive: Date,
) {
  return sessions
    .filter((session) => {
      if (session.status !== "completed") return false;
      const startedAt = parseDate(session.startedAt);
      return (
        startedAt !== null &&
        startedAt.getTime() >= start.getTime() &&
        startedAt.getTime() < endExclusive.getTime()
      );
    })
    .reduce((sum, session) => sum + (session.actualMinutes ?? 0), 0);
}

export function getWeeklyProgress(
  roadmap: LearningRoadmap,
  sessions: readonly LearningSessionRecord[],
  now: Date = new Date(),
): WeeklyProgress {
  const weekNumber = getCurrentPlanWeek(roadmap, now);
  const { weekStart, weekEnd } = getPlanWeekRange(roadmap, weekNumber);
  const scheduledTasks = sortRoadmapTasks(
    roadmap.tasks.filter((task) => task.weekNumber === weekNumber),
  );
  const completedTasks = scheduledTasks.filter(
    (task) => task.status === "completed",
  );
  const weeklySessions = sessions.filter((session) => {
    if (session.status !== "completed") return false;
    const startedAt = parseDate(session.startedAt);
    return (
      startedAt !== null &&
      startedAt.getTime() >= weekStart.getTime() &&
      startedAt.getTime() < weekEnd.getTime()
    );
  });

  return {
    weekNumber,
    weekStart,
    weekEnd,
    scheduledTasks,
    completedTasks,
    scheduledMinutes: scheduledTasks.reduce(
      (sum, task) => sum + task.estimatedMinutes,
      0,
    ),
    recordedMinutes: weeklySessions.reduce(
      (sum, session) => sum + (session.actualMinutes ?? 0),
      0,
    ),
    weeklyTargetMinutes: roadmap.summary.weeklyHours * 60,
    completedSessionCount: weeklySessions.length,
  };
}

export function getCalendarWeekRange(now: Date = new Date()) {
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
  const day = start.getUTCDay();
  const offset = (day + 6) % 7;
  start.setUTCDate(start.getUTCDate() - offset);
  return {
    weekStart: start,
    weekEnd: new Date(start.getTime() + WEEK_MS),
  };
}

export function getSessionSummary(
  sessions: readonly LearningSessionRecord[],
  now: Date = new Date(),
): SessionSummary {
  const completed = sessions.filter(
    (session) => session.status === "completed",
  );
  const active =
    sessions.find((session) => session.status === "active") ?? null;
  const { weekStart, weekEnd } = getCalendarWeekRange(now);
  const weekSessions = completed.filter((session) => {
    const startedAt = parseDate(session.startedAt);
    return (
      startedAt !== null &&
      startedAt.getTime() >= weekStart.getTime() &&
      startedAt.getTime() < weekEnd.getTime()
    );
  });

  return {
    active,
    sessions: sessions
      .slice()
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() -
          new Date(a.startedAt).getTime(),
      ),
    totalRecordedMinutes: completed.reduce(
      (sum, session) => sum + (session.actualMinutes ?? 0),
      0,
    ),
    weekRecordedMinutes: weekSessions.reduce(
      (sum, session) => sum + (session.actualMinutes ?? 0),
      0,
    ),
    weekSessionCount: weekSessions.length,
  };
}

export function getTaskCompletionPercent(tasks: readonly RoadmapTask[]) {
  const completable = tasks.filter((task) => task.status !== "skipped");
  if (completable.length === 0) return 0;
  return Math.round(
    (completable.filter((task) => task.status === "completed").length /
      completable.length) *
      100,
  );
}

export function getRoadmapOverallPercent(roadmap: LearningRoadmap) {
  return getTaskCompletionPercent(roadmap.tasks);
}

export function getWorkspaceCounts(workspace: WorkspaceSnapshot) {
  const activeRoadmap = getActiveRoadmap(workspace.roadmaps);
  return {
    assessmentCount: workspace.assessments.length,
    roadmapCount: workspace.roadmaps.length,
    sessionCount: workspace.sessions.filter(
      (session) => session.status === "completed",
    ).length,
    activeRoadmap,
  };
}
