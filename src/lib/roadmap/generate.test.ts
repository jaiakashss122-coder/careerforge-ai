import { describe, expect, it } from "vitest";
import { evaluateAssessment } from "@/lib/assessment/engine";
import {
  CAREER_ACTIVITY_QUESTION,
  CAREER_STYLE_QUESTION,
  CONFIDENCE_QUESTIONS,
  CONSTRAINT_CHOICE_QUESTIONS,
  CONSTRAINT_HOURS_QUESTION,
  INTEREST_QUESTIONS,
  TECHNICAL_PROBES,
} from "@/lib/assessment/questions";
import type {
  AssessmentAnswers,
  AssessmentSummary,
} from "@/lib/assessment/types";
import type { CareerTrackSlug } from "@/lib/career/tracks";
import { generateRoadmap } from "@/lib/roadmap/generate";
import type { LearningRoadmap } from "@/lib/roadmap/types";

function wrongOption(question: (typeof TECHNICAL_PROBES)[number]["core"]) {
  return question.options.find(
    (option) => option.value !== question.correctOption,
  )!.value;
}

function buildAnswers({
  correct = true,
  confidence = "5",
}: {
  correct?: boolean;
  confidence?: "1" | "2" | "3" | "4" | "5";
} = {}): AssessmentAnswers {
  const answers: AssessmentAnswers = {};

  for (const probe of TECHNICAL_PROBES) {
    if (correct) {
      answers[probe.core.key] = probe.core.correctOption;
      answers[probe.ifCorrect.key] = probe.ifCorrect.correctOption;
    } else {
      answers[probe.core.key] = wrongOption(probe.core);
      answers[probe.ifIncorrect.key] = wrongOption(probe.ifIncorrect);
    }
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

function summaryFor(answers: AssessmentAnswers): AssessmentSummary {
  const outcome = evaluateAssessment(answers, null);
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.evaluation.summary;
}

const focusTracks: [CareerTrackSlug, CareerTrackSlug] = [
  "data-analyst",
  "data-scientist",
];

function buildRoadmap(
  summary: AssessmentSummary,
  overrides: Partial<Parameters<typeof generateRoadmap>[0]> = {},
): LearningRoadmap {
  let sequence = 0;
  return generateRoadmap({
    roadmapId: "roadmap-1",
    assessmentId: "assessment-1",
    summary,
    focusTracks,
    weeklyHours: 10,
    startDate: "2026-11-02",
    now: "2026-11-01T12:00:00.000Z",
    idFactory: () => `task-${(sequence += 1)}`,
    ...overrides,
  });
}

function taskAt(roadmap: LearningRoadmap, week: number, index = 0) {
  const task = roadmap.tasks.find(
    (entry) =>
      entry.weekNumber === week && entry.orderIndex === index,
  );
  if (!task) throw new Error(`No task at week ${week} index ${index}`);
  return task;
}

function weeklyMinutes(roadmap: LearningRoadmap, week: number) {
  return roadmap.tasks
    .filter((task) => task.weekNumber === week)
    .reduce((sum, task) => sum + task.estimatedMinutes, 0);
}

describe("roadmap generation", () => {
  it("builds a complete 13-week plan scaled to 10 hours per week", () => {
    const roadmap = buildRoadmap(summaryFor(buildAnswers()));

    expect(roadmap.tasks).toHaveLength(41);
    expect(roadmap.summary.totalWeeks).toBe(13);
    expect(roadmap.summary.weeks).toHaveLength(13);
    expect(roadmap.startDate).toBe("2026-11-02");
    expect(roadmap.endDate).toBe("2027-01-31");
    expect(roadmap.summary.weeklyHours).toBe(10);
    expect(roadmap.summary.totalMinutes).toBe(7800);
    expect(roadmap.tasks.every((task) => task.estimatedMinutes >= 15)).toBe(true);

    for (let week = 1; week <= 13; week += 1) {
      expect(weeklyMinutes(roadmap, week)).toBe(600);
    }
  });

  it("scales every week to a lower stated availability", () => {
    const roadmap = buildRoadmap(summaryFor(buildAnswers()), {
      weeklyHours: 5,
    });

    expect(roadmap.summary.weeklyHours).toBe(5);
    expect(roadmap.summary.totalMinutes).toBe(3900);
    for (let week = 1; week <= 13; week += 1) {
      expect(weeklyMinutes(roadmap, week)).toBe(300);
    }
  });

  it("tests exactly the two selected tracks in weeks 11 and 12", () => {
    const roadmap = buildRoadmap(summaryFor(buildAnswers()));

    expect(roadmap.focusTracks).toEqual(["data-analyst", "data-scientist"]);
    expect(roadmap.summary.weeks[10].title).toContain("Data Analyst");
    expect(roadmap.summary.weeks[11].title).toContain("Data Scientist");
    expect(taskAt(roadmap, 11, 0).category).toBe("experiment");
    expect(taskAt(roadmap, 11, 2).category).toBe("review");
    expect(taskAt(roadmap, 12, 0).category).toBe("experiment");
    expect(taskAt(roadmap, 13, 2).category).toBe("checkpoint");
    expect(taskAt(roadmap, 11, 0).title).toContain("Data Analyst");
    expect(taskAt(roadmap, 12, 0).title).toContain("Data Scientist");
  });

  it("rejects anything other than two distinct tracks", () => {
    const summary = summaryFor(buildAnswers());

    expect(() =>
      buildRoadmap(summary, { focusTracks: ["data-analyst"] }),
    ).toThrow(/two different career tracks/);
    expect(() =>
      buildRoadmap(summary, {
        focusTracks: ["data-analyst", "data-analyst"],
      }),
    ).toThrow(/two different career tracks/);
  });

  it("wires within-week, cross-week, experiment, and checkpoint prerequisites", () => {
    const roadmap = buildRoadmap(summaryFor(buildAnswers()));
    const first = taskAt(roadmap, 1, 0);
    const weekTwoStart = taskAt(roadmap, 2, 0);
    const experimentOne = taskAt(roadmap, 11, 0);
    const reflectionOne = taskAt(roadmap, 11, 2);
    const reflectionTwo = taskAt(roadmap, 12, 2);
    const comparison = taskAt(roadmap, 13, 1);

    expect(first.prerequisiteIds).toHaveLength(0);
    expect(taskAt(roadmap, 1, 1).prerequisiteIds).toContain(first.id);
    expect(weekTwoStart.prerequisiteIds).toContain(taskAt(roadmap, 1, 2).id);
    expect(experimentOne.prerequisiteIds.length).toBeGreaterThanOrEqual(2);
    expect(experimentOne.prerequisiteIds).toContain(taskAt(roadmap, 10, 2).id);
    expect(comparison.prerequisiteIds).toContain(reflectionOne.id);
    expect(comparison.prerequisiteIds).toContain(reflectionTwo.id);

    const ids = new Set(roadmap.tasks.map((task) => task.id));
    for (const task of roadmap.tasks) {
      for (const prerequisiteId of task.prerequisiteIds) {
        expect(ids.has(prerequisiteId)).toBe(true);
        expect(prerequisiteId).not.toBe(task.id);
      }
    }
  });

  it("adds foundation focus and honest gap notes when the screen shows gaps", () => {
    const roadmap = buildRoadmap(summaryFor(buildAnswers({ correct: false })));

    for (const task of roadmap.tasks.filter(
      (entry) => entry.skillSlug === "python-basics",
    )) {
      expect(task.resources.focus).toBe("foundation");
      expect(task.resources.assessmentGap).toContain("Assessment gap");
    }

    const setup = taskAt(roadmap, 1, 0);
    expect(setup.resources.sessionPlan.learn[0]).toContain("Foundation first");
    expect(setup.resources.sessionPlan.exercise).toContain("not mark it as mastered");
  });

  it("marks demonstrated skills as refresh, not mastery", () => {
    const roadmap = buildRoadmap(summaryFor(buildAnswers()));
    const sqlTask = taskAt(roadmap, 5, 0);

    expect(sqlTask.skillSlug).toBe("sql-filtering");
    expect(sqlTask.resources.focus).toBe("refresh");
    expect(sqlTask.resources.assessmentGap).toContain(
      "Demonstrated on the screen",
    );
    expect(sqlTask.resources.assessmentGap).toContain("not a certification");
  });

  it("provides a 30-day subset and honest constraint notes", () => {
    const roadmap = buildRoadmap(summaryFor(buildAnswers()));

    expect(roadmap.summary.thirtyDayPlan).toHaveLength(4);
    expect(roadmap.summary.thirtyDayPlan[0].delayLabel).toBe("Days 1–7");
    expect(roadmap.summary.thirtyDayPlan[3].delayLabel).toBe("Days 22–30");
    expect(
      roadmap.summary.thirtyDayPlan.reduce(
        (sum, item) => sum + item.minutes,
        0,
      ),
    ).toBe(2400);
    expect(roadmap.summary.constraintNotes.join(" ")).toContain(
      "not recorded study time",
    );
    expect(roadmap.summary.disclaimer).toContain("does not automatically verify");
  });

  it("gives every task a session plan with learn, exercise, check, and revision", () => {
    const roadmap = buildRoadmap(summaryFor(buildAnswers()));

    for (const task of roadmap.tasks) {
      expect(task.resources.sessionPlan.learn.length).toBeGreaterThan(0);
      expect(task.resources.sessionPlan.exercise.length).toBeGreaterThan(20);
      expect(task.resources.sessionPlan.check.length).toBeGreaterThan(0);
      expect(task.resources.sessionPlan.revision.length).toBeGreaterThan(10);
      expect(task.status).toBe("pending");
      expect(task.completedAt).toBeNull();
    }

    const apiTask = taskAt(roadmap, 4, 3);
    expect(apiTask.title).toContain("HTTP API");
    expect(apiTask.resources.links[0].href).toContain("developer.mozilla.org");
  });
});
