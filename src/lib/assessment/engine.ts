import {
  CAREER_ACTIVITY_QUESTION,
  CAREER_STYLE_QUESTION,
  CONFIDENCE_QUESTIONS,
  CONSTRAINT_CHOICE_QUESTIONS,
  CONSTRAINT_HOURS_QUESTION,
  INTEREST_OPTIONS,
  INTEREST_QUESTIONS,
  NOT_SURE_VALUE,
  TECHNICAL_PROBES,
  getQuestionOptionLabel,
} from "@/lib/assessment/questions";
import {
  getCareerActivity,
  getCareerRecommendations,
  getCareerSignals,
  getCareerStyle,
} from "@/lib/assessment/career-fit";
import {
  ASSESSMENT_DISCLAIMER,
  CONFIDENCE_OPTIONS,
  TECHNICAL_SECTIONS,
  type AssessmentAnswers,
  type AssessmentConstraints,
  type AssessmentEvaluation,
  type AssessmentSection,
  type AssessmentSummary,
  type ConfidenceLevel,
  type ConfidenceMismatch,
  type DemonstratedLevel,
  type EvaluationOutcome,
  type SectionResult,
  type SkillResult,
  type StoredAnswer,
  type TechnicalProbe,
  type TechnicalQuestion,
  type TechnicalSection,
} from "@/lib/assessment/types";
import type { Profile } from "@/lib/profile/schema";
import { getSkillName } from "@/lib/skills/catalog";

export type AssessmentStep =
  | {
      kind: "probe";
      probe: TechnicalProbe;
      section: TechnicalSection;
      sectionIndex: number;
      probeIndex: number;
      sectionProbeCount: number;
    }
  | {
      kind: "confidence";
      section: TechnicalSection;
      question: (typeof CONFIDENCE_QUESTIONS)[number];
    }
  | { kind: "career" }
  | { kind: "constraints" }
  | { kind: "review" };

export type AssessmentProgress = {
  current: AssessmentStep;
  completedSteps: number;
  totalSteps: number;
  stepNumber: number;
  percent: number;
};

const LEVEL_ORDER: Record<DemonstratedLevel, number> = {
  none: 0,
  foundational: 1,
  beginner: 2,
  basic: 3,
  intermediate: 4,
};

function parseConfidence(value: string | undefined): ConfidenceLevel | null {
  if (
    value === "1" ||
    value === "2" ||
    value === "3" ||
    value === "4" ||
    value === "5"
  ) {
    return Number(value) as ConfidenceLevel;
  }
  return null;
}

function parseHours(value: string | undefined) {
  if (!value) return null;
  const hours = Number(value);
  return Number.isInteger(hours) &&
    hours >= CONSTRAINT_HOURS_QUESTION.min &&
    hours <= CONSTRAINT_HOURS_QUESTION.max
    ? hours
    : null;
}

export function isOptionAnswer(
  options: readonly { value: string }[],
  value: string | undefined,
): value is string {
  return Boolean(value && options.some((option) => option.value === value));
}

function hashOptionSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function orderQuestionOptions<T extends { value: string }>(
  key: string,
  options: readonly T[],
): T[] {
  const shuffled = options.filter(
    (option) => option.value !== NOT_SURE_VALUE,
  );
  const fixed = options.filter((option) => option.value === NOT_SURE_VALUE);
  let state = hashOptionSeed(key) || 0x9e3779b9;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const pick = state % (index + 1);
    [shuffled[index], shuffled[pick]] = [shuffled[pick], shuffled[index]];
  }

  return [...shuffled, ...fixed];
}

function isValidTechnicalAnswer(
  question: TechnicalQuestion,
  value: string | undefined,
) {
  return isOptionAnswer(question.options, value);
}

function branchFor(probe: TechnicalProbe, answers: AssessmentAnswers) {
  return answers[probe.core.key] === probe.core.correctOption
    ? probe.ifCorrect
    : probe.ifIncorrect;
}

