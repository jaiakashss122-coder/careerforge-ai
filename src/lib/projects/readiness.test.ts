import { describe, expect, it } from "vitest";
import {
  emptySummary,
  makeMilestone,
  makeProject,
  makeRoadmap,
  makeSection,
  makeSkillResult,
  makeTask,
  recommendation,
} from "@/lib/test-support/fixtures";
import {
  PREREQUISITE_PERCENT_THRESHOLD,
  buildProjectEvidence,
  buildReadinessContext,
  evaluateProjectCompletion,
  evaluateProjectReadiness,
  recommendProjects,
  summariseRubric,
} from "./readiness";
import { PROJECT_RUBRIC } from "./types";
import { getProjectTemplate } from "./templates";

function template(slug: string) {
  const found = getProjectTemplate(slug);

  if (!found) {
    throw new Error(`Missing test template ${slug}`);
  }

  return found;
}

const emptyContext = () =>
  buildReadinessContext({
    assessment: null,
    roadmap: null,
    projects: [],
    weeklyHours: 10,
  });

describe("buildReadinessContext", () => {
  it("records assessment percents and flags gap skills", () => {
    const context = buildReadinessContext({
      assessment: emptySummary({
        sections: [
          makeSection("programming", [
            makeSkillResult({
              skillSlug: "python-basics",
              percent: 80,
              level: "intermediate",
            }),
            makeSkillResult({
              skillSlug: "python-debugging",
              percent: 10,
              level: "none",
            }),
          ]),
        ],
      }),
      roadmap: null,
      projects: [],
      weeklyHours: 10,
    });

    expect(context.signals["python-basics"].assessmentPercent).toBe(80);
    expect(context.gapSkillSlugs).toEqual(["python-debugging"]);
  });

  it("counts only completed roadmap tasks that name a skill", () => {
    const context = buildReadinessContext({
      assessment: null,
      roadmap: makeRoadmap([
        makeTask({ id: "a", skillSlug: "pandas", status: "completed" }),
        makeTask({ id: "b", skillSlug: "pandas", status: "completed" }),
        makeTask({ id: "c", skillSlug: "pandas", status: "pending" }),
        makeTask({ id: "d", skillSlug: null, status: "completed" }),
      ]),
      projects: [],
      weeklyHours: 10,
    });

    expect(context.signals.pandas.completedPracticeTasks).toBe(2);
  });

  it("counts project evidence only for completed projects", () => {
    const context = buildReadinessContext({
      assessment: null,
      roadmap: null,
      projects: [
        makeProject({
          id: "p1",
          templateSlug: "sql-business-insights",
          status: "completed",
        }),
        makeProject({
          id: "p2",
          templateSlug: "personal-expense-analysis",
          status: "in_progress",
        }),
      ],
      weeklyHours: 10,
    });

    expect(context.completedProjectCount).toBe(1);
    expect(context.signals["sql-joins"].completedProjects).toBe(1);
    expect(context.signals.pandas).toBeUndefined();
    expect(context.startedTemplateSlugs).toEqual([
      "sql-business-insights",
      "personal-expense-analysis",
    ]);
  });

  it("never lets weekly hours fall to zero", () => {
    const context = buildReadinessContext({
      assessment: null,
      roadmap: null,
      projects: [],
      weeklyHours: 0,
    });

    expect(context.weeklyHours).toBe(1);
  });
});

