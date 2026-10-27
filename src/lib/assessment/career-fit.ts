import {
  CAREER_TRACKS,
  getCareerTrack,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import {
  CAREER_ACTIVITY_QUESTION,
  CAREER_STYLE_QUESTION,
  INTEREST_QUESTIONS,
} from "@/lib/assessment/questions";
import {
  INTEREST_KEYS,
  INTEREST_META,
  type AssessmentAnswers,
  type CareerRecommendation,
  type CareerSignal,
  type ConfidenceLevel,
  type InterestKey,
  type SectionResult,
} from "@/lib/assessment/types";
import { getSkillName } from "@/lib/skills/catalog";

type TrackAffinity = {
  interests: Partial<Record<InterestKey, number>>;
  styles: readonly string[];
  activities: readonly string[];
  skills: readonly string[];
  experiment: string;
};

const TRACK_AFFINITIES: Record<CareerTrackSlug, TrackAffinity> = {
  "data-analyst": {
    interests: {
      "business-data": 3,
      "numerical-problems": 2,
      automation: 1,
    },
    styles: ["explain", "investigate"],
    activities: ["analyze-dataset"],
    skills: [
      "sql-filtering",
      "sql-aggregation",
      "sql-joins",
      "descriptive-statistics",
      "data-visualization",
      "business-insights",
    ],
    experiment:
      "Take a small dataset, answer three business questions with SQL or pandas, and present the findings in a one-page memo.",
  },
  "business-intelligence-analyst": {
    interests: {
      "business-data": 3,
      automation: 1.5,
      "numerical-problems": 1,
    },
    styles: ["explain", "design"],
    activities: ["analyze-dataset"],
    skills: [
      "sql-filtering",
      "sql-aggregation",
      "data-visualization",
      "business-insights",
      "database-design",
    ],
    experiment:
      "Define five decision-relevant metrics for a small business and build a dashboard specification with sample charts.",
  },
  "data-scientist": {
    interests: {
      "experimentation-research": 3,
      "numerical-problems": 2,
      "business-data": 1,
    },
    styles: ["investigate", "code"],
    activities: ["analyze-dataset", "run-experiment"],
    skills: [
      "python-basics",
      "descriptive-statistics",
      "probability",
      "pandas",
      "model-evaluation",
      "technical-communication",
    ],
    experiment:
      "Frame a prediction question, build a baseline and one model, then write an honest evaluation with limitations.",
  },
  "machine-learning-engineer": {
    interests: {
      "software-apps": 3,
      "numerical-problems": 1.5,
      "ai-systems": 1.5,
      "experimentation-research": 1,
    },
    styles: ["code", "design"],
    activities: ["build-app", "run-experiment"],
    skills: [
      "python-basics",
      "problem-solving",
      "model-evaluation",
      "git-github",
      "automated-testing",
    ],
    experiment:
      "Package a trained model behind a small, tested inference script with input validation and a reproducible run log.",
  },
  "applied-ai-engineer": {
    interests: {
      "ai-systems": 3,
      "software-apps": 2,
      automation: 1,
    },
    styles: ["code", "design"],
    activities: ["build-app"],
    skills: [
      "python-basics",
      "http-apis",
      "problem-solving",
      "automated-testing",
      "prompt-engineering",
    ],
    experiment:
      "Design a small model-backed workflow with explicit evaluation criteria, a mock provider, and tested failure paths.",
  },
  "generative-ai-engineer": {
    interests: {
      "ai-systems": 3,
      "experimentation-research": 1.5,
      "software-apps": 1,
    },
    styles: ["code", "investigate"],
    activities: ["build-app", "run-experiment"],
    skills: [
      "python-basics",
      "http-apis",
      "prompt-engineering",
      "ai-evaluation",
    ],
    experiment:
      "Build a prompt-based prototype with a scoring rubric, then test five inputs and document failure cases without pretending it is live AI.",
  },
  "data-engineer": {
    interests: {
      automation: 3,
      "software-apps": 1.5,
      "business-data": 1,
    },
    styles: ["design", "code"],
    activities: ["automate-process"],
    skills: [
      "sql-filtering",
      "sql-joins",
      "python-basics",
      "command-line",
      "database-design",
    ],
    experiment:
      "Build a small CSV-to-SQLite (or Postgres) pipeline with a schema, validation checks, and a repeatable run command.",
  },
  "mlops-engineer": {
    interests: {
      automation: 2.5,
      "software-apps": 2.5,
      "ai-systems": 1,
    },
    styles: ["design", "code"],
    activities: ["automate-process", "build-app"],
    skills: [
      "python-basics",
      "command-line",
      "git-github",
      "automated-testing",
      "model-evaluation",
    ],
    experiment:
      "Package a model training script with configuration, tests, and a reproducible run log. Do not claim deployment experience until it runs.",
  },
  "ai-automation-engineer": {
    interests: {
      automation: 3,
      "ai-systems": 2,
      "business-data": 1,
    },
    styles: ["design", "code"],
    activities: ["automate-process"],
    skills: [
      "python-basics",
      "http-apis",
      "command-line",
      "prompt-engineering",
      "database-design",
    ],
    experiment:
      "Automate a repetitive file or data task with a script, explicit safety checks, and a dry-run mode.",
  },
};

function parseRating(value: string | undefined): ConfidenceLevel | null {
  if (value === "1" || value === "2" || value === "3" || value === "4" || value === "5") {
    return Number(value) as ConfidenceLevel;
  }
  return null;
}

export function getCareerSignals(answers: AssessmentAnswers): CareerSignal[] {
  return INTEREST_KEYS.map((key) => {
    const question = INTEREST_QUESTIONS.find((item) => item.interest === key);
    const rating = parseRating(question ? answers[question.key] : undefined) ?? 1;
    return {
      key,
      label: INTEREST_META[key].label,
      description: INTEREST_META[key].description,
      rating,
    };
  });
}

function optionLabel(
  question:
    | typeof CAREER_STYLE_QUESTION
    | typeof CAREER_ACTIVITY_QUESTION,
  value: string | undefined,
) {
  return (
    question.options.find((option) => option.value === value)?.label ??
    "Not answered"
  );
}

export function getCareerStyle(answers: AssessmentAnswers) {
  const value = answers[CAREER_STYLE_QUESTION.key] ?? "";
  return { value, label: optionLabel(CAREER_STYLE_QUESTION, value) };
}

export function getCareerActivity(answers: AssessmentAnswers) {
  const value = answers[CAREER_ACTIVITY_QUESTION.key] ?? "";
  return { value, label: optionLabel(CAREER_ACTIVITY_QUESTION, value) };
}

function getAssessedSkillPercentages(sections: SectionResult[]) {
  const percentages = new Map<string, number>();

  for (const section of sections) {
    for (const skill of section.skills) {
      percentages.set(skill.skillSlug, skill.percent);
    }
  }

  return percentages;
}

function getReadiness(
  affinity: TrackAffinity,
  skillPercentages: Map<string, number>,
) {
  const assessed = affinity.skills
    .map((slug) => skillPercentages.get(slug))
    .filter((value): value is number => typeof value === "number");

  if (assessed.length === 0) {
    return { value: null, average: null, count: 0 };
  }

  const average =
    assessed.reduce((sum, value) => sum + value, 0) / assessed.length;
  return { value: average / 100, average, count: assessed.length };
}

function buildReasons({
  affinity,
  signals,
  styleValue,
  activityValue,
  readiness,
  target,
  trackSlug,
}: {
  affinity: TrackAffinity;
  signals: CareerSignal[];
  styleValue: string;
  activityValue: string;
  readiness: { value: number | null; average: number | null; count: number };
  target: CareerTrackSlug | null;
  trackSlug: CareerTrackSlug;
}) {
  const reasons: string[] = [];
  const weightedInterests = Object.entries(affinity.interests)
    .map(([key, weight]) => {
      const signal = signals.find((item) => item.key === key);
      return {
        signal,
        weight: weight ?? 0,
        contribution: (signal?.rating ?? 0) * (weight ?? 0),
      };
    })
    .filter((item) => item.signal && item.signal.rating >= 3)
    .sort((a, b) => b.contribution - a.contribution);

  const topInterest = weightedInterests[0]?.signal;
  if (topInterest) {
    reasons.push(
      `You rated ${topInterest.label.toLowerCase()} ${topInterest.rating}/5 as an interest.`,
    );
  }

  if (affinity.styles.includes(styleValue)) {
    reasons.push(
      `Your preferred working style — ${optionLabel(
        CAREER_STYLE_QUESTION,
        styleValue,
      ).toLowerCase()} — aligns with this track's day-to-day work.`,
    );
  }

  if (affinity.activities.includes(activityValue)) {
    reasons.push(
      `You chose “${optionLabel(
        CAREER_ACTIVITY_QUESTION,
        activityValue,
      )}” as a first learning activity.`,
    );
  }

  if (readiness.value !== null && readiness.average !== null) {
    if (readiness.average >= 70) {
      reasons.push(
        `Your current screen demonstrated ${Math.round(
          readiness.average,
        )}% across ${readiness.count} relevant skills.`,
      );
    } else {
      reasons.push(
        `Relevant skills are not demonstrated yet (${Math.round(
          readiness.average,
        )}% across ${readiness.count} screened skills). Treat this as a direction to test, not a current strength.`,
      );
    }
  }

  if (target === trackSlug) {
    reasons.unshift("This matches the target role saved in your profile.");
  }

  if (reasons.length === 0) {
    reasons.push(
      "This is an alternative direction worth comparing through a small experiment.",
    );
  }

  return reasons.slice(0, 3);
}

export function rankAllCareerRecommendations({
  answers,
  sections,
  profileTarget,
}: {
  answers: AssessmentAnswers;
  sections: SectionResult[];
  profileTarget: CareerTrackSlug | null;
}): CareerRecommendation[] {
  const signals = getCareerSignals(answers);
  const styleValue = answers[CAREER_STYLE_QUESTION.key] ?? "";
  const activityValue = answers[CAREER_ACTIVITY_QUESTION.key] ?? "";
  const skillPercentages = getAssessedSkillPercentages(sections);

  const scored = CAREER_TRACKS.map((track) => {
    const affinity = TRACK_AFFINITIES[track.slug];
    const readiness = getReadiness(affinity, skillPercentages);

    let raw = 0;
    let maxRaw = 0;

    for (const [key, weight] of Object.entries(affinity.interests)) {
      const signal = signals.find((item) => item.key === key);
      if (!signal) continue;
      raw += signal.rating * (weight ?? 0);
      maxRaw += 5 * (weight ?? 0);
    }

    if (affinity.styles.includes(styleValue)) raw += 2;
    maxRaw += 2;

    if (affinity.activities.includes(activityValue)) raw += 1.5;
    maxRaw += 1.5;

    if (readiness.value !== null) {
      raw += readiness.value * 2;
    }
    maxRaw += 2;

    if (profileTarget === track.slug) {
      raw += 2;
      maxRaw += 2;
    }

    const fitScore =
      maxRaw > 0
        ? Math.max(0, Math.min(100, Math.round((raw / maxRaw) * 100)))
        : 0;

    const reasons = buildReasons({
      affinity,
      signals,
      styleValue,
      activityValue,
      readiness,
      target: profileTarget,
      trackSlug: track.slug,
    });

    return {
      slug: track.slug,
      name: track.name,
      family: track.family,
      fitScore,
      reasons,
      experiment: affinity.experiment,
      target: profileTarget === track.slug,
    };
  });

  const ranked = scored.sort((a, b) => b.fitScore - a.fitScore);

  return ranked.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    family: entry.family,
    fitScore: entry.fitScore,
    reasons: entry.reasons,
    experiment: entry.experiment,
  }));
}

export function getCareerRecommendations({
  answers,
  sections,
  profileTarget,
}: {
  answers: AssessmentAnswers;
  sections: SectionResult[];
  profileTarget: CareerTrackSlug | null;
}): CareerRecommendation[] {
  const ranked = rankAllCareerRecommendations({
    answers,
    sections,
    profileTarget,
  });

  const targetEntry = ranked.find((entry) => entry.slug === profileTarget);
  const others = ranked.filter((entry) => entry.slug !== profileTarget);

  if (!targetEntry) return others.slice(0, 3);

  return [...others.slice(0, 2), targetEntry];
}

export function getTrackExperimentBrief(slug: CareerTrackSlug) {
  return TRACK_AFFINITIES[slug]?.experiment ?? getCareerTrack(slug)?.summary ?? "";
}

export function getTrackSkills(slug: CareerTrackSlug) {
  return (TRACK_AFFINITIES[slug]?.skills ?? []).map((skillSlug) => ({
    slug: skillSlug,
    name: getSkillName(skillSlug),
  }));
}
