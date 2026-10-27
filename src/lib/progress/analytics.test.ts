import { describe, expect, it } from "vitest";
import { ASSESSMENT_DISCLAIMER } from "@/lib/assessment/types";
import { buildProgressAnalytics } from "@/lib/progress/analytics";
import { SKILL_CATEGORY_ORDER } from "@/lib/skills/catalog";
import {
  assessmentRecord,
  emptySummary,
  makeEvidenceRecord,
  makeProject,
  makeRoadmap,
  makeSection,
  makeSession,
  makeSkillResult,
  makeStoredAnswer,
  makeTask,
} from "@/lib/test-support/fixtures";
import { createEmptyWorkspace } from "@/lib/workspace/types";

const NOW = new Date("2026-11-05T12:00:00.000Z");

function workspaceWith(
  overrides: Partial<ReturnType<typeof createEmptyWorkspace>>,
) {
  return { ...createEmptyWorkspace(), ...overrides };
}

function assessmentWith({
  id = "assessment-1",
  completedAt = "2026-11-04T10:00:00.000Z",
  skills = [],
  answers = [],
}: {
  id?: string;
  completedAt?: string;
  skills?: Parameters<typeof makeSection>[1];
  answers?: ReturnType<typeof makeStoredAnswer>[];
}) {
  return assessmentRecord({
    id,
    completedAt,
    answers,
    summary: emptySummary({
      sections: skills.length > 0 ? [makeSection("programming", skills)] : [],
    }),
  });
}

describe("progress analytics on an empty workspace", () => {
  const analytics = buildProgressAnalytics({
    workspace: workspaceWith({}),
    now: NOW,
  });

  it("asks for the assessment before reporting any skill number", () => {
    expect(analytics.nextAction.kind).toBe("assessment");
    expect(analytics.nextAction.priority).toBe(100);
    expect(analytics.learningActivity.questionAccuracy.percent).toBeNull();
    expect(analytics.learningActivity.repeatedMistakes).toEqual([]);
    expect(analytics.roadmapProgress.currentWeek).toBeNull();
    expect(analytics.roadmapProgress.explanation).toContain(
      "No active roadmap",
    );
  });

  it("lists every skill category with an honest 'nothing scored yet' figure", () => {
    expect(analytics.categories).toHaveLength(SKILL_CATEGORY_ORDER.length);

    for (const category of analytics.categories) {
      expect(category.summaryPercent).toBeNull();
      expect(category.skills).toEqual([]);
      expect(category.explanation).toContain("No scored questions");
    }
  });

  it("shows zero for every evidence lane instead of borrowing numbers from elsewhere", () => {
    expect(analytics.evidenceLanes.map((lane) => lane.count)).toEqual([
      0, 0, 0, 0, 0, 0,
    ]);
    expect(
      analytics.evidenceLanes.find((lane) => lane.sourceType === "project"),
    ).toMatchObject({ count: 0, verifiedCount: 0 });
    expect(
      analytics.evidenceLanes.find((lane) => lane.sourceType === "project")
        ?.note,
    ).toContain("repository is linked");
    expect(
      analytics.evidenceLanes.find((lane) => lane.sourceType === "lesson")
        ?.note,
    ).toContain("not part of this build yet");
  });

  it("carries the standing disclaimers into the payload", () => {
    expect(analytics.disclaimers).toContain(ASSESSMENT_DISCLAIMER);
    expect(analytics.disclaimers.join(" ")).toContain("unverified");
    expect(analytics.disclaimers.join(" ")).toContain("never blends");
  });
});

describe("recorded study time", () => {
  it("counts only minutes from sessions that were completed", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        sessions: [
          makeSession({
            id: "done-this-week",
            startedAt: "2026-11-03T09:00:00.000Z",
            status: "completed",
            actualMinutes: 45,
          }),
          makeSession({
            id: "done-last-week",
            startedAt: "2026-10-28T09:00:00.000Z",
            status: "completed",
            actualMinutes: 30,
          }),
          makeSession({
            id: "still-running",
            startedAt: "2026-11-05T09:00:00.000Z",
            status: "active",
            plannedMinutes: 90,
          }),
          makeSession({
            id: "abandoned",
            startedAt: "2026-11-04T09:00:00.000Z",
            status: "abandoned",
            actualMinutes: 120,
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.studyTime.totalRecordedMinutes).toBe(75);
    expect(analytics.studyTime.weekRecordedMinutes).toBe(45);
    expect(analytics.studyTime.completedSessionCount).toBe(2);
    expect(analytics.studyTime.startedSessionCount).toBe(4);
    expect(analytics.studyTime.abandonedSessionCount).toBe(1);
    expect(analytics.studyTime.explanation).toContain(
      "One session is still running",
    );
    expect(analytics.studyTime.explanation).toContain(
      "abandoned is listed here and credited with zero minutes",
    );
  });

  it("counts every running session instead of claiming there is only one", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        sessions: [
          makeSession({
            id: "run-1",
            status: "active",
            startedAt: NOW.toISOString(),
          }),
          makeSession({
            id: "run-2",
            status: "active",
            startedAt: NOW.toISOString(),
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.studyTime.totalRecordedMinutes).toBe(0);
    expect(analytics.studyTime.explanation).toContain(
      "2 sessions are still running",
    );
    expect(analytics.studyTime.explanation).not.toContain(
      "One session is still running",
    );
  });

  it("explains that nothing was estimated when there are no sessions at all", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({}),
      now: NOW,
    });

    expect(analytics.studyTime.totalRecordedMinutes).toBe(0);
    expect(analytics.studyTime.explanation).toContain(
      "sessions you started in this app",
    );
  });
});

