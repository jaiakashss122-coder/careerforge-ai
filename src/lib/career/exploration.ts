import {
  CAREER_ACTIVITY_QUESTION,
  CAREER_STYLE_QUESTION,
  INTEREST_QUESTIONS,
} from "@/lib/assessment/questions";
import { rankAllCareerRecommendations } from "@/lib/assessment/career-fit";
import type {
  AssessmentAnswers,
  AssessmentSummary,
  CareerRecommendation,
} from "@/lib/assessment/types";
import { getProjectTemplate } from "@/lib/projects/templates";
import type { ProjectRecord } from "@/lib/projects/types";
import { CAREER_EXPERIMENTS, getCareerExperimentForTrack } from "@/lib/career/experiments";
import {
  CAREER_TRACK_SLUGS,
  getCareerTrack,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import {
  getEnjoymentAverage,
  type CareerExperimentRecord,
  type CareerExperimentReflection,
  type CareerPreferenceRecord,
} from "@/lib/career/types";

export const EVIDENCE_ADJUSTMENT_MAX = 15;

export type CareerConfidence =
  | "assessment_only"
  | "one_experiment"
  | "experiment_and_project";

export const CAREER_CONFIDENCE_LABELS: Record<CareerConfidence, string> = {
  assessment_only: "Not tested yet",
  one_experiment: "One experiment done",
  experiment_and_project: "Experiment plus finished project work",
};

export type RankedCareer = {
  slug: CareerTrackSlug;
  name: string;
  family: string;
  fitScore: number;
  evidenceAdjustment: number;
  combinedScore: number;
  reasons: string[];
  supportingEvidence: string[];
  reflection: CareerExperimentReflection | null;
  experimentTitle: string | null;
  experimentStatus: CareerExperimentRecord["status"] | null;
  confidence: CareerConfidence;
  confidenceLabel: string;
  confidenceNote: string;
  chosen: boolean;
  alternative: boolean;
  profileTarget: boolean;
};

function completedExperimentsFor(
  experiments: CareerExperimentRecord[],
  slug: CareerTrackSlug,
) {
  return experiments.filter(
    (experiment) =>
      experiment.careerSlug === slug && experiment.status === "completed",
  );
}

function averageReflection(
  records: CareerExperimentRecord[],
): CareerExperimentReflection | null {
  const withReflection = records.filter(
    (record) => record.reflection !== null,
  );

  if (withReflection.length === 0) return null;

  const sum: CareerExperimentReflection = {
    interest: 0,
    difficulty: 0,
    enjoyment: 0,
    willingness: 0,
  };

  for (const record of withReflection) {
    const reflection = record.reflection as CareerExperimentReflection;
    sum.interest += reflection.interest;
    sum.difficulty += reflection.difficulty;
    sum.enjoyment += reflection.enjoyment;
    sum.willingness += reflection.willingness;
  }

  const count = withReflection.length;

  return {
    interest: sum.interest / count,
    difficulty: sum.difficulty / count,
    enjoyment: sum.enjoyment / count,
    willingness: sum.willingness / count,
  };
}

export function getEvidenceAdjustment(
  reflection: CareerExperimentReflection | null,
) {
  if (!reflection) return 0;

  const average = getEnjoymentAverage(reflection);
  return Math.round(((average - 3) / 2) * EVIDENCE_ADJUSTMENT_MAX);
}

function describeReflection(reflection: CareerExperimentReflection) {
  const round = (value: number) => Math.round(value * 10) / 10;

  return `Your reflection on this role: interest ${round(reflection.interest)} of 5, enjoyment ${round(
    reflection.enjoyment,
  )} of 5, difficulty ${round(reflection.difficulty)} of 5, willingness to practise ${round(
    reflection.willingness,
  )} of 5.`;
}

function describeDifficultyNote(reflection: CareerExperimentReflection) {
  if (reflection.difficulty >= 4.5 && reflection.willingness >= 4) {
    return "You rated this the hardest level and still said you would practise it. A hard trial you would repeat is a stronger signal than an easy one.";
  }

  if (reflection.difficulty >= 4.5 && reflection.willingness <= 2) {
    return "You found it very hard and would not put in the practice. That is a result, not a failure: this role is now tested and set aside on evidence.";
  }

  if (reflection.difficulty <= 1.5) {
    return "You rated this the easiest level, so the trial tells you little about whether the real work suits you.";
  }

  return null;
}

export function rankCareersForExploration({
  recommendations,
  experiments,
  completedProjectTracks,
  preference,
  profileTarget,
}: {
  recommendations: CareerRecommendation[];
  experiments: CareerExperimentRecord[];
  completedProjectTracks: CareerTrackSlug[];
  preference: CareerPreferenceRecord | null;
  profileTarget: CareerTrackSlug | null;
}): RankedCareer[] {
  const ranked = recommendations.map((recommendation) =>
    buildRankedCareer({
      recommendation,
      experiments,
      completedProjectTracks,
      preference,
      profileTarget,
    }),
  );

  return rankByCombinedScore(ranked);
}

function buildRankedCareer({
  recommendation,
  experiments,
  completedProjectTracks,
  preference,
  profileTarget,
}: {
  recommendation: CareerRecommendation;
  experiments: CareerExperimentRecord[];
  completedProjectTracks: CareerTrackSlug[];
  preference: CareerPreferenceRecord | null;
  profileTarget: CareerTrackSlug | null;
}): RankedCareer {
  const track = getCareerTrack(recommendation.slug);
  const definition = getCareerExperimentForTrack(recommendation.slug);
  const own = experiments.filter(
    (experiment) => experiment.careerSlug === recommendation.slug,
  );
  const completed = completedExperimentsFor(experiments, recommendation.slug);
  const reflection = averageReflection(completed);
  const hasFinishedProject = completedProjectTracks.includes(
    recommendation.slug,
  );

  const evidenceAdjustment = getEvidenceAdjustment(reflection);
  const combinedScore = reflection
    ? Math.max(
        0,
        Math.min(100, Math.round(recommendation.fitScore + evidenceAdjustment)),
      )
    : recommendation.fitScore;

  const confidence: CareerConfidence =
    completed.length === 0
      ? "assessment_only"
      : hasFinishedProject
        ? "experiment_and_project"
        : "one_experiment";

  const supportingEvidence = [...recommendation.reasons];

  if (reflection) {
    supportingEvidence.push(describeReflection(reflection));

    const difficultyNote = describeDifficultyNote(reflection);
    if (difficultyNote) supportingEvidence.push(difficultyNote);
  }

  if (hasFinishedProject) {
    supportingEvidence.push(
      "You finished at least one project in this area. The project was accepted by you, not by an outside reviewer.",
    );
  }

  const openExperiment = own.find((experiment) => experiment.status === "in_progress");

  return {
    slug: recommendation.slug,
    name: recommendation.name,
    family: recommendation.family,
    fitScore: recommendation.fitScore,
    evidenceAdjustment,
    combinedScore,
    reasons: recommendation.reasons,
    supportingEvidence,
    reflection,
    experimentTitle: definition ? definition.title : null,
    experimentStatus: completed.length
      ? "completed"
      : openExperiment
        ? "in_progress"
        : own.length
          ? own[0].status
          : null,
    confidence,
    confidenceLabel: CAREER_CONFIDENCE_LABELS[confidence],
    confidenceNote: buildConfidenceNote(confidence, track?.name ?? recommendation.name),
    chosen: preference?.specializationChoice === recommendation.slug,
    alternative: preference?.alternativeChoice === recommendation.slug,
    profileTarget: profileTarget === recommendation.slug,
  };
}

function buildConfidenceNote(confidence: CareerConfidence, name: string) {
  if (confidence === "assessment_only") {
    return `${name} is placed here only by your assessment answers and your saved target role. You have not done the experiment, so treat the score as a hypothesis to test, not a finding.`;
  }

  if (confidence === "one_experiment") {
    return `${name} is placed here by your assessment answers and one reflection you wrote after doing the work. One trial is a start, not a comparison.`;
  }

  return `${name} is placed here by your assessment answers, your reflection, and finished project work in the same area. All of it is self-recorded, so it is evidence of what you did, not of anything an outside reviewer confirmed.`;
}

function rankByCombinedScore(entries: RankedCareer[]): RankedCareer[] {
  return [...entries].sort(
    (a, b) =>
      b.combinedScore - a.combinedScore ||
      b.fitScore - a.fitScore ||
      a.name.localeCompare(b.name),
  );
}

export type SpecializationStage = {
  ready: boolean;
  label: string;
  description: string;
  missing: string[];
};

export function getSpecializationStage({
  ranked,
  experiments,
  completedProjectTracks,
}: {
  ranked: RankedCareer[];
  experiments: CareerExperimentRecord[];
  completedProjectTracks: CareerTrackSlug[];
}): SpecializationStage {
  const leader = ranked[0];
  const missing: string[] = [];

  if (!leader) {
    return {
      ready: false,
      label: "Exploratory",
      description:
        "There is nothing to specialise in yet. Finish the skills assessment so the workspace has a ranking to work from.",
      missing: ["No career ranking exists yet. Complete the skills assessment first."],
    };
  }

  const testedCount = experiments.filter(
    (experiment) => experiment.status === "completed",
  ).length;
  const projectCount = completedProjectTracks.length;

  if (!leader.reflection) {
    missing.push(
      `The top-ranked role is ${leader.name}, but you have not finished its experiment yet. Rank stays exploratory until you have done the work and written the reflection.`,
    );
  }

  if (testedCount < 2) {
    missing.push(
      `Only ${testedCount} ${testedCount === 1 ? "experiment is" : "experiments are"} finished. A choice made against a single trial is not a comparison, so finish a second experiment in a different area.`,
    );
  }

  if (projectCount === 0) {
    missing.push(
      "No project has been marked finished yet, so nothing here is backed by work you took to the end.",
    );
  }

  const ready = Boolean(leader.reflection) && testedCount >= 2 && projectCount >= 1;

  return {
    ready,
    label: ready ? "Ready to commit" : "Exploratory",
    description: ready
      ? `Your evidence covers ${testedCount} finished experiments and ${projectCount} ${projectCount === 1 ? "project" : "projects"} taken to the end, so ${leader.name} can be treated as a working specialisation rather than a guess. It stays your call, and you can override it below.`
      : `${leader.name} leads on ${leader.confidenceLabel.toLowerCase()}, but this stays exploratory. ${
          missing.length === 1
            ? missing[0]
            : `What is still missing: ${missing.join(" ")}`
        }`,
    missing,
  };
}

export type OverrideSummary = {
  active: boolean;
  headline: string;
  detail: string;
};

export function describeOverride({
  preference,
  ranked,
}: {
  preference: CareerPreferenceRecord | null;
  ranked: RankedCareer[];
}): OverrideSummary | null {
  if (!preference?.specializationChoice) return null;

  const track = getCareerTrack(preference.specializationChoice);
  if (!track) return null;

  const chosen = ranked.find((entry) => entry.slug === track.slug);
  const leader = ranked[0];

  if (!leader || leader.slug === track.slug) {
    return {
      active: true,
      headline: `You chose ${track.name}.`,
      detail: `This matches the workspace ranking, so your choice is recorded with your reason and will stay visible even if the ranking later moves.`,
    };
  }

  return {
    active: true,
    headline: `You chose ${track.name}, which the workspace currently places ${
      chosen ? `at ${chosen.combinedScore} of 100` : "outside the ranking"
    }, behind ${leader.name} at ${leader.combinedScore}.`,
    detail: preference.overrideReason
      ? `Your recorded reason: ${preference.overrideReason}`
      : "No reason was recorded. Add one so the workspace can show why this choice stands.",
  };
}

export function getExplorationCounts(experiments: CareerExperimentRecord[]) {
  const completed = experiments.filter(
    (experiment) => experiment.status === "completed",
  );
  const inProgress = experiments.filter(
    (experiment) => experiment.status === "in_progress",
  );

  return {
    completedCount: completed.length,
    inProgressCount: inProgress.length,
    notStartedCount:
      experiments.length - completed.length - inProgress.length,
  };
}

export function rebuildCareerAnswers(summary: AssessmentSummary): AssessmentAnswers {
  const answers: AssessmentAnswers = {};

  for (const question of INTEREST_QUESTIONS) {
    const signal = summary.careerSignals.find(
      (item) => item.key === question.interest,
    );
    answers[question.key] = String(signal?.rating ?? 1);
  }

  answers[CAREER_STYLE_QUESTION.key] = summary.careerStyle.value;
  answers[CAREER_ACTIVITY_QUESTION.key] = summary.careerActivity.value;

  return answers;
}

export function getCompletedProjectTracks(
  projects: ProjectRecord[],
): CareerTrackSlug[] {
  const tracks = new Set<CareerTrackSlug>();

  for (const project of projects) {
    if (project.status !== "completed") continue;

    const template = getProjectTemplate(project.templateSlug);

    if (!template) continue;

    for (const slug of template.trackSlugs) {
      tracks.add(slug);
    }
  }

  return [...tracks];
}

export type CareerExplorationModel = {
  ranked: RankedCareer[];
  stage: SpecializationStage;
  override: OverrideSummary | null;
  counts: ReturnType<typeof getExplorationCounts>;
  completedProjectTracks: CareerTrackSlug[];
  untestedTrackCount: number;
};

export function buildCareerExplorationModel({
  summary,
  experiments,
  projects,
  preference,
  profileTarget,
}: {
  summary: AssessmentSummary | null;
  experiments: CareerExperimentRecord[];
  projects: ProjectRecord[];
  preference: CareerPreferenceRecord | null;
  profileTarget?: CareerTrackSlug | null;
}): CareerExplorationModel {
  const completedProjectTracks = getCompletedProjectTracks(projects);
  const target =
    profileTarget === undefined ? (summary?.profileTarget ?? null) : profileTarget;

  if (!summary) {
    const ranked = CAREER_EXPERIMENTS.map<CareerRecommendation>((experiment) => {
      const track = getCareerTrack(experiment.careerSlug);

      return {
        slug: experiment.careerSlug,
        name: track?.name ?? experiment.careerSlug,
        family: track?.family ?? "Analytics",
        fitScore: 0,
        reasons: [],
        experiment: experiment.brief,
      };
    });

    const sorted = ranked.sort((a, b) => a.name.localeCompare(b.name));

    return {
      ranked: rankCareersForExploration({
        recommendations: sorted,
        experiments,
        completedProjectTracks,
        preference,
        profileTarget: target,
      }),
      stage: getSpecializationStage({
        ranked: [],
        experiments,
        completedProjectTracks,
      }),
      override: null,
      counts: getExplorationCounts(experiments),
      completedProjectTracks,
      untestedTrackCount: CAREER_EXPERIMENTS.length,
    };
  }

  const ranked = rankCareersForExploration({
    recommendations: rankAllCareerRecommendations({
      answers: rebuildCareerAnswers(summary),
      sections: summary.sections,
      profileTarget: target,
    }),
    experiments,
    completedProjectTracks,
    preference,
    profileTarget: target,
  });

  const testedSlugs = new Set(
    experiments
      .filter((experiment) => experiment.status === "completed")
      .map((experiment) => experiment.careerSlug),
  );

  return {
    ranked,
    stage: getSpecializationStage({
      ranked,
      experiments,
      completedProjectTracks,
    }),
    override: describeOverride({ preference, ranked }),
    counts: getExplorationCounts(experiments),
    completedProjectTracks,
    untestedTrackCount: CAREER_TRACK_SLUGS.length - testedSlugs.size,
  };
}
