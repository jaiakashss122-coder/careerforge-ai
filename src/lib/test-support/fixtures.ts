import type {
  AssessmentRecord,
  AssessmentSummary,
  CareerRecommendation,
  SectionResult,
  SkillResult,
  StoredAnswer,
  TechnicalSection,
} from "@/lib/assessment/types";
import type { CareerTrackSlug } from "@/lib/career/tracks";
import type {
  CareerExperimentRecord,
  CareerExperimentReflection,
} from "@/lib/career/types";
import type { SkillEvidenceRecord } from "@/lib/evidence/types";
import type {
  ProjectMilestoneRecord,
  ProjectRecord,
} from "@/lib/projects/types";
import {
  ROADMAP_TOTAL_WEEKS,
  type LearningRoadmap,
  type RoadmapTask,
} from "@/lib/roadmap/types";
import type { LearningSessionRecord } from "@/lib/sessions/types";

export function emptySummary(
  overrides: Partial<AssessmentSummary> = {},
): AssessmentSummary {
  return {
    version: 1,
    sections: [],
    overall: {
      score: 0,
      maxScore: 0,
      percent: 0,
      confidenceAverage: 3,
      confidenceMismatch: null,
    },
    strengths: [],
    gaps: [],
    applicationGaps: [],
    confidenceNotes: [],
    careerSignals: [],
    careerStyle: { value: "code", label: "Building software" },
    careerActivity: { value: "build-app", label: "Build an app" },
    careerRecommendations: [],
    constraints: {
      weeklyHours: 10,
      environment: "Laptop with VS Code",
      internet: "Stable",
      timeline: "13 weeks",
    },
    profileTarget: null,
    disclaimer: "Synthetic test summary. Not evidence of anything.",
    ...overrides,
  };
}

export function recommendation(
  slug: CareerTrackSlug,
  fitScore: number,
  name: string = slug,
): CareerRecommendation {
  return {
    slug,
    name,
    family: "Analytics",
    fitScore,
    reasons: ["Synthetic test reason"],
    experiment: "Synthetic test experiment",
  };
}

export function assessmentRecord({
  id,
  completedAt,
  answers = [],
  summary = emptySummary(),
}: {
  id: string;
  completedAt: string;
  answers?: StoredAnswer[];
  summary?: AssessmentSummary;
}): AssessmentRecord {
  return {
    id,
    type: "initial",
    overallScore: 0,
    maxScore: 0,
    confidenceAverage: 3,
    summary,
    answers,
    startedAt: completedAt,
    completedAt,
    createdAt: completedAt,
  };
}

export function makeStoredAnswer(
  input: Partial<StoredAnswer> & { questionKey: string },
): StoredAnswer {
  return {
    section: "programming",
    questionType: "multiple_choice",
    promptText: `Question ${input.questionKey}`,
    responseValue: "option-a",
    responseLabel: "Option a",
    isCorrect: true,
    score: 1,
    maxScore: 1,
    selfConfidence: null,
    concept: null,
    feedback: null,
    remedialLessonSlug: null,
    ...input,
  };
}

export function makeEvidenceRecord(
  input: Partial<SkillEvidenceRecord> & { skillSlug: string },
): SkillEvidenceRecord {
  return {
    id: `evidence-${input.skillSlug}-${input.sourceType ?? "project"}`,
    sourceType: "project",
    sourceId: null,
    evidenceLevel: "project_evidence",
    score: null,
    verified: false,
    notes: "Synthetic test evidence.",
    createdAt: "2026-11-05T10:00:00.000Z",
    ...input,
  };
}

export function makeTask(
  input: Partial<RoadmapTask> & { id: string },
): RoadmapTask {
  return {
    weekNumber: 1,
    orderIndex: 0,
    title: input.id,
    description: `Task ${input.id}`,
    category: "learning",
    estimatedMinutes: 60,
    status: "pending",
    skillSlug: null,
    prerequisiteIds: [],
    completedAt: null,
    resources: {
      sessionPlan: {
        learn: ["Synthetic learn item"],
        exercise: "Synthetic exercise instructions for the test task.",
        check: [{ question: "Question?", answer: "Answer." }],
        revision: "Synthetic revision step.",
      },
      links: [],
    },
    ...input,
  };
}

