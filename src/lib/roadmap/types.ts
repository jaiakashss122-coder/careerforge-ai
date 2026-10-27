import type { CareerTrackSlug } from "@/lib/career/tracks";
import type {
  AssessmentConstraints,
  CareerRecommendation,
} from "@/lib/assessment/types";

export const ROADMAP_TOTAL_WEEKS = 13;
export const ROADMAP_DEFAULT_WEEKLY_HOURS = 10;

export const ROADMAP_TASK_CATEGORIES = [
  "learning",
  "practice",
  "project",
  "experiment",
  "review",
  "checkpoint",
] as const;

export type RoadmapTaskCategory =
  (typeof ROADMAP_TASK_CATEGORIES)[number];

export type RoadmapTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped"
  | "rescheduled";

export type RoadmapTaskFocus = "foundation" | "standard" | "refresh";

export type RoadmapLinkKind = "docs" | "practice" | "reference";

export type RoadmapLink = {
  label: string;
  href: string;
  kind: RoadmapLinkKind;
};

export type RoadmapCheckQuestion = {
  question: string;
  answer: string;
};

export type RoadmapSessionPlan = {
  learn: string[];
  exercise: string;
  check: RoadmapCheckQuestion[];
  revision: string;
};

export type RoadmapResources = {
  sessionPlan: RoadmapSessionPlan;
  links: RoadmapLink[];
  focus?: RoadmapTaskFocus;
  assessmentGap?: string;
};

export type RoadmapTask = {
  id: string;
  weekNumber: number;
  orderIndex: number;
  title: string;
  description: string;
  category: RoadmapTaskCategory;
  estimatedMinutes: number;
  status: RoadmapTaskStatus;
  skillSlug: string | null;
  prerequisiteIds: string[];
  resources: RoadmapResources;
  completedAt: string | null;
};

export type ThirtyDayPlanItem = {
  week: number;
  title: string;
  delayLabel: string;
  minutes: number;
};

export type RoadmapWeekMeta = {
  week: number;
  title: string;
  summary: string;
};

export type RoadmapSummary = {
  version: 1;
  assessmentId: string;
  weeklyHours: number;
  totalMinutes: number;
  totalWeeks: number;
  overallPercent: number;
  strengths: string[];
  gaps: string[];
  careerRecommendations: CareerRecommendation[];
  constraints: AssessmentConstraints;
  constraintNotes: string[];
  thirtyDayPlan: ThirtyDayPlanItem[];
  weeks: RoadmapWeekMeta[];
  generatedAt: string;
  disclaimer: string;
};

export type LearningRoadmap = {
  id: string;
  title: string;
  status: "draft" | "active" | "completed" | "archived";
  startDate: string;
  endDate: string;
  focusTracks: CareerTrackSlug[];
  source: "assessment" | "manual" | "checkpoint";
  summary: RoadmapSummary;
  tasks: RoadmapTask[];
  createdAt: string;
  updatedAt: string;
};

export type TaskLockState = {
  locked: boolean;
  unmetPrerequisites: RoadmapTask[];
};

export type WeeklyProgress = {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  scheduledTasks: RoadmapTask[];
  completedTasks: RoadmapTask[];
  scheduledMinutes: number;
  recordedMinutes: number;
  weeklyTargetMinutes: number;
  completedSessionCount: number;
};

export function isRoadmapTaskCategory(
  value: string,
): value is RoadmapTaskCategory {
  return ROADMAP_TASK_CATEGORIES.includes(value as RoadmapTaskCategory);
}
