import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPreviewCareerExperiment,
  clearPreviewCareerOverride,
  completePreviewCareerExperiment,
  loadPreviewWorkspace,
  parsePreviewWorkspace,
  savePreviewCareerOverride,
  savePreviewWorkspace,
  startPreviewCareerExperiment,
} from "@/lib/preview/workspace-store";
import {
  makeReflection,
  MemoryStorage,
} from "@/lib/test-support/fixtures";
import { getCareerExperimentForTrack } from "@/lib/career/experiments";
import { createEmptyWorkspace } from "@/lib/workspace/types";

function setup() {
  vi.stubGlobal("window", {
    localStorage: new MemoryStorage(),
    dispatchEvent: vi.fn(),
  });

  savePreviewWorkspace({
    ...createEmptyWorkspace(),
    assessments: [],
    roadmaps: [],
    sessions: [],
    projects: [],
    evidence: [],
    careerExperiments: [],
    careerPreferences: [],
  });
}

function experimentCount() {
  return loadPreviewWorkspace().careerExperiments.length;
}

beforeEach(setup);

describe("starting a career experiment in preview", () => {
  it("records the experiment you started, with the work description at the time", () => {
    const result = startPreviewCareerExperiment("data-analyst");
    const definition = getCareerExperimentForTrack("data-analyst");

    expect(result.ok).toBe(true);

    const [record] = loadPreviewWorkspace().careerExperiments;

    expect(record.careerSlug).toBe("data-analyst");
    expect(record.status).toBe("in_progress");
    expect(record.title).toBe(definition?.title);
    expect(record.brief).toBe(definition?.brief);
    expect(record.startedAt).not.toBeNull();
    expect(record.completedAt).toBeNull();
    expect(record.reflection).toBeNull();
  });

  it("refuses a second copy of the same experiment", () => {
    startPreviewCareerExperiment("data-analyst");
    const second = startPreviewCareerExperiment("data-analyst");

    expect(second.ok).toBe(false);
    expect(second.message).toBe(
      "You already have this experiment. Finish it, or clear the result and start again.",
    );
    expect(experimentCount()).toBe(1);
  });

  it("counts the start as nothing in your study time", () => {
    startPreviewCareerExperiment("data-analyst");

    expect(loadPreviewWorkspace().sessions).toHaveLength(0);
    expect(loadPreviewWorkspace().evidence).toHaveLength(0);
  });
});