describe("evaluateProjectReadiness", () => {
  it("locks a project when no evidence exists for its prerequisites", () => {
    const readiness = evaluateProjectReadiness(
      template("personal-expense-analysis"),
      emptyContext(),
    );

    expect(readiness.locked).toBe(true);
    expect(readiness.unmetPrerequisites.map((p) => p.skillSlug)).toEqual([
      "python-basics",
    ]);
    expect(readiness.lockReasons[0]).toContain("prerequisite");
  });

  it("unlocks on a passing assessment score", () => {
    const readiness = evaluateProjectReadiness(
      template("personal-expense-analysis"),
      buildReadinessContext({
        assessment: emptySummary({
          sections: [
            makeSection("programming", [
              makeSkillResult({
                skillSlug: "python-basics",
                percent: PREREQUISITE_PERCENT_THRESHOLD,
              }),
            ]),
          ],
        }),
        roadmap: null,
        projects: [],
        weeklyHours: 10,
      }),
    );

    expect(readiness.locked).toBe(false);
    expect(readiness.prerequisites[0].reason).toContain("60%");
  });

  it("unlocks on completed roadmap practice when the score is low", () => {
    const readiness = evaluateProjectReadiness(
      template("personal-expense-analysis"),
      buildReadinessContext({
        assessment: emptySummary({
          sections: [
            makeSection("programming", [
              makeSkillResult({
                skillSlug: "python-basics",
                percent: 20,
                level: "foundational",
              }),
            ]),
          ],
        }),
        roadmap: makeRoadmap([
          makeTask({ id: "a", skillSlug: "python-basics", status: "completed" }),
        ]),
        projects: [],
        weeklyHours: 10,
      }),
    );

    expect(readiness.locked).toBe(false);
    expect(readiness.prerequisites[0].reason).toContain("roadmap task");
  });

  it("explains a below-threshold score instead of staying silent", () => {
    const readiness = evaluateProjectReadiness(
      template("personal-expense-analysis"),
      buildReadinessContext({
        assessment: emptySummary({
          sections: [
            makeSection("programming", [
              makeSkillResult({ skillSlug: "python-basics", percent: 33 }),
            ]),
          ],
        }),
        roadmap: null,
        projects: [],
        weeklyHours: 10,
      }),
    );

    expect(readiness.locked).toBe(true);
    expect(readiness.unmetPrerequisites[0].reason).toContain("33%");
  });

  it("keeps advanced projects locked until earlier projects are completed", () => {
    const pipeline = template("batch-data-pipeline");
    const context = buildReadinessContext({
      assessment: emptySummary({
        sections: [
          makeSection(
            "software-development",
            pipeline.prerequisiteSkillSlugs.map((slug) =>
              makeSkillResult({ skillSlug: slug, percent: 95 }),
            ),
          ),
        ],
      }),
      roadmap: null,
      projects: [],
      weeklyHours: 10,
    });

    const readiness = evaluateProjectReadiness(pipeline, context);

    expect(readiness.unmetPrerequisites).toHaveLength(0);
    expect(readiness.locked).toBe(true);
    expect(readiness.lockReasons.join(" ")).toContain("completed projects");
  });

  it("reports time fit against real weekly hours without locking", () => {
    const tight = evaluateProjectReadiness(template("churn-prediction"), {
      ...emptyContext(),
      weeklyHours: 2,
    });
    const roomy = evaluateProjectReadiness(template("churn-prediction"), {
      ...emptyContext(),
      weeklyHours: 20,
    });

    expect(tight.timeFit.estimatedWeeks).toBe(11);
    expect(tight.timeFit.comfortable).toBe(false);
    expect(tight.timeFit.note).toContain("raise your weekly hours");
    expect(roomy.timeFit.comfortable).toBe(true);
    expect(roomy.lockReasons.join(" ")).not.toContain("weekly hours");
  });
});

describe("recommendProjects", () => {
  it("prefers unlocked projects and explains why", () => {
    const context = buildReadinessContext({
      assessment: emptySummary({
        sections: [
          makeSection("sql", [
            makeSkillResult({ skillSlug: "sql-filtering", percent: 90 }),
            makeSkillResult({ skillSlug: "sql-aggregation", percent: 85 }),
            makeSkillResult({
              skillSlug: "sql-joins",
              percent: 0,
              level: "none",
            }),
          ]),
        ],
        careerRecommendations: [recommendation("data-analyst", 80)],
      }),
      roadmap: null,
      projects: [],
      weeklyHours: 10,
    });

    const [top] = recommendProjects(context, { limit: 3 });

    expect(top.templateSlug).toBe("sql-business-insights");
    expect(top.readiness.locked).toBe(false);
    expect(top.reasons.join(" ")).toContain("career");
    expect(top.reasons.join(" ")).toContain("SQL joins");
    expect(top.fitScore).toBeGreaterThan(0);
  });

  it("never recommends a project that is already started", () => {
    const context = buildReadinessContext({
      assessment: emptySummary({
        sections: [
          makeSection("sql", [
            makeSkillResult({ skillSlug: "sql-filtering", percent: 90 }),
            makeSkillResult({ skillSlug: "sql-aggregation", percent: 85 }),
          ]),
        ],
      }),
      roadmap: null,
      projects: [
        makeProject({
          id: "p1",
          templateSlug: "sql-business-insights",
          status: "in_progress",
        }),
      ],
      weeklyHours: 10,
    });

    const slugs = recommendProjects(context, { limit: 10 }).map(
      (entry) => entry.templateSlug,
    );

    expect(slugs).not.toContain("sql-business-insights");
  });

  it("still returns locked suggestions with their blockers when nothing is ready", () => {
    const results = recommendProjects(emptyContext(), { limit: 2 });

    expect(results).toHaveLength(2);
    expect(results.every((entry) => entry.readiness.locked)).toBe(true);
    expect(results[0].reasons.join(" ")).toContain("prerequisite");
  });

  it("honours the limit", () => {
    expect(recommendProjects(emptyContext(), { limit: 1 })).toHaveLength(1);
  });
});

