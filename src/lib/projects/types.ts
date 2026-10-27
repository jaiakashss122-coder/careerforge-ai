import type { CareerTrackSlug } from "@/lib/career/tracks";

export const PROJECT_LEVELS = [
  "foundation",
  "core",
  "applied",
  "advanced",
] as const;

export type ProjectLevel = (typeof PROJECT_LEVELS)[number];

export const PROJECT_LEVEL_META: Record<
  ProjectLevel,
  { label: string; description: string }
> = {
  foundation: {
    label: "Foundation",
    description:
      "First portfolio work. Small scope, one dataset, one clear question.",
  },
  core: {
    label: "Core",
    description:
      "Full analysis or modelling cycle with evaluation you can defend.",
  },
  applied: {
    label: "Applied",
    description:
      "Software around the analysis: an interface, tests, and deployment.",
  },
  advanced: {
    label: "Advanced",
    description:
      "Systems work with reliability concerns, monitoring, and trade-offs.",
  },
};

export const PROJECT_STATUS_VALUES = [
  "planned",
  "in_progress",
  "completed",
  "paused",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  paused: "Paused",
};

export const MILESTONE_STATUS_VALUES = [
  "pending",
  "in_progress",
  "completed",
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUS_VALUES)[number];

export type ProjectMilestoneTemplate = {
  key: string;
  title: string;
  description: string;
  evidenceHint: string;
  estimatedMinutes: number;
};

export type ProjectDatasetGuidance = {
  source: string;
  note: string;
  alternatives: readonly string[];
};

export type ProjectTemplate = {
  slug: string;
  title: string;
  level: ProjectLevel;
  summary: string;
  motivation: string;
  problemStatement: string;
  trackSlugs: readonly CareerTrackSlug[];
  prerequisiteSkillSlugs: readonly string[];
  requiresCompletedProjects: number;
  skillSlugs: readonly string[];
  estimatedHours: number;
  datasetGuidance: ProjectDatasetGuidance;
  milestones: readonly ProjectMilestoneTemplate[];
  folderStructure: readonly string[];
  testingChecklist: readonly string[];
  metrics: readonly string[];
  interviewQuestions: readonly string[];
  portfolioChecklist: readonly string[];
};

export const PROJECT_RUBRIC = [
  {
    key: "problem-framing",
    label: "Problem framing",
    description:
      "The question, scope, and success criteria are stated before the analysis.",
  },
  {
    key: "data-handling",
    label: "Data handling",
    description:
      "Data sources, cleaning decisions, and known limitations are documented.",
  },
  {
    key: "correctness",
    label: "Correctness",
    description:
      "Results are reproducible and the method matches the question asked.",
  },
  {
    key: "code-quality",
    label: "Code quality",
    description:
      "The repository is organised, readable, and runnable by someone else.",
  },
  {
    key: "testing",
    label: "Testing",
    description:
      "Automated checks cover the parts most likely to break silently.",
  },
  {
    key: "communication",
    label: "Communication",
    description:
      "The README explains the result, the limits, and what you would do next.",
  },
] as const;

export type ProjectRubricKey = (typeof PROJECT_RUBRIC)[number]["key"];

export const RUBRIC_SCALE = [
  { value: 0, label: "Not started" },
  { value: 1, label: "Attempted" },
  { value: 2, label: "Solid" },
  { value: 3, label: "Strong" },
] as const;

export const RUBRIC_MAX_SCORE = 3;

export type ProjectSelfAssessment = {
  version: 1;
  scores: Partial<Record<ProjectRubricKey, number>>;
  reflection: string;
  updatedAt: string;
};

export type ProjectMilestoneRecord = {
  id: string;
  templateKey: string | null;
  title: string;
  description: string;
  orderIndex: number;
  status: MilestoneStatus;
  evidenceUrl: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  templateSlug: string | null;
  title: string;
  problemStatement: string;
  status: ProjectStatus;
  repoUrl: string | null;
  deploymentUrl: string | null;
  selfAssessment: ProjectSelfAssessment | null;
  milestones: ProjectMilestoneRecord[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PrerequisiteCheck = {
  skillSlug: string;
  skillName: string;
  met: boolean;
  reason: string;
};

export type ProjectReadiness = {
  templateSlug: string;
  locked: boolean;
  prerequisites: PrerequisiteCheck[];
  unmetPrerequisites: PrerequisiteCheck[];
  completedProjectsRequired: number;
  completedProjectsCount: number;
  lockReasons: string[];
  timeFit: {
    weeklyHours: number;
    estimatedHours: number;
    estimatedWeeks: number;
    comfortable: boolean;
    note: string;
  };
};

export type ProjectRecommendation = {
  templateSlug: string;
  fitScore: number;
  reasons: string[];
  readiness: ProjectReadiness;
};

export type ProjectEvidenceDraft = {
  skillSlug: string;
  sourceType: "project";
  evidenceLevel: "project_evidence";
  score: number | null;
  verified: false;
  notes: string;
};

export type ProjectCompletionCheck = {
  eligible: boolean;
  blockers: string[];
};

export const PROJECT_EVIDENCE_DISCLAIMER =
  "Project evidence is recorded only after you mark every milestone complete and link a repository. It is self-submitted and stored as unverified: it shows you did the work, not that an external reviewer graded it.";

export const PROJECT_RUBRIC_DISCLAIMER =
  "Rubric scores are your own assessment of your work. They are stored separately from assessment results and are never counted as a verified skill measurement.";

export function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUS_VALUES.includes(value as ProjectStatus);
}

export function isMilestoneStatus(value: string): value is MilestoneStatus {
  return MILESTONE_STATUS_VALUES.includes(value as MilestoneStatus);
}

export function isProjectLevel(value: string): value is ProjectLevel {
  return PROJECT_LEVELS.includes(value as ProjectLevel);
}

export function isProjectRubricKey(value: string): value is ProjectRubricKey {
  return PROJECT_RUBRIC.some((criterion) => criterion.key === value);
}