describe("finishing a career experiment in preview", () => {
  it("refuses to record a result for an experiment that was never started", () => {
    const result = completePreviewCareerExperiment({
      careerSlug: "data-scientist",
      reflection: makeReflection(),
      reflectionText: "",
      outputUrl: "https://example.com/notebook",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain(
      "Start the experiment first, so the date you began it stays honest.",
    );
    expect(experimentCount()).toBe(0);
  });

  it("refuses a link that is not a web address", () => {
    startPreviewCareerExperiment("data-engineer");

    const result = completePreviewCareerExperiment({
      careerSlug: "data-engineer",
      reflection: makeReflection(),
      reflectionText: "",
      outputUrl: "file:///Users/me/pipeline.py",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("http:// or https://");
    expect(
      loadPreviewWorkspace().careerExperiments[0].status,
    ).toBe("in_progress");
  });

  it("refuses a reflection with a missing rating", () => {
    startPreviewCareerExperiment("data-engineer");

    const result = completePreviewCareerExperiment({
      careerSlug: "data-engineer",
      reflection: {
        interest: 4,
        difficulty: 3,
        enjoyment: 4,
        willingness: 0,
      },
      reflectionText: "",
      outputUrl: "https://example.com/pipeline",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain(
      "Answer all four reflection questions with a whole number from 1 to 5.",
    );
  });

  it("stores your ratings, your words, and the link to the work", () => {
    startPreviewCareerExperiment("data-engineer");

    const result = completePreviewCareerExperiment({
      careerSlug: "data-engineer",
      reflection: makeReflection({ interest: 5, difficulty: 4, enjoyment: 4, willingness: 5 }),
      reflectionText: "  The check catching the duplicate rows was the best part.  ",
      outputUrl: " https://example.com/pipeline ",
    });

    expect(result.ok).toBe(true);

    const [record] = loadPreviewWorkspace().careerExperiments;

    expect(record.status).toBe("completed");
    expect(record.reflection).toEqual({
      interest: 5,
      difficulty: 4,
      enjoyment: 4,
      willingness: 5,
    });
    expect(record.reflectionText).toBe(
      "The check catching the duplicate rows was the best part.",
    );
    expect(record.outputUrl).toBe("https://example.com/pipeline");
    expect(record.completedAt).not.toBeNull();
  });

  it("refuses to overwrite a result you already recorded", () => {
    startPreviewCareerExperiment("data-analyst");
    completePreviewCareerExperiment({
      careerSlug: "data-analyst",
      reflection: makeReflection(),
      reflectionText: "",
      outputUrl: "https://example.com/memo",
    });

    const again = completePreviewCareerExperiment({
      careerSlug: "data-analyst",
      reflection: makeReflection({ interest: 1, enjoyment: 1, willingness: 1 }),
      reflectionText: "changed my mind",
      outputUrl: "https://example.com/other",
    });

    expect(again.ok).toBe(false);
    expect(again.message).toContain("Clear the result if you want to redo it.");
    expect(loadPreviewWorkspace().careerExperiments[0].outputUrl).toBe(
      "https://example.com/memo",
    );
  });

  it("clears a recorded result so the role can be tried again", () => {
    startPreviewCareerExperiment("data-analyst");
    completePreviewCareerExperiment({
      careerSlug: "data-analyst",
      reflection: makeReflection(),
      reflectionText: "",
      outputUrl: "https://example.com/memo",
    });

    const cleared = clearPreviewCareerExperiment("data-analyst");

    expect(cleared.ok).toBe(true);
    expect(experimentCount()).toBe(0);

    const missing = clearPreviewCareerExperiment("data-analyst");
    expect(missing.ok).toBe(false);
    expect(missing.message).toBe("That experiment result no longer exists.");
  });
});

describe("recording your own specialization choice in preview", () => {
  it("refuses two slots filled with the same role", () => {
    const result = savePreviewCareerOverride({
      specialization: "data-analyst",
      alternative: "data-analyst",
      reason: "I want the first role and also the same role as a backup.",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Pick two different roles");
    expect(loadPreviewWorkspace().careerPreferences).toHaveLength(0);
  });

  it("refuses a choice with no reasoning behind it", () => {
    const result = savePreviewCareerOverride({
      specialization: "data-engineer",
      alternative: "data-analyst",
      reason: "because",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("at least 20 characters");
  });

  it("keeps one recorded choice, replaced rather than stacked", () => {
    savePreviewCareerOverride({
      specialization: "data-engineer",
      alternative: "data-analyst",
      reason: "Pipelines interested me more than reports once I built one.",
    });

    savePreviewCareerOverride({
      specialization: "mlops-engineer",
      alternative: "data-engineer",
      reason: "After the second experiment, reproducibility became the interesting part.",
    });

    const preferences = loadPreviewWorkspace().careerPreferences;

    expect(preferences).toHaveLength(1);
    expect(preferences[0].specializationChoice).toBe("mlops-engineer");
    expect(preferences[0].alternativeChoice).toBe("data-engineer");
    expect(preferences[0].overrideReason).toBe(
      "After the second experiment, reproducibility became the interesting part.",
    );
  });

  it("removes the recorded choice when asked", () => {
    savePreviewCareerOverride({
      specialization: "data-engineer",
      alternative: "data-analyst",
      reason: "Pipelines interested me more than reports once I built one.",
    });

    expect(clearPreviewCareerOverride().ok).toBe(true);
    expect(loadPreviewWorkspace().careerPreferences).toHaveLength(0);
    expect(clearPreviewCareerOverride().ok).toBe(false);
  });
});

describe("reading stored career data from this browser", () => {
  it("drops an experiment stored against an unknown role", () => {
    const stored = JSON.stringify({
      version: 1,
      assessments: [],
      roadmaps: [],
      sessions: [],
      projects: [],
      evidence: [],
      careerPreferences: [],
      careerExperiments: [
        {
          id: "one",
          careerSlug: "chief-vibes-officer",
          title: "Made up",
          brief: "",
          status: "completed",
          reflection: makeReflection(),
          reflectionText: "",
          outputUrl: null,
          startedAt: null,
          completedAt: null,
          createdAt: "2026-11-01T10:00:00.000Z",
          updatedAt: "2026-11-01T10:00:00.000Z",
        },
        {
          id: "two",
          careerSlug: "data-analyst",
          title: "Answer three questions",
          brief: "",
          status: "in_progress",
          reflection: null,
          reflectionText: "",
          outputUrl: null,
          startedAt: null,
          completedAt: null,
          createdAt: "2026-11-01T10:00:00.000Z",
          updatedAt: "2026-11-01T10:00:00.000Z",
        },
      ],
    });

    const parsed = parsePreviewWorkspace(stored);

    expect(parsed.careerExperiments).toHaveLength(1);
    expect(parsed.careerExperiments[0].careerSlug).toBe("data-analyst");
  });

  it("keeps an experiment whose ratings are out of range but drops the ratings", () => {
    const stored = JSON.stringify({
      version: 1,
      careerExperiments: [
        {
          id: "one",
          careerSlug: "data-analyst",
          title: "Answer three questions",
          brief: "",
          status: "completed",
          reflection: { interest: 9, difficulty: 3, enjoyment: 4, willingness: 4 },
          reflectionText: "",
          outputUrl: "https://example.com/memo",
          startedAt: null,
          completedAt: null,
          createdAt: "2026-11-01T10:00:00.000Z",
          updatedAt: "2026-11-01T10:00:00.000Z",
        },
      ],
    });

    expect(parsePreviewWorkspace(stored).careerExperiments).toHaveLength(0);
  });

  it("holds at most one recorded choice", () => {
    const stored = JSON.stringify({
      version: 1,
      careerPreferences: [
        {
          id: "one",
          specializationChoice: "data-analyst",
          alternativeChoice: "data-engineer",
          overrideReason: "First recorded reason that is long enough.",
          updatedAt: "2026-11-01T10:00:00.000Z",
        },
        {
          id: "two",
          specializationChoice: "data-engineer",
          alternativeChoice: "data-analyst",
          overrideReason: "Second recorded reason that is also long enough.",
          updatedAt: "2026-11-02T10:00:00.000Z",
        },
      ],
    });

    const parsed = parsePreviewWorkspace(stored);

    expect(parsed.careerPreferences).toHaveLength(1);
    expect(parsed.careerPreferences[0].id).toBe("one");
  });

  it("starts with nothing when the stored data has no career section at all", () => {
    const parsed = parsePreviewWorkspace(
      JSON.stringify({ version: 1, assessments: [], roadmaps: [], sessions: [], projects: [], evidence: [] }),
    );

    expect(parsed.careerExperiments).toEqual([]);
    expect(parsed.careerPreferences).toEqual([]);
  });
});
