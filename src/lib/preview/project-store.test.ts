import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deletePreviewProject,
  loadPreviewWorkspace,
  savePreviewProjectRubric,
  savePreviewWorkspace,
  setPreviewMilestoneStatus,
  setPreviewProjectLinks,
  setPreviewProjectStatus,
  startPreviewProject,
} from "@/lib/preview/workspace-store";
import {
  emptySummary,
  makeRoadmap,
  makeSection,
  makeSkillResult,
  makeTask,
  MemoryStorage,
} from "@/lib/test-support/fixtures";
import { getProjectTemplate } from "@/lib/projects/templates";

const WEEKLY_HOURS = 10;

function setup(input: {
  tasks?: ReturnType<typeof makeTask>[];
  assessment?: ReturnType<typeof emptySummary>;
} = {}) {
  vi.stubGlobal("window", {
    localStorage: new MemoryStorage(),
    dispatchEvent: vi.fn(),
  });

  savePreviewWorkspace({
    assessments: input.assessment
      ? [
          {
            id: "assessment-1",
            type: "initial",
            overallScore: 0,
            maxScore: 0,
            confidenceAverage: 3,
            summary: input.assessment,
            answers: [],
            startedAt: "2026-11-01T12:00:00.000Z",
            completedAt: "2026-11-01T12:00:00.000Z",
            createdAt: "2026-11-01T12:00:00.000Z",
          },
        ]
      : [],
    roadmaps: [makeRoadmap(input.tasks ?? [])],
    sessions: [],
    projects: [],
    evidence: [],
    careerExperiments: [],
    careerPreferences: [],
  });
}

function startAndReturnId(slug: string) {
  const result = startPreviewProject({
    templateSlug: slug,
    weeklyHours: WEEKLY_HOURS,
  });

  if (!result.ok) {
    throw new Error(`Expected start to succeed, got: ${result.message}`);
  }

  return result.project.id;
}

function completeEveryMilestone(projectId: string) {
  const project = loadPreviewWorkspace().projects.find(
    (entry) => entry.id === projectId,
  );

  if (!project) throw new Error("Project disappeared");

  for (const milestone of project.milestones) {
    const result = setPreviewMilestoneStatus({
      projectId,
      milestoneId: milestone.id,
      completed: true,
      evidenceUrl: `https://example.com/${milestone.id}`,
    });

    if (!result.ok) {
      throw new Error(`Milestone ${milestone.id} failed: ${result.message}`);
    }
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-05T09:00:00.000Z"));
});

describe("startPreviewProject", () => {
  it("refuses a project whose prerequisites have no evidence", () => {
    setup();

    const result = startPreviewProject({
      templateSlug: "personal-expense-analysis",
      weeklyHours: WEEKLY_HOURS,
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.message).toContain("Python basics");
    }

    expect(loadPreviewWorkspace().projects).toHaveLength(0);
  });

  it("unlocks when a completed roadmap task covers the prerequisite", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });

    const result = startPreviewProject({
      templateSlug: "personal-expense-analysis",
      weeklyHours: WEEKLY_HOURS,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.project.milestones).toHaveLength(
        getProjectTemplate("personal-expense-analysis")!.milestones.length,
      );
      expect(result.project.milestones[0].templateKey).toBe("scope");
      expect(result.project.status).toBe("planned");
    }
  });

  it("unlocks on a passing assessment score", () => {
    setup({
      assessment: emptySummary({
        sections: [
          makeSection("sql", [
            makeSkillResult({ skillSlug: "sql-filtering", percent: 80 }),
            makeSkillResult({ skillSlug: "sql-aggregation", percent: 75 }),
          ]),
        ],
      }),
    });

    expect(
      startPreviewProject({
        templateSlug: "sql-business-insights",
        weeklyHours: WEEKLY_HOURS,
      }).ok,
    ).toBe(true);
  });

  it("rejects an unknown template and a duplicate start", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });

    expect(
      startPreviewProject({ templateSlug: "nope", weeklyHours: WEEKLY_HOURS }).ok,
    ).toBe(false);

    startPreviewProject({
      templateSlug: "personal-expense-analysis",
      weeklyHours: WEEKLY_HOURS,
    });

    const duplicate = startPreviewProject({
      templateSlug: "personal-expense-analysis",
      weeklyHours: WEEKLY_HOURS,
    });

    expect(duplicate.ok).toBe(false);

    if (!duplicate.ok) {
      expect(duplicate.message).toContain("already have this project");
    }
  });
});