describe("evaluateProjectCompletion", () => {
  it("blocks completion while milestones are open", () => {
    const check = evaluateProjectCompletion(
      makeProject({
        id: "p1",
        templateSlug: "personal-expense-analysis",
        repoUrl: "https://example.com/repo",
        milestones: [
          makeMilestone({ id: "scope", status: "completed" }),
          makeMilestone({ id: "ingest", status: "in_progress" }),
        ],
      }),
    );

    expect(check.eligible).toBe(false);
    expect(check.blockers.join(" ")).toContain("1 milestone is still open");
  });

  it("blocks completion without a repository link", () => {
    const check = evaluateProjectCompletion(
      makeProject({
        id: "p1",
        templateSlug: "personal-expense-analysis",
        milestones: [makeMilestone({ id: "scope", status: "completed" })],
      }),
    );

    expect(check.eligible).toBe(false);
    expect(check.blockers.join(" ")).toContain("repository link");
  });

  it("blocks a project that has no milestones at all", () => {
    const check = evaluateProjectCompletion(
      makeProject({ id: "p1", repoUrl: "https://example.com/repo" }),
    );

    expect(check.eligible).toBe(false);
    expect(check.blockers.join(" ")).toContain("no milestones");
  });

  it("allows completion once every milestone is done and a repo is linked", () => {
    const check = evaluateProjectCompletion(
      makeProject({
        id: "p1",
        templateSlug: "personal-expense-analysis",
        repoUrl: "https://example.com/repo",
        milestones: [
          makeMilestone({ id: "scope", status: "completed" }),
          makeMilestone({ id: "ingest", status: "completed" }),
        ],
      }),
    );

    expect(check.eligible).toBe(true);
    expect(check.blockers).toEqual([]);
  });
});

describe("summariseRubric", () => {
  it("returns an empty summary when nothing is scored", () => {
    const summary = summariseRubric(null);

    expect(summary.completed).toBe(false);
    expect(summary.percent).toBe(0);
    expect(summary.scored).toEqual([]);
  });

  it("scores only the criteria that were answered", () => {
    const summary = summariseRubric({
      version: 1,
      scores: { "problem-framing": 3, testing: 1 },
      reflection: "",
      updatedAt: "2026-11-01T12:00:00.000Z",
    });

    expect(summary.completed).toBe(false);
    expect(summary.total).toBe(4);
    expect(summary.maxTotal).toBe(6);
    expect(summary.percent).toBe(67);
  });

  it("marks the rubric complete only when every criterion has a score", () => {
    const summary = summariseRubric({
      version: 1,
      scores: Object.fromEntries(
        PROJECT_RUBRIC.map((criterion) => [criterion.key, 2]),
      ),
      reflection: "",
      updatedAt: "2026-11-01T12:00:00.000Z",
    });

    expect(summary.completed).toBe(true);
    expect(summary.percent).toBe(67);
  });
});

describe("buildProjectEvidence", () => {
  const completedProject = () =>
    makeProject({
      id: "p1",
      templateSlug: "personal-expense-analysis",
      status: "completed",
      repoUrl: "https://example.com/repo",
      milestones: template("personal-expense-analysis").milestones.map(
        (milestone, index) =>
          makeMilestone({
            id: milestone.key,
            orderIndex: index,
            status: "completed",
          }),
      ),
    });

  it("produces no evidence until the work is actually submitted", () => {
    expect(
      buildProjectEvidence(
        makeProject({
          id: "p1",
          templateSlug: "personal-expense-analysis",
          status: "completed",
        }),
      ),
    ).toEqual([]);
  });

  it("produces no evidence for a project without a known template", () => {
    expect(
      buildProjectEvidence(
        makeProject({
          id: "p1",
          repoUrl: "https://example.com/repo",
          milestones: [makeMilestone({ id: "a", status: "completed" })],
        }),
      ),
    ).toEqual([]);
  });

  it("records unverified project evidence for every template skill", () => {
    const evidence = buildProjectEvidence(completedProject());

    expect(evidence.map((entry) => entry.skillSlug)).toEqual(
      template("personal-expense-analysis").skillSlugs,
    );

    for (const entry of evidence) {
      expect(entry.sourceType).toBe("project");
      expect(entry.evidenceLevel).toBe("project_evidence");
      expect(entry.verified).toBe(false);
      expect(entry.notes).toContain("Self-assessed");
      expect(entry.score).toBeNull();
    }
  });

  it("attaches the rubric percent when the learner scored their work", () => {
    const project = completedProject();
    const evidence = buildProjectEvidence({
      ...project,
      selfAssessment: {
        version: 1,
        scores: Object.fromEntries(
          PROJECT_RUBRIC.map((criterion) => [criterion.key, 3]),
        ),
        reflection: "Done.",
        updatedAt: "2026-11-01T12:00:00.000Z",
      },
    });

    expect(evidence[0].score).toBe(100);
    expect(evidence[0].verified).toBe(false);
  });
});
