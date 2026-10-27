import { describe, expect, it } from "vitest";
import { CAREER_TRACKS } from "@/lib/career/tracks";
import {
  createInitialRoadmap,
  getInitialFocusTracks,
} from "@/lib/roadmap/initial";
import {
  emptySummary,
  recommendation,
} from "@/lib/test-support/fixtures";

describe("initial focus tracks", () => {
  it("takes the two highest-fit tracks and ignores duplicates", () => {
    const summary = emptySummary({
      careerRecommendations: [
        recommendation("data-scientist", 72),
        recommendation("data-scientist", 70),
        recommendation("data-analyst", 81),
        recommendation("applied-ai-engineer", 64),
      ],
    });

    expect(getInitialFocusTracks(summary)).toEqual([
      "data-analyst",
      "data-scientist",
    ]);
  });

  it("fills the second slot from the catalogue when only one recommendation exists", () => {
    const summary = emptySummary({
      careerRecommendations: [recommendation("mlops-engineer", 88)],
    });

    const [first, second] = getInitialFocusTracks(summary);
    expect(first).toBe("mlops-engineer");
    expect(second).toBe(CAREER_TRACKS[0].slug);
    expect(second).not.toBe(first);
  });

  it("falls back to the first two catalogue tracks without recommendations", () => {
    expect(getInitialFocusTracks(emptySummary())).toEqual([
      CAREER_TRACKS[0].slug,
      CAREER_TRACKS[1].slug,
    ]);
  });
});

describe("createInitialRoadmap", () => {
  it("links the assessment, selected hours, and 13-week schedule", () => {
    const summary = emptySummary({
      careerRecommendations: [
        recommendation("applied-ai-engineer", 90),
        recommendation("data-engineer", 85),
      ],
    });
    const roadmap = createInitialRoadmap({
      assessmentId: "assessment-42",
      summary,
      weeklyHours: 8,
      startDate: "2026-11-02",
      now: "2026-11-01T12:00:00.000Z",
    });

    expect(roadmap.id).toBeTruthy();
    expect(roadmap.status).toBe("active");
    expect(roadmap.source).toBe("assessment");
    expect(roadmap.startDate).toBe("2026-11-02");
    expect(roadmap.focusTracks).toEqual([
      "applied-ai-engineer",
      "data-engineer",
    ]);
    expect(roadmap.summary.assessmentId).toBe("assessment-42");
    expect(roadmap.summary.weeklyHours).toBe(8);
    expect(roadmap.summary.totalMinutes).toBe(8 * 60 * 13);
    expect(roadmap.summary.weeks).toHaveLength(13);
    expect(roadmap.tasks).toHaveLength(41);
    expect(roadmap.tasks.every((task) => task.status === "pending")).toBe(true);
  });
});
