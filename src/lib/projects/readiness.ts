import type { CareerTrackSlug } from "@/lib/career/tracks";
import type {
  AssessmentSummary,
  DemonstratedLevel,
} from "@/lib/assessment/types";
import type { LearningRoadmap } from "@/lib/roadmap/types";
import { getSkillName } from "@/lib/skills/catalog";
import { PROJECT_TEMPLATES, getProjectTemplate } from "./templates";
import {
  PROJECT_RUBRIC,
  RUBRIC_MAX_SCORE,
  type PrerequisiteCheck,
  type ProjectCompletionCheck,
  type ProjectEvidenceDraft,
  type ProjectReadiness,
  type ProjectRecommendation,
  type ProjectRecord,
  type ProjectSelfAssessment,
  type ProjectTemplate,
} from "./types";

export const PREREQUISITE_PERCENT_THRESHOLD = 60;

export type ProjectSkillSignal = {
  assessmentPercent: number | null;
  assessmentLevel: DemonstratedLevel | null;
  completedPracticeTasks: number;
  completedProjects: number;
};

export type ProjectReadinessContext = {
  signals: Record<string, ProjectSkillSignal>;
  completedProjectCount: number;
  startedTemplateSlugs: readonly string[];
  weeklyHours: number;
  gapSkillSlugs: readonly string[];
  trackSlugs: readonly CareerTrackSlug[];
};

function emptySignal(): ProjectSkillSignal {
  return {
    assessmentPercent: null,
    assessmentLevel: null,
    completedPracticeTasks: 0,
    completedProjects: 0,
  };
}

export function buildReadinessContext(input: {
  assessment: AssessmentSummary | null;
  roadmap: LearningRoadmap | null;
  projects: readonly ProjectRecord[];
  weeklyHours: number;
}): ProjectReadinessContext {
  const signals: Record<string, ProjectSkillSignal> = {};
  const gapSkillSlugs: string[] = [];

  const ensure = (slug: string) => {
    signals[slug] ??= emptySignal();
    return signals[slug];
  };

  for (const section of input.assessment?.sections ?? []) {
    for (const skill of section.skills) {
      const signal = ensure(skill.skillSlug);
      signal.assessmentPercent = skill.percent;
      signal.assessmentLevel = skill.level;

      if (skill.level === "none" || skill.level === "foundational") {
        gapSkillSlugs.push(skill.skillSlug);
      }
    }
  }

  for (const task of input.roadmap?.tasks ?? []) {
    if (task.status !== "completed" || !task.skillSlug) {
      continue;
    }

    ensure(task.skillSlug).completedPracticeTasks += 1;
  }

  const startedTemplateSlugs: string[] = [];
  let completedProjectCount = 0;

  for (const project of input.projects) {
    if (project.templateSlug) {
      startedTemplateSlugs.push(project.templateSlug);
    }

    if (project.status !== "completed") {
      continue;
    }

    completedProjectCount += 1;

    const template = getProjectTemplate(project.templateSlug);
    for (const slug of template?.skillSlugs ?? []) {
      ensure(slug).completedProjects += 1;
    }
  }

  return {
    signals,
    completedProjectCount,
    startedTemplateSlugs,
    weeklyHours: Math.max(1, Math.round(input.weeklyHours)),
    gapSkillSlugs,
    trackSlugs: input.assessment?.careerRecommendations.map(
      (recommendation) => recommendation.slug,
    ) ?? [],
  };
}

