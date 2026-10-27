import { describe, expect, it } from "vitest";
import {
  assessmentRecord,
  makeRoadmap,
  makeSession,
  makeTask,
} from "@/lib/test-support/fixtures";
import {
  getActiveRoadmap,
  getCurrentPlanWeek,
  getLatestAssessment,
  getNextTask,
  getRecordedMinutesForRange,
  getRoadmapOverallPercent,
  getTaskCompletionPercent,
  getTaskLockState,
  getUpcomingTasks,
  getWeeklyProgress,
  sortRoadmapTasks,
} from "@/lib/workspace/progress";

describe("task ordering and completion", () => {
  it("computes completion while ignoring skipped tasks", () => {
    const tasks = [
      makeTask({ id: "a", status: "completed" }),
      makeTask({ id: "b", orderIndex: 1, status: "pending" }),
      makeTask({ id: "c", orderIndex: 2, status: "skipped" }),
    ];

    expect(getTaskCompletionPercent(tasks)).toBe(50);
    expect(getTaskCompletionPercent([])).toBe(0);
    expect(
      getTaskCompletionPercent(tasks.map((task) => ({ ...task, status: "completed" }))),
    ).toBe(100);
  });

  it("sorts by week and then order index without mutating input", () => {
    const tasks = [
      makeTask({ id: "week-2", weekNumber: 2 }),
      makeTask({ id: "week-1-b", weekNumber: 1, orderIndex: 1 }),
      makeTask({ id: "week-1-a", weekNumber: 1, orderIndex: 0 }),
    ];
    const sorted = sortRoadmapTasks(tasks);

    expect(sorted.map((task) => task.id)).toEqual([
      "week-1-a",
      "week-1-b",
      "week-2",
    ]);
    expect(tasks[0].id).toBe("week-2");
  });

  it("follows prerequisites before unlocking the next task", () => {
    const first = makeTask({ id: "first" });
    const second = makeTask({
      id: "second",
      orderIndex: 1,
      prerequisiteIds: ["first"],
    });
    const roadmap = makeRoadmap([first, second]);

    expect(getNextTask(roadmap)?.id).toBe("first");
    expect(getTaskLockState(second, roadmap).locked).toBe(true);
    expect(
      getTaskLockState(second, roadmap).unmetPrerequisites.map(
        (task) => task.id,
      ),
    ).toEqual(["first"]);

    const advanced = makeRoadmap([
      { ...first, status: "completed" },
      second,
    ]);
    expect(getNextTask(advanced)?.id).toBe("second");
    expect(getTaskLockState(second, advanced).locked).toBe(false);
  });

  it("treats missing prerequisite links as locked", () => {
    const orphan = makeTask({
      id: "orphan",
      prerequisiteIds: ["missing-task"],
    });
    const roadmap = makeRoadmap([orphan]);

    expect(getTaskLockState(orphan, roadmap).locked).toBe(true);
  });

  it("prefers an in-progress unlocked task over earlier pending work", () => {
    const roadmap = makeRoadmap([
      makeTask({ id: "pending" }),
      makeTask({ id: "started", orderIndex: 1, status: "in_progress" }),
    ]);

    expect(getNextTask(roadmap)?.id).toBe("started");
  });

  it("returns no next task when everything is complete and omits locked tasks from upcoming", () => {
    const first = makeTask({ id: "first", status: "completed" });
    const second = makeTask({
      id: "second",
      status: "pending",
      prerequisiteIds: ["first"],
    });
    const third = makeTask({ id: "third", orderIndex: 1 });
    const roadmap = makeRoadmap([first, second, third]);

    expect(getNextTask(roadmap)?.id).toBe("second");
    expect(
      getUpcomingTasks(roadmap, 5, "second").map((task) => task.id),
    ).toEqual(["third"]);

    const complete = makeRoadmap([
      { ...first, status: "completed" },
      { ...second, status: "completed" },
      { ...third, status: "completed" },
    ]);
    expect(getNextTask(complete)).toBeNull();
    expect(getRoadmapOverallPercent(complete)).toBe(100);
  });
});