describe("setPreviewMilestoneStatus", () => {
  it("requires a link to the produced work before a milestone can complete", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");

    const first = loadPreviewWorkspace().projects[0].milestones[0];

    const blocked = setPreviewMilestoneStatus({
      projectId,
      milestoneId: first.id,
      completed: true,
      evidenceUrl: "   ",
    });

    expect(blocked.ok).toBe(false);

    if (!blocked.ok) {
      expect(blocked.message ?? "").toContain("work you produced");
    }

    expect(
      loadPreviewWorkspace().projects[0].milestones[0].status,
    ).toBe("pending");
  });

  it("enforces milestone order", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    const milestones = loadPreviewWorkspace().projects[0].milestones;

    const skipped = setPreviewMilestoneStatus({
      projectId,
      milestoneId: milestones[3].id,
      completed: true,
      evidenceUrl: "https://example.com/x",
    });

    expect(skipped.ok).toBe(false);

    if (!skipped.ok) {
      expect(skipped.message).toContain("ordered");
    }
  });

  it("moves a planned project to in progress on the first completed milestone", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    const first = loadPreviewWorkspace().projects[0].milestones[0];

    expect(
      setPreviewMilestoneStatus({
        projectId,
        milestoneId: first.id,
        completed: true,
        evidenceUrl: "https://example.com/one",
      }).ok,
    ).toBe(true);

    const project = loadPreviewWorkspace().projects[0];
    expect(project.status).toBe("in_progress");
    expect(project.startedAt).toBe("2026-11-05T09:00:00.000Z");
    expect(project.milestones[0].evidenceUrl).toBe("https://example.com/one");
  });

  it("reopens an early milestone only after later ones are reopened", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    completeEveryMilestone(projectId);

    const milestones = loadPreviewWorkspace().projects[0].milestones;

    const reopen = setPreviewMilestoneStatus({
      projectId,
      milestoneId: milestones[0].id,
      completed: false,
    });

    expect(reopen.ok).toBe(false);

    if (!reopen.ok) {
      expect(reopen.message).toContain("Reopen");
    }
  });

  it("refuses milestone edits on a completed project", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    completeEveryMilestone(projectId);
    setPreviewProjectLinks({
      projectId,
      repoUrl: "https://github.com/example/repo",
    });
    setPreviewProjectStatus(projectId, "completed");

    const milestoneId = loadPreviewWorkspace().projects[0].milestones[0].id;
    const result = setPreviewMilestoneStatus({
      projectId,
      milestoneId,
      completed: false,
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.message).toContain("Reopen the project");
    }
  });
});