function isProbeComplete(probe: TechnicalProbe, answers: AssessmentAnswers) {
  if (!isValidTechnicalAnswer(probe.core, answers[probe.core.key])) {
    return false;
  }
  const branch = branchFor(probe, answers);
  return isValidTechnicalAnswer(branch, answers[branch.key]);
}

export function getProbeQuestion(
  probe: TechnicalProbe,
  answers: AssessmentAnswers,
): TechnicalQuestion {
  if (!isValidTechnicalAnswer(probe.core, answers[probe.core.key])) {
    return probe.core;
  }
  return branchFor(probe, answers);
}

function isCareerComplete(answers: AssessmentAnswers) {
  if (
    !INTEREST_QUESTIONS.every((question) =>
      isOptionAnswer(INTEREST_OPTIONS, answers[question.key]),
    )
  ) {
    return false;
  }

  return (
    isOptionAnswer(
      CAREER_STYLE_QUESTION.options,
      answers[CAREER_STYLE_QUESTION.key],
    ) &&
    isOptionAnswer(
      CAREER_ACTIVITY_QUESTION.options,
      answers[CAREER_ACTIVITY_QUESTION.key],
    )
  );
}

function isConstraintsComplete(answers: AssessmentAnswers) {
  return (
    parseHours(answers[CONSTRAINT_HOURS_QUESTION.key]) !== null &&
    CONSTRAINT_CHOICE_QUESTIONS.every((question) =>
      isOptionAnswer(question.options, answers[question.key]),
    )
  );
}

function isConfidenceComplete(
  section: TechnicalSection,
  answers: AssessmentAnswers,
) {
  const question = CONFIDENCE_QUESTIONS.find(
    (item) => item.section === section,
  );
  return Boolean(question && parseConfidence(answers[question.key]));
}

export function getAssessmentStep(answers: AssessmentAnswers): AssessmentStep {
  for (let sectionIndex = 0; sectionIndex < TECHNICAL_SECTIONS.length; sectionIndex++) {
    const section = TECHNICAL_SECTIONS[sectionIndex];
    const probes = TECHNICAL_PROBES.filter(
      (probe) => probe.section === section.id,
    );

    for (let probeIndex = 0; probeIndex < probes.length; probeIndex++) {
      const probe = probes[probeIndex];
      if (!isProbeComplete(probe, answers)) {
        return {
          kind: "probe",
          probe,
          section: section.id,
          sectionIndex,
          probeIndex,
          sectionProbeCount: probes.length,
        };
      }
    }

    if (!isConfidenceComplete(section.id, answers)) {
      const question = CONFIDENCE_QUESTIONS.find(
        (item) => item.section === section.id,
      );
      if (question) {
        return { kind: "confidence", section: section.id, question };
      }
    }
  }

  if (!isCareerComplete(answers)) {
    return { kind: "career" };
  }

  if (!isConstraintsComplete(answers)) {
    return { kind: "constraints" };
  }

  return { kind: "review" };
}

export function getAssessmentProgress(
  answers: AssessmentAnswers,
): AssessmentProgress {
  const totalSteps =
    TECHNICAL_PROBES.length +
    CONFIDENCE_QUESTIONS.length +
    3;

  let completedSteps = TECHNICAL_PROBES.filter((probe) =>
    isProbeComplete(probe, answers),
  ).length;

  for (const section of TECHNICAL_SECTIONS) {
    if (isConfidenceComplete(section.id, answers)) {
      completedSteps += 1;
    }
  }

  if (isCareerComplete(answers)) completedSteps += 1;
  if (isConstraintsComplete(answers)) completedSteps += 1;

  const current = getAssessmentStep(answers);
  const stepNumber = Math.min(completedSteps + 1, totalSteps);
  const reachedReview = current.kind === "review";

  return {
    current,
    completedSteps,
    totalSteps,
    stepNumber,
    percent: Math.round(
      ((completedSteps + (reachedReview ? 1 : 0)) / totalSteps) * 100,
    ),
  };
}