describe("separate evidence lanes", () => {
  it("keeps project evidence in its own lane and counts distinct skills", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        evidence: [
          makeEvidenceRecord({ skillSlug: "classification" }),
          makeEvidenceRecord({ skillSlug: "pandas", id: "evidence-2" }),
          makeEvidenceRecord({
            skillSlug: "sql-joins",
            id: "evidence-3",
            sourceType: "assessment",
            evidenceLevel: "independent_practice",
            verified: true,
          }),
        ],
      }),
      now: NOW,
    });

    const projectLane = analytics.evidenceLanes.find(
      (lane) => lane.sourceType === "project",
    );
    const assessmentLane = analytics.evidenceLanes.find(
      (lane) => lane.sourceType === "assessment",
    );

    expect(projectLane).toMatchObject({
      count: 2,
      skillCount: 2,
      verifiedCount: 0,
    });
    expect(assessmentLane).toMatchObject({
      count: 1,
      skillCount: 1,
      verifiedCount: 1,
    });
  });

  it("summarises completed projects without claiming they verified anything", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        projects: [
          makeProject({ id: "p1", status: "completed" }),
          makeProject({ id: "p2", status: "in_progress" }),
        ],
        evidence: [makeEvidenceRecord({ skillSlug: "pandas" })],
      }),
      now: NOW,
    });

    expect(analytics.projectSummary).toMatchObject({
      startedCount: 2,
      completedCount: 1,
      evidenceCount: 1,
    });
    expect(analytics.projectSummary.explanation).toContain("never inside them");
  });
});

describe("skill proficiency explanations", () => {
  it("shows the demonstrated score, practice, and project evidence side by side", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [
          assessmentWith({
            skills: [
              makeSkillResult({
                skillSlug: "classification",
                skillName: "Classification",
                level: "basic",
                percent: 60,
                confidence: 5,
                confidenceMismatch: "overconfident",
              }),
            ],
          }),
        ],
        roadmaps: [
          makeRoadmap([
            makeTask({
              id: "t1",
              status: "completed",
              skillSlug: "classification",
            }),
          ]),
        ],
        projects: [
          makeProject({
            id: "p1",
            templateSlug: "churn-prediction",
            status: "completed",
          }),
        ],
        evidence: [makeEvidenceRecord({ skillSlug: "classification" })],
      }),
      now: NOW,
    });

    const category = analytics.categories.find(
      (entry) => entry.category === "machine-learning",
    );
    const skill = category?.skills[0];

    expect(skill?.demonstratedPercent).toBe(60);
    expect(skill?.demonstratedLevel).toBe("basic");
    expect(skill?.completedPracticeTasks).toBe(1);
    expect(skill?.completedProjects).toBe(1);
    expect(skill?.evidenceSources).toEqual(["project"]);
    expect(skill?.explanation).toContain("60% on your latest screen");
    expect(skill?.explanation).toContain("application question was missed");
    expect(skill?.explanation).toContain("1 roadmap task covering this skill");
    expect(skill?.explanation).toContain("used in 1 completed project");
    expect(skill?.explanation).toContain("the gap, not the score");
    expect(skill?.explanation).not.toContain("mastery confirmed");
  });

  it("keeps aligned confidence labelled as self-reported instead of merged in", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [
          assessmentWith({
            skills: [
              makeSkillResult({
                skillSlug: "python-basics",
                skillName: "Python basics",
                level: "intermediate",
                percent: 100,
                confidence: 4,
                confidenceMismatch: null,
              }),
            ],
          }),
        ],
      }),
      now: NOW,
    });

    const skill = analytics.categories.find(
      (entry) => entry.category === "programming",
    )?.skills[0];

    expect(skill?.confidence).toBe(4);
    expect(skill?.explanation).toContain(
      "Self-reported confidence 4/5, kept separate",
    );
  });

  it("averages only the scored skills inside a category and names extremes", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [
          assessmentWith({
            skills: [
              makeSkillResult({
                skillSlug: "python-basics",
                skillName: "Python basics",
                percent: 80,
              }),
              makeSkillResult({
                skillSlug: "problem-solving",
                skillName: "Problem solving",
                percent: 40,
              }),
            ],
          }),
        ],
      }),
      now: NOW,
    });

    const programming = analytics.categories.find(
      (entry) => entry.category === "programming",
    );

    expect(programming?.summaryPercent).toBe(60);
    expect(programming?.strongestSkill?.skillSlug).toBe("python-basics");
    expect(programming?.weakestSkill?.skillSlug).toBe("problem-solving");
    expect(programming?.explanation).toContain("2 scored skills");
    expect(programming?.explanation).toContain("not proof of mastery");

    const sql = analytics.categories.find((entry) => entry.category === "sql");
    expect(sql?.summaryPercent).toBeNull();
  });
});

