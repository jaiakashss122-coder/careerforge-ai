import { describe, expect, it } from "vitest";
import { CAREER_TRACKS, getCareerTrack, isCareerTrackSlug } from "@/lib/career/tracks";
import { getNavItem, NAV_ITEMS } from "@/lib/navigation";
import {
  BLUEPRINT_TOTAL_HOURS,
  BLUEPRINT_TOTAL_WEEKS,
  NINETY_DAY_BLUEPRINT,
} from "@/lib/roadmap/blueprint";

describe("navigation", () => {
  it("contains the twelve agreed destinations exactly once", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);

    expect(NAV_ITEMS).toHaveLength(12);
    expect(new Set(hrefs).size).toBe(12);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/assessment",
        "/dashboard",
        "/roadmap",
        "/tutor",
        "/prompts",
        "/projects",
        "/careers",
        "/intelligence",
        "/interview",
        "/materials",
        "/progress",
        "/settings",
      ]),
    );
  });

  it("marks only implemented destinations as available", () => {
    const available = NAV_ITEMS.filter((item) => item.status === "available");

    expect(available.map((item) => item.href).sort()).toEqual([
      "/assessment",
      "/careers",
      "/dashboard",
      "/intelligence",
      "/interview",
      "/materials",
      "/progress",
      "/projects",
      "/prompts",
      "/roadmap",
      "/settings",
      "/tutor",
    ]);
    expect(
      NAV_ITEMS.filter((item) => item.status !== "available"),
    ).toEqual([]);
  });

  it("resolves nested routes to their section", () => {
    expect(getNavItem("/dashboard")?.label).toBe("Dashboard");
    expect(getNavItem("/assessment/results/abc")?.label).toBe(
      "Skills Assessment",
    );
    expect(getNavItem("/careers/data-analyst")?.label).toBe("Career Explorer");
    expect(getNavItem("/unknown")).toBeUndefined();
  });
});

describe("90-day blueprint", () => {
  it("matches the agreed 13-week, 130-hour scope", () => {
    expect(BLUEPRINT_TOTAL_WEEKS).toBe(13);
    expect(BLUEPRINT_TOTAL_HOURS).toBe(130);
    expect(NINETY_DAY_BLUEPRINT).toHaveLength(7);
  });

  it("gives every phase topics, a summary, and a deliverable", () => {
    for (const phase of NINETY_DAY_BLUEPRINT) {
      expect(phase.weeks.length).toBeGreaterThan(0);
      expect(phase.summary.length).toBeGreaterThan(0);
      expect(phase.topics.length).toBeGreaterThanOrEqual(4);
      expect(phase.deliverable.length).toBeGreaterThan(0);
    }
  });
});

describe("career tracks", () => {
  it("covers the nine roles from the brief", () => {
    expect(CAREER_TRACKS).toHaveLength(9);
    expect(new Set(CAREER_TRACKS.map((track) => track.slug)).size).toBe(9);
  });

  it("looks up valid tracks and rejects unknown values", () => {
    expect(getCareerTrack("data-analyst")?.name).toBe("Data Analyst");
    expect(getCareerTrack(null)).toBeNull();
    expect(getCareerTrack("astronaut")).toBeNull();
    expect(isCareerTrackSlug("mlops-engineer")).toBe(true);
    expect(isCareerTrackSlug("astronaut")).toBe(false);
  });
});