function validateAssessment(answers: AssessmentAnswers) {
  const missingKeys: string[] = [];
  const invalidKeys: string[] = [];

  for (const probe of TECHNICAL_PROBES) {
    const coreValue = answers[probe.core.key];
    if (!coreValue) {
      missingKeys.push(probe.core.key);
      continue;
    }
    if (!isValidTechnicalAnswer(probe.core, coreValue)) {
      invalidKeys.push(probe.core.key);
      continue;
    }

    const branch =
      coreValue === probe.core.correctOption
        ? probe.ifCorrect
        : probe.ifIncorrect;

    const branchValue = answers[branch.key];
    if (!branchValue) {
      missingKeys.push(branch.key);
    } else if (!isValidTechnicalAnswer(branch, branchValue)) {
      invalidKeys.push(branch.key);
    }
  }

  for (const question of CONFIDENCE_QUESTIONS) {
    const value = answers[question.key];
    if (!value) missingKeys.push(question.key);
    else if (!parseConfidence(value)) invalidKeys.push(question.key);
  }

  for (const question of INTEREST_QUESTIONS) {
    const value = answers[question.key];
    if (!value) missingKeys.push(question.key);
    else if (!isOptionAnswer(INTEREST_OPTIONS, value)) {
      invalidKeys.push(question.key);
    }
  }

  for (const question of [CAREER_STYLE_QUESTION, CAREER_ACTIVITY_QUESTION]) {
    const value = answers[question.key];
    if (!value) missingKeys.push(question.key);
    else if (!isOptionAnswer(question.options, value)) {
      invalidKeys.push(question.key);
    }
  }

  const hours = answers[CONSTRAINT_HOURS_QUESTION.key];
  if (!hours) missingKeys.push(CONSTRAINT_HOURS_QUESTION.key);
  else if (parseHours(hours) === null) {
    invalidKeys.push(CONSTRAINT_HOURS_QUESTION.key);
  }

  for (const question of CONSTRAINT_CHOICE_QUESTIONS) {
    const value = answers[question.key];
    if (!value) missingKeys.push(question.key);
    else if (!isOptionAnswer(question.options, value)) {
      invalidKeys.push(question.key);
    }
  }

  return { missingKeys, invalidKeys };
}

function levelFromProbe(coreCorrect: boolean, branchCorrect: boolean) {
  if (coreCorrect && branchCorrect) return "intermediate" as const;
  if (coreCorrect) return "basic" as const;
  if (branchCorrect) return "foundational" as const;
  return "none" as const;
}

function confidenceMismatchForLevel(
  confidence: ConfidenceLevel,
  level: DemonstratedLevel,
): ConfidenceMismatch {
  if (confidence >= 4 && (level === "none" || level === "foundational")) {
    return "overconfident";
  }
  if (confidence <= 2 && (level === "basic" || level === "intermediate")) {
    return "underconfident";
  }
  return null;
}

function confidenceMismatchForSection(
  confidence: ConfidenceLevel,
  percent: number,
): ConfidenceMismatch {
  if (confidence >= 4 && percent < 50) return "overconfident";
  if (confidence <= 2 && percent >= 75) return "underconfident";
  return null;
}

function formatConfidenceMismatch(
  skill: SkillResult,
): string | null {
  if (skill.confidenceMismatch === "overconfident") {
    return `${skill.skillName}: you reported ${skill.confidence}/5 confidence, but the screen demonstrated ${skill.percent}%. Test this with a small exercise before relying on it.`;
  }
  if (skill.confidenceMismatch === "underconfident") {
    return `${skill.skillName}: your answers demonstrated ${skill.percent}%, higher than your ${skill.confidence}/5 confidence. The evidence is a useful correction.`;
  }
  return null;
}