describe("question accuracy and repeated mistakes", () => {
  it("excludes self-reports and preferences from the accuracy figure", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [
          assessmentWith({
            answers: [
              makeStoredAnswer({ questionKey: "q1" }),
              makeStoredAnswer({ questionKey: "q2" }),
              makeStoredAnswer({
                questionKey: "q3",
                isCorrect: false,
                score: 0,
              }),
              makeStoredAnswer({
                questionKey: "confidence-python",
                questionType: "self_report",
                isCorrect: null,
                score: null,
                maxScore: null,
              }),
              makeStoredAnswer({
                questionKey: "career-style",
                questionType: "preference",
                isCorrect: null,
                score: null,
                maxScore: null,
              }),
            ],
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.learningActivity.questionAccuracy).toEqual({
      correct: 2,
      total: 3,
      percent: 67,
    });
    expect(analytics.learningActivity.explanation).toContain(
      "Self-reports and career questions are excluded",
    );
  });

  it("flags a concept missed in two separate attempts, not one bad attempt", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [
          assessmentWith({
            id: "first",
            completedAt: "2026-11-02T10:00:00.000Z",
            answers: [
              makeStoredAnswer({
                questionKey: "join-core",
                concept: "SQL join types",
                isCorrect: false,
                score: 0,
              }),
            ],
          }),
          assessmentWith({
            id: "second",
            completedAt: "2026-11-05T10:00:00.000Z",
            answers: [
              makeStoredAnswer({
                questionKey: "join-core-again",
                concept: "SQL join types",
                isCorrect: false,
                score: 0,
              }),
              makeStoredAnswer({
                questionKey: "null-1",
                concept: "NULL handling",
                isCorrect: false,
                score: 0,
              }),
              makeStoredAnswer({
                questionKey: "null-2",
                concept: "NULL handling",
                isCorrect: false,
                score: 0,
              }),
            ],
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.learningActivity.repeatedMistakes).toHaveLength(1);
    expect(analytics.learningActivity.repeatedMistakes[0]).toMatchObject({
      concept: "SQL join types",
      missCount: 2,
      missedInAttempts: 2,
      questionCount: 2,
      firstMissedAt: "2026-11-02T10:00:00.000Z",
      lastMissedAt: "2026-11-05T10:00:00.000Z",
    });
    expect(
      analytics.learningActivity.repeatedMistakes[0]?.explanation,
    ).toContain("content gap, not a careless error");
  });
});

describe("revision backlog", () => {
  it("uses the remedial lesson when the screen named one and dedupes repeats", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [
          assessmentWith({
            skills: [
              makeSkillResult({
                skillSlug: "sql-joins",
                skillName: "SQL joins",
                level: "foundational",
                percent: 50,
                remedial: { slug: "lesson-joins", title: "JOIN types drill" },
              }),
              makeSkillResult({
                skillSlug: "sql-subqueries",
                skillName: "Subqueries",
                level: "foundational",
                percent: 50,
                remedial: { slug: "lesson-joins", title: "JOIN types drill" },
              }),
            ],
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.learningActivity.revisionBacklog).toHaveLength(1);
    expect(analytics.learningActivity.revisionBacklog[0]).toMatchObject({
      lessonSlug: "lesson-joins",
      title: "JOIN types drill",
      href: "/roadmap",
    });
    expect(analytics.learningActivity.revisionBacklog[0]?.reason).toContain(
      "core question was missed",
    );
  });

  it("falls back to missed concepts, and skips skills that already look solid", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [
          assessmentWith({
            skills: [
              makeSkillResult({
                skillSlug: "python-basics",
                skillName: "Python basics",
                level: "basic",
                missedConcepts: ["list slicing"],
                remedial: null,
              }),
              makeSkillResult({
                skillSlug: "problem-solving",
                skillName: "Problem solving",
                level: "intermediate",
                percent: 100,
                missedConcepts: ["should not appear"],
              }),
            ],
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.learningActivity.revisionBacklog).toEqual([
      {
        skillSlug: "python-basics",
        lessonSlug: null,
        title: "list slicing",
        reason: "Missed inside Python basics, which otherwise looks solid.",
        href: "/tutor",
      },
    ]);
  });
});

describe("weekly consistency", () => {
  it("maps completed sessions onto roadmap weeks and reports the run", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        roadmaps: [makeRoadmap([], { startDate: "2026-10-19" })],
        sessions: [
          makeSession({
            id: "w1",
            startedAt: "2026-10-20T09:00:00.000Z",
            status: "completed",
            actualMinutes: 30,
          }),
          makeSession({
            id: "w2",
            startedAt: "2026-10-28T09:00:00.000Z",
            status: "completed",
            actualMinutes: 30,
          }),
          makeSession({
            id: "w3",
            startedAt: "2026-11-03T09:00:00.000Z",
            status: "completed",
            actualMinutes: 30,
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.consistency.weeksElapsed).toBe(3);
    expect(analytics.consistency.activeWeekNumbers).toEqual([1, 2, 3]);
    expect(analytics.consistency.consecutiveActiveWeeks).toBe(3);
    expect(analytics.consistency.note).toContain(
      "Missing a week reflows the plan",
    );
  });

  it("breaks the run on a gap week instead of pretending it carried on", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        roadmaps: [makeRoadmap([], { startDate: "2026-10-19" })],
        sessions: [
          makeSession({
            id: "w1",
            startedAt: "2026-10-20T09:00:00.000Z",
            status: "completed",
            actualMinutes: 30,
          }),
          makeSession({
            id: "w3",
            startedAt: "2026-11-03T09:00:00.000Z",
            status: "completed",
            actualMinutes: 30,
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.consistency.activeWeekNumbers).toEqual([1, 3]);
    expect(analytics.consistency.activeWeeks).toBe(2);
    expect(analytics.consistency.consecutiveActiveWeeks).toBe(1);
  });

  it("counts calendar weeks without shaming when no roadmap exists", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        sessions: [
          makeSession({
            id: "only",
            startedAt: "2026-10-15T09:00:00.000Z",
            status: "completed",
            actualMinutes: 25,
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.consistency.weeksElapsed).toBe(4);
    expect(analytics.consistency.activeWeekNumbers).toEqual([1]);
    expect(analytics.consistency.consecutiveActiveWeeks).toBe(0);
    expect(analytics.consistency.note).toContain("no active roadmap");
  });

  it("describes an untouched first week as a starting line", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({ roadmaps: [makeRoadmap([])] }),
      now: NOW,
    });

    expect(analytics.consistency.activeWeeks).toBe(0);
    expect(analytics.consistency.note).toContain("starting line, not a streak");
  });
});

describe("roadmap progress", () => {
  it("excludes skipped tasks from both the percent and the remaining count", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        roadmaps: [
          makeRoadmap([
            makeTask({ id: "a", status: "completed" }),
            makeTask({ id: "b", orderIndex: 1, status: "pending" }),
            makeTask({ id: "c", orderIndex: 2, status: "skipped" }),
          ]),
        ],
      }),
      now: NOW,
    });

    expect(analytics.roadmapProgress.overallPercent).toBe(50);
    expect(analytics.roadmapProgress.completedTaskCount).toBe(1);
    expect(analytics.roadmapProgress.remainingTaskCount).toBe(1);
    expect(analytics.roadmapProgress.currentWeek).toBe(1);
    expect(analytics.roadmapProgress.currentWeekTitle).toBe("Week 1");
    expect(analytics.roadmapProgress.explanation).toContain(
      "excluded from both figures",
    );
  });
});