describe("plan weeks and weekly progress", () => {
  it("maps dates to plan weeks and clamps to the 13-week range", () => {
    const roadmap = makeRoadmap([makeTask({ id: "task" })]);

    expect(
      getCurrentPlanWeek(roadmap, new Date("2026-10-20T12:00:00.000Z")),
    ).toBe(1);
    expect(
      getCurrentPlanWeek(roadmap, new Date("2026-11-02T12:00:00.000Z")),
    ).toBe(1);
    expect(
      getCurrentPlanWeek(roadmap, new Date("2026-11-16T12:00:00.000Z")),
    ).toBe(3);
    expect(
      getCurrentPlanWeek(roadmap, new Date("2027-06-01T12:00:00.000Z")),
    ).toBe(13);
  });

  it("counts only finished sessions inside the plan week", () => {
    const roadmap = makeRoadmap([
      makeTask({
        id: "week-2-a",
        weekNumber: 2,
        estimatedMinutes: 60,
        status: "completed",
      }),
      makeTask({
        id: "week-2-b",
        weekNumber: 2,
        orderIndex: 1,
        estimatedMinutes: 60,
      }),
      makeTask({ id: "week-3", weekNumber: 3 }),
    ]);
    const sessions = [
      makeSession({
        id: "done-1",
        startedAt: "2026-11-09T10:00:00.000Z",
        status: "completed",
        actualMinutes: 45,
      }),
      makeSession({
        id: "done-2",
        startedAt: "2026-11-15T10:00:00.000Z",
        status: "completed",
        actualMinutes: 30,
      }),
      makeSession({
        id: "abandoned",
        startedAt: "2026-11-10T10:00:00.000Z",
        status: "abandoned",
        actualMinutes: 20,
      }),
      makeSession({
        id: "active",
        startedAt: "2026-11-11T10:00:00.000Z",
        status: "active",
        plannedMinutes: 45,
      }),
      makeSession({
        id: "next-week",
        startedAt: "2026-11-16T00:00:00.000Z",
        status: "completed",
        actualMinutes: 60,
      }),
    ];

    const progress = getWeeklyProgress(
      roadmap,
      sessions,
      new Date("2026-11-10T12:00:00.000Z"),
    );

    expect(progress.weekNumber).toBe(2);
    expect(progress.scheduledTasks).toHaveLength(2);
    expect(progress.completedTasks).toHaveLength(1);
    expect(progress.scheduledMinutes).toBe(120);
    expect(progress.weeklyTargetMinutes).toBe(600);
    expect(progress.recordedMinutes).toBe(75);
    expect(progress.completedSessionCount).toBe(2);
    expect(
      getRecordedMinutesForRange(
        sessions,
        new Date("2026-11-09T00:00:00.000Z"),
        new Date("2026-11-16T00:00:00.000Z"),
      ),
    ).toBe(75);
  });
});

describe("latest records", () => {
  it("selects the latest completed assessment and newest active roadmap", () => {
    const older = assessmentRecord({
      id: "older",
      completedAt: "2026-10-01T10:00:00.000Z",
    });
    const newer = assessmentRecord({
      id: "newer",
      completedAt: "2026-10-20T10:00:00.000Z",
    });

    expect(getLatestAssessment([older, newer])?.id).toBe("newer");
    expect(getLatestAssessment([])).toBeNull();

    const activeOld = makeRoadmap([makeTask({ id: "a" })], {
      id: "active-old",
      status: "active",
      createdAt: "2026-10-01T10:00:00.000Z",
    });
    const activeNew = makeRoadmap([makeTask({ id: "b" })], {
      id: "active-new",
      status: "active",
      createdAt: "2026-10-20T10:00:00.000Z",
    });
    const archived = makeRoadmap([makeTask({ id: "c" })], {
      id: "archived",
      status: "archived",
      createdAt: "2026-10-25T10:00:00.000Z",
    });

    expect(
      getActiveRoadmap([activeOld, archived, activeNew])?.id,
    ).toBe("active-new");
  });
});