describe("setPreviewProjectStatus and evidence", () => {
  it("blocks completion while work is missing and records no evidence", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");

    const blocked = setPreviewProjectStatus(projectId, "completed");

    expect(blocked.ok).toBe(false);

    if (!blocked.ok) {
      expect(blocked.message).toContain("Evidence is only recorded once");
    }

    expect(loadPreviewWorkspace().evidence).toHaveLength(0);
  });

  it("blocks completion without a repository link", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    completeEveryMilestone(projectId);

    const blocked = setPreviewProjectStatus(projectId, "completed");

    expect(blocked.ok).toBe(false);

    if (!blocked.ok) {
      expect(blocked.message).toContain("repository link");
    }

    expect(loadPreviewWorkspace().evidence).toHaveLength(0);
  });

  it("records unverified project evidence once every milestone and the repo exist", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    completeEveryMilestone(projectId);
    setPreviewProjectLinks({
      projectId,
      repoUrl: "https://github.com/example/repo",
    });

    const result = setPreviewProjectStatus(projectId, "completed");

    expect(result.ok).toBe(true);

    const workspace = loadPreviewWorkspace();
    const template = getProjectTemplate("personal-expense-analysis")!;

    expect(workspace.projects[0].status).toBe("completed");
    expect(workspace.projects[0].completedAt).toBe("2026-11-05T09:00:00.000Z");
    expect(workspace.evidence).toHaveLength(template.skillSlugs.length);
    expect(workspace.evidence.every((entry) => entry.verified === false)).toBe(true);
    expect(
      workspace.evidence.every((entry) => entry.evidenceLevel === "project_evidence"),
    ).toBe(true);
    expect(
      workspace.evidence.every((entry) => entry.sourceId === projectId),
    ).toBe(true);
  });

  it("never duplicates evidence if completion is set again", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    completeEveryMilestone(projectId);
    setPreviewProjectLinks({
      projectId,
      repoUrl: "https://github.com/example/repo",
    });

    const first = setPreviewProjectStatus(projectId, "completed");
    const second = setPreviewProjectStatus(projectId, "completed");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    if (first.ok && second.ok) {
      expect(second.evidenceCount).toBe(0);
    }

    expect(loadPreviewWorkspace().evidence.length).toBe(
      getProjectTemplate("personal-expense-analysis")!.skillSlugs.length,
    );
  });

  it("rejects an unsafe repository link", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");

    const bad = setPreviewProjectLinks({
      projectId,
      repoUrl: "javascript:alert(1)",
    });

    expect(bad.ok).toBe(false);
    expect(loadPreviewWorkspace().projects[0].repoUrl).toBeNull();
  });

  it("withdraws project evidence when a completed project is reopened", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    completeEveryMilestone(projectId);
    setPreviewProjectLinks({ projectId, repoUrl: "https://github.com/example/repo" });
    setPreviewProjectStatus(projectId, "completed");

    expect(loadPreviewWorkspace().evidence.length).toBeGreaterThan(0);

    expect(setPreviewProjectStatus(projectId, "in_progress").ok).toBe(true);

    const workspace = loadPreviewWorkspace();
    expect(workspace.projects[0].status).toBe("in_progress");
    expect(workspace.evidence).toHaveLength(0);
  });
});

describe("savePreviewProjectRubric", () => {
  it("refuses a rubric before the project is complete", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");

    const result = savePreviewProjectRubric({
      projectId,
      scores: { "problem-framing": 3 },
      reflection: "Fine.",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.message).toContain("not evidence of mastery");
    }

    expect(loadPreviewWorkspace().projects[0].selfAssessment).toBeNull();
  });

  it("stores the rubric on the project, not as evidence", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    completeEveryMilestone(projectId);
    setPreviewProjectLinks({ projectId, repoUrl: "https://github.com/example/repo" });
    setPreviewProjectStatus(projectId, "completed");

    const evidenceBefore = loadPreviewWorkspace().evidence.length;

    expect(
      savePreviewProjectRubric({
        projectId,
        scores: { testing: 2, "code-quality": 3 },
        reflection: "  Tested the cleaner only.  ",
      }).ok,
    ).toBe(true);

    const project = loadPreviewWorkspace().projects[0];

    expect(project.selfAssessment?.scores).toEqual({ testing: 2, "code-quality": 3 });
    expect(project.selfAssessment?.reflection).toBe("Tested the cleaner only.");
    expect(loadPreviewWorkspace().evidence).toHaveLength(evidenceBefore);
  });
});

describe("deletePreviewProject", () => {
  it("removes the project and the evidence it produced", () => {
    setup({ tasks: [makeTask({ id: "t1", skillSlug: "python-basics", status: "completed" })] });
    const projectId = startAndReturnId("personal-expense-analysis");
    completeEveryMilestone(projectId);
    setPreviewProjectLinks({ projectId, repoUrl: "https://github.com/example/repo" });
    setPreviewProjectStatus(projectId, "completed");

    expect(loadPreviewWorkspace().evidence.length).toBeGreaterThan(0);

    expect(deletePreviewProject(projectId).ok).toBe(true);

    const workspace = loadPreviewWorkspace();
    expect(workspace.projects).toHaveLength(0);
    expect(workspace.evidence).toHaveLength(0);
  });

  it("reports a missing project instead of failing silently", () => {
    setup();

    const result = deletePreviewProject("does-not-exist");

    expect(result.ok).toBe(false);
  });
});
