import { describe, expect, it } from "vitest";
import {
  getAssessmentProgress,
  getAssessmentStep,
  getProbeQuestion,
  evaluateAssessment,
  orderQuestionOptions,
} from "@/lib/assessment/engine";
import {
  CAREER_ACTIVITY_QUESTION,
  CAREER_STYLE_QUESTION,
  CONFIDENCE_QUESTIONS,
  CONSTRAINT_CHOICE_QUESTIONS,
  CONSTRAINT_HOURS_QUESTION,
  INTEREST_OPTIONS,
  INTEREST_QUESTIONS,
  TECHNICAL_PROBES,
} from "@/lib/assessment/questions";
import type {
  AssessmentAnswers,
  TechnicalQuestion,
} from "@/lib/assessment/types";

function wrongOption(question: TechnicalQuestion) {
  const option = question.options.find(
    (candidate) => candidate.value !== question.correctOption,
  );
  if (!option) throw new Error(`No wrong option for ${question.key}`);
  return option.value;
}

function buildAnswers({
  core = "correct",
  branch = "correct",
  confidence = "5",
}: {
  core?: "correct" | "wrong";
  branch?: "correct" | "wrong";
  confidence?: "1" | "2" | "3" | "4" | "5";
} = {}): AssessmentAnswers {
  const answers: AssessmentAnswers = {};

  for (const probe of TECHNICAL_PROBES) {
    answers[probe.core.key] =
      core === "correct" ? probe.core.correctOption : wrongOption(probe.core);
    const branchQuestion =
      core === "correct" ? probe.ifCorrect : probe.ifIncorrect;
    answers[branchQuestion.key] =
      branch === "correct"
        ? branchQuestion.correctOption
        : wrongOption(branchQuestion);
  }

  for (const question of CONFIDENCE_QUESTIONS) {
    answers[question.key] = confidence;
  }

  for (const question of INTEREST_QUESTIONS) {
    answers[question.key] = "4";
  }

  answers[CAREER_STYLE_QUESTION.key] = "code";
  answers[CAREER_ACTIVITY_QUESTION.key] = "build-app";
  answers[CONSTRAINT_HOURS_QUESTION.key] = "10";

  for (const question of CONSTRAINT_CHOICE_QUESTIONS) {
    answers[question.key] = question.options[0].value;
  }

  return answers;
}

function getSkill(
  answers: AssessmentAnswers,
  skillSlug: string,
) {
  const outcome = evaluateAssessment(answers, null);
  if (!outcome.ok) throw new Error(outcome.message);
  const skill = outcome.evaluation.summary.sections
    .flatMap((section) => section.skills)
    .find((entry) => entry.skillSlug === skillSlug);
  if (!skill) throw new Error(`Skill ${skillSlug} not found`);
  return { outcome, skill };
}

describe("assessment flow", () => {
  it("starts with the first probe and has 20 flow steps", () => {
    const progress = getAssessmentProgress({});
    expect(progress.totalSteps).toBe(20);
    expect(progress.stepNumber).toBe(1);
    expect(progress.percent).toBe(0);
    expect(progress.current.kind).toBe("probe");
    if (progress.current.kind === "probe") {
      expect(progress.current.probe.id).toBe(TECHNICAL_PROBES[0].id);
    }
  });

  it("branches to the application question when the core answer is correct", () => {
    const firstProbe = TECHNICAL_PROBES[0];
    const answers: AssessmentAnswers = {
      [firstProbe.core.key]: firstProbe.core.correctOption,
    };

    const question = getProbeQuestion(firstProbe, answers);
    expect(question.key).toBe(firstProbe.ifCorrect.key);
    expect(question.difficulty).toBe("application");
  });

  it("branches to the foundation question when the core answer is wrong", () => {
    const firstProbe = TECHNICAL_PROBES[0];
    const answers: AssessmentAnswers = {
      [firstProbe.core.key]: wrongOption(firstProbe.core),
    };

    const question = getProbeQuestion(firstProbe, answers);
    expect(question.key).toBe(firstProbe.ifIncorrect.key);
    expect(question.difficulty).toBe("foundation");
  });

  it("does not advance until the adaptive branch is answered", () => {
    const firstProbe = TECHNICAL_PROBES[0];
    const answers: AssessmentAnswers = {
      [firstProbe.core.key]: firstProbe.core.correctOption,
    };

    const stillFirst = getAssessmentStep(answers);
    expect(stillFirst.kind).toBe("probe");
    if (stillFirst.kind === "probe") {
      expect(stillFirst.probe.id).toBe(firstProbe.id);
    }

    answers[firstProbe.ifCorrect.key] = firstProbe.ifCorrect.correctOption;
    const second = getAssessmentStep(answers);
    expect(second.kind).toBe("probe");
    if (second.kind === "probe") {
      expect(second.probe.id).toBe(TECHNICAL_PROBES[1].id);
    }
  });

  it("reports review with 100% once every question is answered", () => {
    const progress = getAssessmentProgress(buildAnswers());
    expect(progress.current.kind).toBe("review");
    expect(progress.stepNumber).toBe(20);
    expect(progress.percent).toBe(100);
  });
});