function checkPrerequisite(
  skillSlug: string,
  context: ProjectReadinessContext,
): PrerequisiteCheck {
  const skillName = getSkillName(skillSlug);
  const signal = context.signals[skillSlug];

  if (signal?.completedProjects) {
    return {
      skillSlug,
      skillName,
      met: true,
      reason: "Used in a project you already completed.",
    };
  }

  if (
    signal?.assessmentPercent !== null &&
    signal?.assessmentPercent !== undefined &&
    signal.assessmentPercent >= PREREQUISITE_PERCENT_THRESHOLD
  ) {
    return {
      skillSlug,
      skillName,
      met: true,
      reason: `Scored ${signal.assessmentPercent}% on your latest assessment.`,
    };
  }

  if (signal?.completedPracticeTasks) {
    const count = signal.completedPracticeTasks;
    return {
      skillSlug,
      skillName,
      met: true,
      reason: `Completed ${count} roadmap ${
        count === 1 ? "task" : "tasks"
      } covering this skill.`,
    };
  }

  if (signal?.assessmentPercent !== null && signal?.assessmentPercent !== undefined) {
    return {
      skillSlug,
      skillName,
      met: false,
      reason: `Scored ${signal.assessmentPercent}% on your latest assessment, below the ${PREREQUISITE_PERCENT_THRESHOLD}% needed here. Complete a roadmap task on it to unlock this project.`,
    };
  }

  return {
    skillSlug,
    skillName,
    met: false,
    reason:
      "No evidence yet. Complete an assessment section or a roadmap task covering this skill.",
  };
}

export function evaluateProjectReadiness(
  template: ProjectTemplate,
  context: ProjectReadinessContext,
): ProjectReadiness {
  const prerequisites = template.prerequisiteSkillSlugs.map((slug) =>
    checkPrerequisite(slug, context),
  );
  const unmetPrerequisites = prerequisites.filter(
    (prerequisite) => !prerequisite.met,
  );

  const lockReasons: string[] = [];

  if (unmetPrerequisites.length > 0) {
    lockReasons.push(
      `${unmetPrerequisites.length} prerequisite ${
        unmetPrerequisites.length === 1 ? "skill" : "skills"
      } without evidence yet: ${unmetPrerequisites
        .map((prerequisite) => prerequisite.skillName)
        .join(", ")}.`,
    );
  }

  const projectsShortfall =
    template.requiresCompletedProjects - context.completedProjectCount;

  if (projectsShortfall > 0) {
    lockReasons.push(
      `Needs ${template.requiresCompletedProjects} completed ${
        template.requiresCompletedProjects === 1 ? "project" : "projects"
      } first. You have ${context.completedProjectCount}.`,
    );
  }

  const estimatedWeeks = Math.max(
    1,
    Math.ceil(template.estimatedHours / context.weeklyHours),
  );
  const comfortable = estimatedWeeks <= 4;

  return {
    templateSlug: template.slug,
    locked: lockReasons.length > 0,
    prerequisites,
    unmetPrerequisites,
    completedProjectsRequired: template.requiresCompletedProjects,
    completedProjectsCount: context.completedProjectCount,
    lockReasons,
    timeFit: {
      weeklyHours: context.weeklyHours,
      estimatedHours: template.estimatedHours,
      estimatedWeeks,
      comfortable,
      note: comfortable
        ? `About ${estimatedWeeks} ${
            estimatedWeeks === 1 ? "week" : "weeks"
          } at ${context.weeklyHours} hours per week.`
        : `About ${estimatedWeeks} weeks at ${context.weeklyHours} hours per week, so plan it as a long-running project or raise your weekly hours.`,
    },
  };
}