function buildSectionResults(
  answers: AssessmentAnswers,
): SectionResult[] {
  return TECHNICAL_SECTIONS.map((section) => {
    const probes = TECHNICAL_PROBES.filter(
      (probe) => probe.section === section.id,
    );
    const confidence =
      parseConfidence(
        answers[
          CONFIDENCE_QUESTIONS.find((question) => question.section === section.id)
            ?.key ?? ""
        ],
      ) ?? 3;

    let sectionScore = 0;
    const skills: SkillResult[] = [];

    for (const probe of probes) {
      const coreCorrect =
        answers[probe.core.key] === probe.core.correctOption;
      const branch = coreCorrect ? probe.ifCorrect : probe.ifIncorrect;
      const branchCorrect = answers[branch.key] === branch.correctOption;
      const score = Number(coreCorrect) + Number(branchCorrect);
      sectionScore += score;

      const level = levelFromProbe(coreCorrect, branchCorrect);
      const percent = Math.round((score / 2) * 100);
      const missed = [probe.core, branch].filter(
        (question) => answers[question.key] !== question.correctOption,
      );
      const remedialQuestion = !coreCorrect
        ? probe.core
        : !branchCorrect
          ? branch
          : null;

      for (const skillSlug of probe.skillSlugs) {
        skills.push({
          skillSlug,
          skillName: getSkillName(skillSlug),
          section: section.id,
          concept: probe.concept,
          level,
          score,
          maxScore: 2,
          percent,
          confidence,
          confidenceMismatch: confidenceMismatchForLevel(confidence, level),
          feedback: missed.map((question) => question.explanation),
          missedConcepts: missed.map((question) => question.concept),
          remedial: remedialQuestion?.remedial ?? null,
        });
      }
    }

    const maxScore = probes.length * 2;
    const percent = Math.round((sectionScore / maxScore) * 100);

    return {
      section: section.id,
      label: section.label,
      score: sectionScore,
      maxScore,
      percent,
      confidence,
      confidenceMismatch: confidenceMismatchForSection(confidence, percent),
      skills,
    };
  });
}