describe("assessment scoring", () => {
  it("rejects an incomplete assessment with missing keys", () => {
    const outcome = evaluateAssessment({}, null);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.missingKeys.length).toBeGreaterThan(0);
      expect(outcome.message).toContain("not complete");
    }
  });

  it("caps a fully correct screen at 26 points without claiming mastery", () => {
    const outcome = evaluateAssessment(buildAnswers(), null);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.evaluation.overallScore).toBe(26);
    expect(outcome.evaluation.maxScore).toBe(26);
    expect(outcome.evaluation.summary.overall.percent).toBe(100);
    expect(outcome.evaluation.summary.overall.confidenceMismatch).toBeNull();
    expect(outcome.evaluation.summary.gaps).toHaveLength(0);
    expect(outcome.evaluation.summary.disclaimer).toContain(
      "does not verify mastery",
    );
  });

  it("scores foundational knowledge when the core answer is missed but the foundation answer is right", () => {
    const answers = buildAnswers();
    const firstProbe = TECHNICAL_PROBES[0];
    answers[firstProbe.core.key] = wrongOption(firstProbe.core);
    answers[firstProbe.ifIncorrect.key] =
      firstProbe.ifIncorrect.correctOption;
    answers[firstProbe.ifCorrect.key] = firstProbe.ifCorrect.correctOption;

    const { skill, outcome } = getSkill(answers, "python-basics");
    expect(skill.level).toBe("foundational");
    expect(skill.percent).toBe(50);
    expect(skill.missedConcepts.length).toBeGreaterThan(0);
    expect(skill.remedial?.slug).toBe(firstProbe.core.remedial.slug);
    expect(skill.confidenceMismatch).toBe("overconfident");
    expect(outcome.evaluation.summary.gaps.join(" ")).toContain("Python basics");
  });

  it("flags a basic result when the application question is missed", () => {
    const answers = buildAnswers();
    const firstProbe = TECHNICAL_PROBES[0];
    answers[firstProbe.ifCorrect.key] = wrongOption(firstProbe.ifCorrect);

    const { skill, outcome } = getSkill(answers, "python-basics");
    expect(skill.level).toBe("basic");
    expect(skill.remedial?.slug).toBe(firstProbe.ifCorrect.remedial.slug);
    expect(outcome.evaluation.summary.applicationGaps.join(" ")).toContain(
      "Python basics",
    );
  });

  it("keeps demonstrated scores separate from low confidence", () => {
    const outcome = evaluateAssessment(buildAnswers({ confidence: "1" }), null);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.evaluation.overallScore).toBe(26);
    expect(outcome.evaluation.confidenceAverage).toBe(1);
    expect(outcome.evaluation.summary.overall.confidenceMismatch).toBe(
      "underconfident",
    );
    expect(outcome.evaluation.summary.confidenceNotes.length).toBeGreaterThan(0);
  });

  it("flags overconfidence when claims exceed demonstrated evidence", () => {
    const outcome = evaluateAssessment(
      buildAnswers({ core: "wrong", branch: "wrong", confidence: "5" }),
      null,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.evaluation.overallScore).toBe(0);
    expect(outcome.evaluation.summary.overall.confidenceMismatch).toBe(
      "overconfident",
    );
    expect(outcome.evaluation.summary.gaps.length).toBeGreaterThan(0);
  });

  it("stores one response per question taken, including preferences and constraints", () => {
    const outcome = evaluateAssessment(buildAnswers(), null);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const answers = outcome.evaluation.usedAnswers;
    expect(answers).toHaveLength(42);
    expect(answers.filter((answer) => answer.section === "career")).toHaveLength(
      8,
    );
    expect(
      answers.filter((answer) => answer.section === "constraints"),
    ).toHaveLength(4);
    expect(
      answers.filter((answer) => answer.questionKey === "python-basics-core"),
    ).toHaveLength(1);
    expect(
      answers.filter((answer) => answer.questionKey === "python-basics-application"),
    ).toHaveLength(1);
    expect(
      answers.filter((answer) => answer.questionKey === "python-basics-foundation"),
    ).toHaveLength(0);
  });

  it("generates three unique career recommendations and reflects constraints", () => {
    const outcome = evaluateAssessment(buildAnswers(), null);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const recommendations = outcome.evaluation.summary.careerRecommendations;
    expect(recommendations).toHaveLength(3);
    expect(new Set(recommendations.map((entry) => entry.slug)).size).toBe(3);
    expect(recommendations[0].reasons.length).toBeGreaterThan(0);
    expect(outcome.evaluation.summary.constraints.weeklyHours).toBe(10);
    expect(outcome.evaluation.summary.careerSignals).toHaveLength(6);
    expect(
      INTEREST_OPTIONS.some(
        (option) => option.value === buildAnswers()["interest-ai-systems"],
      ),
    ).toBe(true);
  });
});

describe("question option order", () => {
  const questions = TECHNICAL_PROBES.flatMap((probe) => [
    probe.core,
    probe.ifCorrect,
    probe.ifIncorrect,
  ]);

  it("keeps every option and pins the not-sure choice last", () => {
    for (const question of questions) {
      const ordered = orderQuestionOptions(question.key, question.options);

      expect(ordered).toHaveLength(question.options.length);
      expect(new Set(ordered.map((option) => option.value))).toEqual(
        new Set(question.options.map((option) => option.value)),
      );
      expect(ordered.at(-1)?.value).toBe("not-sure");
      expect(
        ordered.some((option) => option.value === question.correctOption),
      ).toBe(true);
    }
  });

  it("is deterministic and spreads correct answers across positions", () => {
    const positions = questions.map((question) => {
      const first = orderQuestionOptions(question.key, question.options);
      const second = orderQuestionOptions(question.key, question.options);

      expect(second.map((option) => option.value)).toEqual(
        first.map((option) => option.value),
      );

      return first.findIndex(
        (option) => option.value === question.correctOption,
      );
    });

    expect(new Set(positions).size).toBeGreaterThan(1);
    expect(positions.filter((position) => position === 0).length).toBeLessThan(
      questions.length,
    );
  });
});