export function recommendProjects(
  context: ProjectReadinessContext,
  options: { limit?: number } = {},
): ProjectRecommendation[] {
  const limit = options.limit ?? 3;
  const gapSlugs = new Set(context.gapSkillSlugs);
  const trackSlugs = new Set(context.trackSlugs);
  const startedSlugs = new Set(context.startedTemplateSlugs);

  const scored = PROJECT_TEMPLATES.filter(
    (template) => !startedSlugs.has(template.slug),
  ).map((template) => {
    const readiness = evaluateProjectReadiness(template, context);
    const reasons: string[] = [];
    let fitScore = 0;

    if (!readiness.locked) {
      fitScore += 40;
      reasons.push("Every prerequisite already has evidence behind it.");
    }

    const matchedTracks = template.trackSlugs.filter((slug) =>
      trackSlugs.has(slug),
    );
    if (matchedTracks.length > 0) {
      fitScore += Math.min(20, matchedTracks.length * 10);
      reasons.push(
        `Matches your suggested career ${
          matchedTracks.length === 1 ? "direction" : "directions"
        } from the assessment.`,
      );
    }

    const practisedGaps = template.skillSlugs.filter((slug) =>
      gapSlugs.has(slug),
    );
    if (practisedGaps.length > 0) {
      fitScore += Math.min(25, practisedGaps.length * 8);
      reasons.push(
        `Practises ${practisedGaps.length} ${
          practisedGaps.length === 1 ? "skill" : "skills"
        } your assessment flagged as a gap: ${practisedGaps
          .map((slug) => getSkillName(slug))
          .join(", ")}.`,
      );
    }

    if (readiness.timeFit.comfortable) {
      fitScore += 15;
      reasons.push(readiness.timeFit.note);
    } else {
      reasons.push(readiness.timeFit.note);
    }

    if (readiness.locked) {
      reasons.push(...readiness.lockReasons);
    }

    return { templateSlug: template.slug, fitScore, reasons, readiness };
  });

  return scored
    .sort((a, b) => {
      if (a.readiness.locked !== b.readiness.locked) {
        return a.readiness.locked ? 1 : -1;
      }

      if (b.fitScore !== a.fitScore) {
        return b.fitScore - a.fitScore;
      }

      return a.templateSlug.localeCompare(b.templateSlug);
    })
    .slice(0, limit);
}

export function evaluateProjectCompletion(
  project: ProjectRecord,
): ProjectCompletionCheck {
  const blockers: string[] = [];

  const incomplete = project.milestones.filter(
    (milestone) => milestone.status !== "completed",
  );

  if (project.milestones.length === 0) {
    blockers.push("This project has no milestones to complete.");
  }

  if (incomplete.length > 0) {
    blockers.push(
      `${incomplete.length} ${
        incomplete.length === 1 ? "milestone is" : "milestones are"
      } still open.`,
    );
  }

  if (!project.repoUrl) {
    blockers.push("Add a repository link so the work can be reviewed.");
  }

  return { eligible: blockers.length === 0, blockers };
}

export type ScoredRubricCriterion = {
  criterion: (typeof PROJECT_RUBRIC)[number];
  score: number;
};

export function summariseRubric(selfAssessment: ProjectSelfAssessment | null) {
  const scored = PROJECT_RUBRIC.reduce<ScoredRubricCriterion[]>(
    (entries, criterion) => {
      const score = selfAssessment?.scores[criterion.key];

      if (typeof score === "number") {
        entries.push({ criterion, score });
      }

      return entries;
    },
    [],
  );

  if (scored.length === 0) {
    return { completed: false, total: 0, maxTotal: 0, percent: 0, scored };
  }

  const total = scored.reduce((sum, entry) => sum + entry.score, 0);
  const maxTotal = scored.length * RUBRIC_MAX_SCORE;

  return {
    completed: scored.length === PROJECT_RUBRIC.length,
    total,
    maxTotal,
    percent: Math.round((total / maxTotal) * 100),
    scored,
  };
}

export function buildProjectEvidence(
  project: ProjectRecord,
): ProjectEvidenceDraft[] {
  if (!evaluateProjectCompletion(project).eligible) {
    return [];
  }

  const template = getProjectTemplate(project.templateSlug);

  if (!template) {
    return [];
  }

  const rubric = summariseRubric(project.selfAssessment);

  return template.skillSlugs.map((skillSlug) => ({
    skillSlug,
    sourceType: "project" as const,
    evidenceLevel: "project_evidence" as const,
    score: rubric.scored.length > 0 ? rubric.percent : null,
    verified: false as const,
    notes: `Completed "${template.title}" with every milestone submitted${
      project.repoUrl ? " and a linked repository" : ""
    }. Self-assessed, not externally reviewed.`,
  }));
}