function buildStoredAnswers(
  answers: AssessmentAnswers,
): StoredAnswer[] {
  const stored: StoredAnswer[] = [];

  for (const section of TECHNICAL_SECTIONS) {
    const confidence =
      parseConfidence(
        answers[
          CONFIDENCE_QUESTIONS.find((question) => question.section === section.id)
            ?.key ?? ""
        ],
      ) ?? 3;
    const probes = TECHNICAL_PROBES.filter(
      (probe) => probe.section === section.id,
    );

    for (const probe of probes) {
      const coreCorrect =
        answers[probe.core.key] === probe.core.correctOption;
      const branch = coreCorrect ? probe.ifCorrect : probe.ifIncorrect;

      for (const question of [probe.core, branch]) {
        const value = answers[question.key];
        stored.push({
          section: section.id,
          questionKey: question.key,
          questionType: question.code ? "code" : "multiple_choice",
          promptText: question.prompt,
          responseValue: value,
          responseLabel:
            getQuestionOptionLabel(question.options, value) ?? value,
          isCorrect: value === question.correctOption,
          score: value === question.correctOption ? 1 : 0,
          maxScore: 1,
          selfConfidence: confidence,
          concept: question.concept,
          feedback: question.explanation,
          remedialLessonSlug: question.remedial.slug,
        });
      }
    }

    const confidenceQuestion = CONFIDENCE_QUESTIONS.find(
      (question) => question.section === section.id,
    );

    if (confidenceQuestion) {
      const value = answers[confidenceQuestion.key];
      stored.push({
        section: section.id,
        questionKey: confidenceQuestion.key,
        questionType: "self_report",
        promptText: confidenceQuestion.prompt,
        responseValue: value,
        responseLabel:
          getQuestionOptionLabel(confidenceQuestion.options, value) ?? value,
        isCorrect: null,
        score: null,
        maxScore: null,
        selfConfidence: confidence,
        concept: null,
        feedback: null,
        remedialLessonSlug: null,
      });
    }
  }

  for (const question of INTEREST_QUESTIONS) {
    const value = answers[question.key];
    stored.push({
      section: "career",
      questionKey: question.key,
      questionType: "preference",
      promptText: question.prompt,
      responseValue: value,
      responseLabel:
        getQuestionOptionLabel(INTEREST_OPTIONS, value) ?? value,
      isCorrect: null,
      score: null,
      maxScore: null,
      selfConfidence: parseConfidence(value),
      concept: null,
      feedback: null,
      remedialLessonSlug: null,
    });
  }

  for (const question of [CAREER_STYLE_QUESTION, CAREER_ACTIVITY_QUESTION]) {
    const value = answers[question.key];
    stored.push({
      section: "career",
      questionKey: question.key,
      questionType: "preference",
      promptText: question.prompt,
      responseValue: value,
      responseLabel: getQuestionOptionLabel(question.options, value) ?? value,
      isCorrect: null,
      score: null,
      maxScore: null,
      selfConfidence: null,
      concept: null,
      feedback: null,
      remedialLessonSlug: null,
    });
  }

  const hours = answers[CONSTRAINT_HOURS_QUESTION.key];
  stored.push({
    section: "constraints",
    questionKey: CONSTRAINT_HOURS_QUESTION.key,
    questionType: "short_answer",
    promptText: CONSTRAINT_HOURS_QUESTION.prompt,
    responseValue: hours,
    responseLabel: `${hours} hours per week`,
    isCorrect: null,
    score: null,
    maxScore: null,
    selfConfidence: null,
    concept: null,
    feedback: null,
    remedialLessonSlug: null,
  });

  for (const question of CONSTRAINT_CHOICE_QUESTIONS) {
    const value = answers[question.key];
    stored.push({
      section: "constraints",
      questionKey: question.key,
      questionType: "preference",
      promptText: question.prompt,
      responseValue: value,
      responseLabel: getQuestionOptionLabel(question.options, value) ?? value,
      isCorrect: null,
      score: null,
      maxScore: null,
      selfConfidence: null,
      concept: null,
      feedback: null,
      remedialLessonSlug: null,
    });
  }

  return stored;
}

function buildConstraints(answers: AssessmentAnswers): AssessmentConstraints {
  const environment =
    CONSTRAINT_CHOICE_QUESTIONS.find((q) => q.key === "environment");
  const internet =
    CONSTRAINT_CHOICE_QUESTIONS.find((q) => q.key === "internet");
  const timeline =
    CONSTRAINT_CHOICE_QUESTIONS.find((q) => q.key === "timeline");

  return {
    weeklyHours: parseHours(answers[CONSTRAINT_HOURS_QUESTION.key]) ?? 10,
    environment:
      getQuestionOptionLabel(
        environment?.options ?? [],
        answers.environment,
      ) ?? "Not specified",
    internet:
      getQuestionOptionLabel(internet?.options ?? [], answers.internet) ??
      "Not specified",
    timeline:
      getQuestionOptionLabel(timeline?.options ?? [], answers.timeline) ??
      "Not specified",
  };
}