export function makeRoadmap(
  tasks: RoadmapTask[],
  overrides: Partial<LearningRoadmap> = {},
): LearningRoadmap {
  return {
    id: "roadmap-test",
    title: "Synthetic test roadmap",
    status: "active",
    startDate: "2026-11-02",
    endDate: "2027-01-31",
    focusTracks: ["data-analyst", "data-scientist"],
    source: "assessment",
    summary: {
      version: 1,
      assessmentId: "assessment-test",
      weeklyHours: 10,
      totalMinutes: tasks.reduce(
        (sum, task) => sum + task.estimatedMinutes,
        0,
      ),
      totalWeeks: ROADMAP_TOTAL_WEEKS,
      overallPercent: 0,
      strengths: [],
      gaps: [],
      careerRecommendations: [],
      constraints: {
        weeklyHours: 10,
        environment: "Laptop",
        internet: "Stable",
        timeline: "13 weeks",
      },
      constraintNotes: [],
      thirtyDayPlan: [],
      weeks: Array.from({ length: ROADMAP_TOTAL_WEEKS }, (_, index) => ({
        week: index + 1,
        title: `Week ${index + 1}`,
        summary: `Synthetic week ${index + 1}.`,
      })),
      generatedAt: "2026-11-01T12:00:00.000Z",
      disclaimer: "Synthetic test plan.",
    },
    tasks,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    ...overrides,
  };
}

export function makeSession(
  input: Partial<LearningSessionRecord> & {
    id: string;
    startedAt: string;
    status: LearningSessionRecord["status"];
  },
): LearningSessionRecord {
  return {
    taskId: null,
    mode: "focused",
    plannedMinutes: 45,
    actualMinutes: null,
    endedAt: null,
    notes: "",
    createdAt: input.startedAt,
    ...input,
  };
}

export function makeSkillResult(
  input: Partial<SkillResult> & { skillSlug: string },
): SkillResult {
  return {
    skillName: input.skillSlug,
    section: "programming",
    concept: `Concept for ${input.skillSlug}`,
    level: "basic",
    score: 2,
    maxScore: 3,
    percent: 67,
    confidence: 3,
    confidenceMismatch: null,
    feedback: [],
    missedConcepts: [],
    remedial: null,
    ...input,
  };
}

export function makeSection(
  section: TechnicalSection,
  skills: SkillResult[],
): SectionResult {
  const score = skills.reduce((sum, skill) => sum + skill.score, 0);
  const maxScore = skills.reduce((sum, skill) => sum + skill.maxScore, 0);

  return {
    section,
    label: section,
    score,
    maxScore,
    percent: maxScore === 0 ? 0 : Math.round((score / maxScore) * 100),
    confidence: 3,
    confidenceMismatch: null,
    skills,
  };
}

export function makeProject(
  input: Partial<ProjectRecord> & { id: string },
): ProjectRecord {
  return {
    templateSlug: null,
    title: input.id,
    problemStatement: "Synthetic test problem statement.",
    status: "planned",
    repoUrl: null,
    deploymentUrl: null,
    selfAssessment: null,
    milestones: [],
    startedAt: null,
    completedAt: null,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    ...input,
  };
}

export function makeMilestone(
  input: Partial<ProjectMilestoneRecord> & { id: string },
): ProjectMilestoneRecord {
  return {
    templateKey: input.id,
    title: input.id,
    description: `Milestone ${input.id}`,
    orderIndex: 0,
    status: "pending",
    evidenceUrl: null,
    completedAt: null,
    createdAt: "2026-11-01T12:00:00.000Z",
    ...input,
  };
}

export function makeReflection(
  overrides: Partial<CareerExperimentReflection> = {},
): CareerExperimentReflection {
  return {
    interest: 3,
    difficulty: 3,
    enjoyment: 3,
    willingness: 3,
    ...overrides,
  };
}

export function makeCareerExperiment(
  input: Partial<CareerExperimentRecord> & {
    id: string;
    careerSlug: CareerTrackSlug;
  },
): CareerExperimentRecord {
  return {
    title: `Experiment for ${input.careerSlug}`,
    brief: "Synthetic test brief.",
    status: "completed",
    reflection: makeReflection(),
    reflectionText: "Synthetic reflection.",
    outputUrl: "https://example.com/work-produced",
    startedAt: "2026-11-01T10:00:00.000Z",
    completedAt: "2026-11-01T11:00:00.000Z",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T11:00:00.000Z",
    ...input,
  };
}

export class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}