describe("the single next action", () => {
  const assessment = assessmentWith({
    skills: [
      makeSkillResult({
        skillSlug: "sql-joins",
        skillName: "SQL joins",
        level: "foundational",
        percent: 50,
        remedial: { slug: "lesson-joins", title: "JOIN types drill" },
      }),
    ],
  });

  it("finishes an open session before anything else", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [assessment],
        roadmaps: [makeRoadmap([makeTask({ id: "t1", status: "pending" })])],
        sessions: [
          makeSession({
            id: "running",
            startedAt: "2026-11-05T09:00:00.000Z",
            status: "active",
          }),
        ],
      }),
      now: NOW,
    });

    expect(analytics.nextAction).toMatchObject({
      kind: "session",
      priority: 95,
      href: "/dashboard",
    });
    expect(analytics.nextAction.why).toContain(
      "not recorded until you close it",
    );
  });

  it("asks for a roadmap when the assessment exists but the plan does not", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({ assessments: [assessment] }),
      now: NOW,
    });

    expect(analytics.nextAction).toMatchObject({
      kind: "roadmap_task",
      priority: 90,
      title: "Generate your learning roadmap",
    });
  });

  it("resumes a task already in progress instead of starting a new one", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [assessment],
        roadmaps: [
          makeRoadmap([
            makeTask({ id: "early", status: "pending", weekNumber: 1 }),
            makeTask({
              id: "open",
              orderIndex: 1,
              status: "in_progress",
              weekNumber: 2,
            }),
          ]),
        ],
      }),
      now: NOW,
    });

    expect(analytics.nextAction).toMatchObject({ priority: 85 });
    expect(analytics.nextAction.href).toBe("/dashboard?task=open");
  });

  it("picks the unlocked task scheduled for the current week and says why", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [assessment],
        roadmaps: [
          makeRoadmap([
            makeTask({
              id: "later",
              status: "pending",
              weekNumber: 3,
            }),
            makeTask({
              id: "now",
              orderIndex: 1,
              status: "pending",
              weekNumber: 1,
              title: "Write your first JOIN",
              resources: {
                sessionPlan: {
                  learn: ["l"],
                  exercise: "e",
                  check: [],
                  revision: "r",
                },
                links: [],
                assessmentGap: "SQL joins scored 50%",
              },
            }),
          ]),
        ],
      }),
      now: NOW,
    });

    expect(analytics.nextAction).toMatchObject({ priority: 80 });
    expect(analytics.nextAction.title).toContain("Write your first JOIN");
    expect(analytics.nextAction.why).toContain("scheduled for this week");
    expect(analytics.nextAction.detail).toContain("SQL joins scored 50%");
  });

  it("routes to revision once the week is done and a gap remains", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [assessment],
        roadmaps: [makeRoadmap([makeTask({ id: "t1", status: "completed" })])],
      }),
      now: NOW,
    });

    expect(analytics.nextAction).toMatchObject({
      kind: "revision",
      priority: 75,
      title: "Revise JOIN types drill",
    });
  });

  it("keeps an open project going when the week and backlog are clear", () => {
    const clearAssessment = assessmentWith({
      skills: [
        makeSkillResult({
          skillSlug: "python-basics",
          skillName: "Python basics",
          level: "intermediate",
          percent: 100,
        }),
      ],
    });
    const roadmap = makeRoadmap([makeTask({ id: "t1", status: "completed" })]);

    const withProject = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [clearAssessment],
        roadmaps: [roadmap],
        projects: [
          makeProject({
            id: "p1",
            title: "Churn prediction",
            status: "in_progress",
          }),
        ],
      }),
      now: NOW,
    });

    expect(withProject.nextAction).toMatchObject({ priority: 70 });
    expect(withProject.nextAction.title).toContain("Churn prediction");

    const withoutProject = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [clearAssessment],
        roadmaps: [roadmap],
      }),
      now: NOW,
    });

    expect(withoutProject.nextAction).toMatchObject({
      kind: "project",
      priority: 65,
      href: "/projects",
    });
  });

  it("explains a blocked week instead of inventing work", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({
        assessments: [assessment],
        roadmaps: [
          makeRoadmap([
            makeTask({
              id: "gated",
              status: "pending",
              weekNumber: 1,
              prerequisiteIds: ["missing"],
            }),
          ]),
        ],
      }),
      now: NOW,
    });

    expect(analytics.nextAction).toMatchObject({
      kind: "roadmap_task",
      priority: 50,
      href: "/roadmap",
    });
    expect(analytics.nextAction.why).toContain("unlocked");
  });

  it("always returns exactly one recommendation with an explanation", () => {
    const analytics = buildProgressAnalytics({
      workspace: workspaceWith({ assessments: [assessment] }),
      now: NOW,
    });

    expect(typeof analytics.nextAction.title).toBe("string");
    expect(analytics.nextAction.why.length).toBeGreaterThan(20);
    expect(analytics.nextAction.ctaLabel.length).toBeGreaterThan(0);
  });
});