export function evaluateAssessment(
  answers: AssessmentAnswers,
  profile: Profile | null,
): EvaluationOutcome {
  const { missingKeys, invalidKeys } = validateAssessment(answers);

  if (missingKeys.length > 0 || invalidKeys.length > 0) {
    return {
      ok: false,
      message:
        "The assessment is not complete yet. Answer every remaining question and use a valid value before submitting.",
      missingKeys,
      invalidKeys,
    };
  }

  const sections = buildSectionResults(answers);
  const score = sections.reduce((sum, section) => sum + section.score, 0);
  const maxScore = sections.reduce((sum, section) => sum + section.maxScore, 0);
  const percent = Math.round((score / maxScore) * 100);
  const confidenceValues = sections.map((section) => section.confidence);
  const confidenceAverage =
    Math.round(
      (confidenceValues.reduce((sum, value) => sum + value, 0) /
        confidenceValues.length) *
        100,
    ) / 100;

  const overallMismatch: ConfidenceMismatch =
    confidenceAverage >= 3.75 && percent < 50
      ? "overconfident"
      : confidenceAverage <= 2.25 && percent >= 75
        ? "underconfident"
        : null;

  const skills = sections.flatMap((section) => section.skills);
  const strengths = skills
    .filter(
      (skill) =>
        skill.level === "intermediate" || skill.level === "basic",
    )
    .sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level])
    .map(
      (skill) =>
        `${skill.skillName} — ${skill.percent}% on this screen${
          skill.level === "basic"
            ? "; the core concept landed but the application question did not"
            : "; confirm it with a project before calling it a strength"
        }.`,
    );

  const gaps = skills
    .filter(
      (skill) =>
        skill.level === "none" || skill.level === "foundational",
    )
    .map(
      (skill) =>
        `${skill.skillName} — ${
          skill.level === "none"
            ? "no demonstrated evidence yet"
            : "foundation partly demonstrated"
        }; the plan marks the tasks that cover it as foundation work before advanced work.`,
    );

  const applicationGaps = skills
    .filter((skill) => skill.level === "basic")
    .map(
      (skill) =>
        `${skill.skillName} — core concept demonstrated, application question missed. Practice applying it.`,
    );

  const confidenceNotes = skills
    .map(formatConfidenceMismatch)
    .filter((note): note is string => Boolean(note));

  const careerRecommendations = getCareerRecommendations({
    answers,
    sections,
    profileTarget: profile?.targetCareerSlug ?? null,
  });

  const summary = {
    version: 1 as const,
    sections,
    overall: {
      score,
      maxScore,
      percent,
      confidenceAverage,
      confidenceMismatch: overallMismatch,
    },
    strengths,
    gaps,
    applicationGaps,
    confidenceNotes,
    careerSignals: getCareerSignals(answers),
    careerStyle: getCareerStyle(answers),
    careerActivity: getCareerActivity(answers),
    careerRecommendations,
    constraints: buildConstraints(answers),
    profileTarget: profile?.targetCareerSlug ?? null,
    disclaimer: ASSESSMENT_DISCLAIMER,
  };

  const evaluation: AssessmentEvaluation = {
    summary,
    overallScore: score,
    maxScore,
    confidenceAverage,
    usedAnswers: buildStoredAnswers(answers),
  };

  return { ok: true, evaluation };
}

/**
 * Every remedial topic this result named, once each. The slug is a label from
 * the question bank — there is no lesson row behind it, so no caller may link
 * to it as though a page existed.
 */
export function getRemedialLessons(summary: AssessmentSummary) {
  const seen = new Set<string>();
  return summary.sections
    .flatMap((section) => section.skills)
    .flatMap((skill) => (skill.remedial ? [skill.remedial] : []))
    .filter((topic) => {
      if (seen.has(topic.slug)) return false;
      seen.add(topic.slug);
      return true;
    });
}

export function getDemonstratedLevelLabel(level: DemonstratedLevel) {
  switch (level) {
    case "intermediate":
      return "Intermediate (short screen)";
    case "basic":
      return "Basic";
    case "beginner":
      return "Beginner";
    case "foundational":
      return "Foundational";
    default:
      return "Not demonstrated";
  }
}

export function getSectionLabel(section: AssessmentSection) {
  return TECHNICAL_SECTIONS.find((item) => item.id === section)?.label ??
    (section === "career"
      ? "Career preferences"
      : section === "constraints"
        ? "Study constraints"
        : section);
}

export function getConfidenceLabel(value: number) {
  return (
    CONFIDENCE_OPTIONS.find((option) => option.value === String(value))?.label ??
    `${value}/5`
  );
}
