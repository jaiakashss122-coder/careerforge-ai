import type { DemonstratedLevel } from "@/lib/assessment/types";
import type { EvidenceLevel, EvidenceSourceType } from "@/lib/evidence/types";
import type { SkillCategory } from "@/lib/skills/catalog";

export const ASSESSMENT_LANE_LABELS: Record<EvidenceSourceType, string> = {
  assessment: "Assessment screen",
  lesson: "Lesson completion",
  quiz: "Quiz attempt",
  project: "Submitted project work",
  interview: "Interview practice",
  self_report: "Self-report",
};

export const EVIDENCE_LANE_ORDER: EvidenceLevel[] = [
  "exposure",
  "guided_practice",
  "independent_practice",
  "project_evidence",
  "interview_evidence",
];

export type SkillProficiency = {
  skillSlug: string;
  skillName: string;
  demonstratedLevel: DemonstratedLevel | null;
  demonstratedPercent: number | null;
  evidenceSources: EvidenceSourceType[];
  confidence: number | null;
  confidenceMismatch: "overconfident" | "underconfident" | null;
  completedPracticeTasks: number;
  completedProjects: number;
  explanation: string;
};

export type CategoryProficiency = {
  category: SkillCategory;
  label: string;
  summaryPercent: number | null;
  skills: SkillProficiency[];
  explanation: string;
  strongestSkill: SkillProficiency | null;
  weakestSkill: SkillProficiency | null;
};

export type RepeatedMistake = {
  concept: string;
  missCount: number;
  missedInAttempts: number;
  questionCount: number;
  firstMissedAt: string;
  lastMissedAt: string;
  explanation: string;
};

export type RevisionBacklogItem = {
  skillSlug: string | null;
  lessonSlug: string | null;
  title: string;
  reason: string;
  href: string;
};

export type LearningActivity = {
  learningTasksCompleted: number;
  practiceTasksCompleted: number;
  projectTasksCompleted: number;
  assessmentAttempts: number;
  questionAccuracy: { correct: number; total: number; percent: number | null };
  explanation: string;
  repeatedMistakes: RepeatedMistake[];
  revisionBacklog: RevisionBacklogItem[];
};

export type EvidenceLaneSummary = {
  sourceType: EvidenceSourceType;
  label: string;
  count: number;
  skillCount: number;
  verifiedCount: number;
  note: string;
};

export type StudyTimeSummary = {
  totalRecordedMinutes: number;
  weekRecordedMinutes: number;
  completedSessionCount: number;
  startedSessionCount: number;
  abandonedSessionCount: number;
  explanation: string;
};

export type WeeklyConsistency = {
  weeksElapsed: number;
  weeksBasis: "plan" | "calendar";
  activeWeeks: number;
  consecutiveActiveWeeks: number;
  activeWeekNumbers: number[];
  note: string;
};

export type RoadmapProgressSummary = {
  overallPercent: number;
  completedTaskCount: number;
  remainingTaskCount: number;
  currentWeek: number | null;
  currentWeekTitle: string | null;
  explanation: string;
};

export type NextActionKind =
  "assessment" | "roadmap_task" | "session" | "project" | "revision";

export type NextAction = {
  kind: NextActionKind;
  title: string;
  why: string;
  detail: string;
  href: string;
  ctaLabel: string;
  priority: number;
};

export type ProgressAnalytics = {
  generatedAt: string;
  categories: CategoryProficiency[];
  learningActivity: LearningActivity;
  evidenceLanes: EvidenceLaneSummary[];
  studyTime: StudyTimeSummary;
  consistency: WeeklyConsistency;
  roadmapProgress: RoadmapProgressSummary;
  projectSummary: {
    startedCount: number;
    completedCount: number;
    evidenceCount: number;
    explanation: string;
  };
  nextAction: NextAction;
  disclaimers: string[];
};
