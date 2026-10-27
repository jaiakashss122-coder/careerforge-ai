import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  endPreviewSession,
  loadPreviewWorkspace,
  parsePreviewWorkspace,
  reschedulePreviewTask,
  savePreviewRoadmap,
  savePreviewWorkspace,
  setPreviewTaskCompletion,
  startPreviewSession,
} from "@/lib/preview/workspace-store";
import { getWeeklyProgress } from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import {
  makeInterviewAttempt,
  makeJobApplication,
  makeMockInterview,
  makeProject,
  makeRoadmap,
  makeSession,
  makeTask,
  MemoryStorage,
} from "@/lib/test-support/fixtures";

function setup(tasks = [makeTask({ id: "task-1" })]) {
  vi.stubGlobal("window", {
    localStorage: new MemoryStorage(),
    dispatchEvent: vi.fn(),
  });
  savePreviewWorkspace({
    ...createEmptyWorkspace(),
    assessments: [],
    roadmaps: [makeRoadmap(tasks)],
    sessions: [],
    projects: [],
    evidence: [],
    careerExperiments: [],
    careerPreferences: [],
  });
  return loadPreviewWorkspace();
}

function taskById(taskId: string) {
  return loadPreviewWorkspace().roadmaps[0].tasks.find(
    (task) => task.id === taskId,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T09:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("preview workspace parsing", () => {
  it("returns an empty workspace for missing or corrupt storage", () => {
    expect(parsePreviewWorkspace(null)).toEqual(createEmptyWorkspace());
    expect(parsePreviewWorkspace("{")).toEqual(createEmptyWorkspace());
    expect(parsePreviewWorkspace("[]")).toEqual(createEmptyWorkspace());
  });

  it("drops malformed interview records while keeping valid ones", () => {
    const parsed = parsePreviewWorkspace(
      JSON.stringify({
        mockInterviews: [
          makeMockInterview({
            id: "interview-1",
            questionIds: ["sql-group-by-select"],
          }),
          { id: "broken" },
          {
            id: "unknown-question",
            label: "Asks about a question this app has",
            topics: ["sql"],
            questionIds: ["not-a-real-question"],
            startedAt: "2026-11-02T10:00:00.000Z",
            completedAt: null,
          },
        ],
        interviewAttempts: [
          makeInterviewAttempt({
            id: "attempt-1",
            questionId: "sql-group-by-select",
            topic: "sql",
            interviewId: "interview-1",
          }),
          {
            id: "no-rating",
            questionId: "sql-group-by-select",
            topic: "sql",
            prompt: "Synthetic interview question.",
            answerText: "Synthetic answer.",
            rating: "",
            skills: [],
            interviewId: "interview-1",
            createdAt: "2026-11-02T10:05:00.000Z",
          },
          {
            id: "unknown-question",
            questionId: "not-a-real-question",
            topic: "sql",
            prompt: "Synthetic interview question.",
            answerText: "Synthetic answer.",
            rating: "covered",
            skills: [],
            interviewId: "interview-1",
            createdAt: "2026-11-02T10:05:00.000Z",
          },
        ],
        jobApplications: [
          makeJobApplication({ id: "application-1" }),
          {
            ...makeJobApplication({ id: "application-2" }),
            status: "hired",
          },
        ],
      }),
    );

    expect(parsed.mockInterviews.map((interview) => interview.id)).toEqual([
      "interview-1",
    ]);
    expect(parsed.interviewAttempts.map((attempt) => attempt.id)).toEqual([
      "attempt-1",
    ]);
    expect(
      parsed.jobApplications.map((application) => application.id),
    ).toEqual(["application-1"]);
  });

  it("drops malformed records while keeping valid ones", () => {
    const roadmap = makeRoadmap([makeTask({ id: "task-1" })]);
    const session = makeSession({
      id: "session-1",
      startedAt: "2026-11-02T09:00:00.000Z",
      status: "completed",
    });

    const parsed = parsePreviewWorkspace(
      JSON.stringify({
        assessments: [{ id: "broken" }],
        roadmaps: [roadmap, { id: "broken" }],
        sessions: [session, { id: "broken" }],
        projects: [
          makeProject({ id: "project-1" }),
          { id: "broken", title: "x", status: "shipped", milestones: [] },
          {
            id: "broken-milestones",
            title: "x",
            status: "planned",
            milestones: [{ id: "no-status" }],
          },
        ],
        evidence: [
          {
            id: "evidence-1",
            skillSlug: "pandas",
            sourceType: "project",
            evidenceLevel: "project_evidence",
            verified: false,
            createdAt: "2026-11-02T09:00:00.000Z",
          },
          { id: "broken", skillSlug: "pandas", sourceType: "guess" },
        ],
      }),
    );

    expect(parsed.assessments).toHaveLength(0);
    expect(parsed.roadmaps).toHaveLength(1);
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.projects).toHaveLength(1);
    expect(parsed.evidence).toHaveLength(1);
  });
});

describe("preview sessions", () => {
  it("starts a session only on request and marks the task in progress", () => {
    setup();

    const result = startPreviewSession({
      taskId: "task-1",
      mode: "focused",
      plannedMinutes: 45,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.status).toBe("active");
    expect(result.session.actualMinutes).toBeNull();
    expect(result.session.startedAt).toBe("2026-11-02T09:00:00.000Z");
    expect(taskById("task-1")?.status).toBe("in_progress");
    expect(loadPreviewWorkspace().sessions).toHaveLength(1);
  });

  it("rejects a second active session and unsupported session lengths", () => {
    setup();
    const started = startPreviewSession({
      taskId: "task-1",
      mode: "focused",
      plannedMinutes: 45,
    });
    expect(started.ok).toBe(true);

    const second = startPreviewSession({
      taskId: "task-1",
      mode: "quick",
      plannedMinutes: 20,
    });
    expect(second.ok).toBe(false);

    endPreviewSession({
      sessionId: (started as { session: { id: string } }).session.id,
      outcome: "abandoned",
    });

    const invalidLength = startPreviewSession({
      taskId: "task-1",
      mode: "focused",
      plannedMinutes: 12,
    });
    expect(invalidLength.ok).toBe(false);
  });

  it("records elapsed time and notes only when the session is finished", () => {
    setup();
    const started = startPreviewSession({
      taskId: "task-1",
      mode: "focused",
      plannedMinutes: 45,
    });
    if (!started.ok) throw new Error(started.message);

    vi.setSystemTime(new Date("2026-11-02T09:45:00.000Z"));

    const ended = endPreviewSession({
      sessionId: started.session.id,
      outcome: "completed",
      notes: "  Finished the SQL drills.  ",
    });

    expect(ended.ok).toBe(true);
    const session = loadPreviewWorkspace().sessions[0];
    expect(session.status).toBe("completed");
    expect(session.actualMinutes).toBe(45);
    expect(session.notes).toBe("Finished the SQL drills.");
    expect(session.endedAt).toBe("2026-11-02T09:45:00.000Z");
    expect(getWeeklyProgress(makeRoadmap([]), [session]).recordedMinutes).toBe(
      45,
    );
  });

  it("records abandoned time without counting it as progress", () => {
    setup();
    const started = startPreviewSession({
      taskId: "task-1",
      mode: "quick",
      plannedMinutes: 20,
    });
    if (!started.ok) throw new Error(started.message);

    vi.setSystemTime(new Date("2026-11-02T09:10:00.000Z"));
    endPreviewSession({
      sessionId: started.session.id,
      outcome: "abandoned",
    });

    const session = loadPreviewWorkspace().sessions[0];
    expect(session.status).toBe("abandoned");
    expect(session.actualMinutes).toBe(10);
    expect(getWeeklyProgress(makeRoadmap([]), [session]).recordedMinutes).toBe(
      0,
    );
    expect(taskById("task-1")?.status).toBe("in_progress");

    const again = endPreviewSession({
      sessionId: started.session.id,
      outcome: "completed",
    });
    expect(again.ok).toBe(false);
  });

  it("refuses to start a session for a locked or completed task", () => {
    const tasks = [
      makeTask({ id: "task-1" }),
      makeTask({ id: "task-2", weekNumber: 2, prerequisiteIds: ["task-1"] }),
    ];
    setup(tasks);

    const locked = startPreviewSession({
      taskId: "task-2",
      mode: "focused",
      plannedMinutes: 45,
    });
    expect(locked.ok).toBe(false);

    setPreviewTaskCompletion("task-1", true);
    const completed = startPreviewSession({
      taskId: "task-1",
      mode: "focused",
      plannedMinutes: 45,
    });
    expect(completed.ok).toBe(false);

    const unlocked = startPreviewSession({
      taskId: "task-2",
      mode: "focused",
      plannedMinutes: 45,
    });
    expect(unlocked.ok).toBe(true);
  });
});

describe("preview task changes", () => {
  it("blocks completing a task until its prerequisites are done", () => {
    const tasks = [
      makeTask({ id: "task-1" }),
      makeTask({ id: "task-2", weekNumber: 2, prerequisiteIds: ["task-1"] }),
    ];
    setup(tasks);

    const blocked = setPreviewTaskCompletion("task-2", true);
    expect(blocked.ok).toBe(false);
    expect(taskById("task-2")?.status).toBe("pending");

    expect(setPreviewTaskCompletion("task-1", true).ok).toBe(true);
    expect(taskById("task-1")?.status).toBe("completed");
    expect(setPreviewTaskCompletion("task-2", true).ok).toBe(true);
    expect(taskById("task-2")?.status).toBe("completed");
  });

  it("requires dependent tasks to be reopened first", () => {
    const tasks = [
      makeTask({ id: "task-1", status: "completed" }),
      makeTask({
        id: "task-2",
        weekNumber: 2,
        status: "completed",
        prerequisiteIds: ["task-1"],
      }),
    ];
    setup(tasks);

    const blocked = setPreviewTaskCompletion("task-1", false);
    expect(blocked.ok).toBe(false);
    expect(taskById("task-1")?.status).toBe("completed");

    expect(setPreviewTaskCompletion("task-2", false).ok).toBe(true);
    expect(setPreviewTaskCompletion("task-1", false).ok).toBe(true);
    expect(taskById("task-1")?.status).toBe("pending");
    expect(taskById("task-1")?.completedAt).toBeNull();
  });

  it("reschedules an unfinished task and refuses completed ones", () => {
    setup([
      makeTask({ id: "task-1", status: "in_progress" }),
      makeTask({ id: "task-2", status: "completed" }),
    ]);

    const moved = reschedulePreviewTask("task-1", 99);
    expect(moved.ok).toBe(true);
    expect(taskById("task-1")?.weekNumber).toBe(13);
    expect(taskById("task-1")?.status).toBe("pending");

    const refused = reschedulePreviewTask("task-2", 3);
    expect(refused.ok).toBe(false);
  });

  it("requires confirmation before replacing an active roadmap", () => {
    setup();
    const next = makeRoadmap([makeTask({ id: "task-9" })], {
      id: "roadmap-next",
    });

    const refused = savePreviewRoadmap(next, false);
    expect(refused.ok).toBe(false);

    expect(savePreviewRoadmap(next, true).ok).toBe(true);
    const workspace = loadPreviewWorkspace();
    expect(workspace.roadmaps).toHaveLength(2);
    expect(workspace.roadmaps[0].status).toBe("archived");
    expect(workspace.roadmaps[1].status).toBe("active");
  });
});
