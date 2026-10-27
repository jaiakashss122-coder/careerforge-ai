import { describe, expect, it } from "vitest";
import {
  LEARN_NOW_PERCENT_CEILING,
  buildIntelligenceModel,
  formatPublishedDate,
  getIntelligenceGoal,
} from "@/lib/intelligence/briefing";
import {
  INDUSTRY_UPDATES,
  INTELLIGENCE_MISSING_DATA,
  INTELLIGENCE_SNAPSHOT,
} from "@/lib/intelligence/sources";
import {
  INTELLIGENCE_TOPICS,
  type IntelligenceTopic,
} from "@/lib/intelligence/types";
import { isCareerTrackSlug } from "@/lib/career/tracks";
import { SKILLS } from "@/lib/skills/catalog";
import {
  emptySummary,
  makeCareerExperiment,
  makeSection,
  makeSkillResult,
} from "@/lib/test-support/fixtures";
import type { CareerPreferenceRecord } from "@/lib/career/types";

const SKILL_SLUGS = new Set(SKILLS.map((skill) => skill.slug));

function preference(
  overrides: Partial<CareerPreferenceRecord> = {},
): CareerPreferenceRecord {
  return {
    id: "preference-1",
    specializationChoice: "data-engineer",
    alternativeChoice: null,
    overrideReason: "Pipelines appealed more than reports.",
    updatedAt: "2026-10-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("industry update sources", () => {
  it("gives every entry a reachable published source", () => {
    for (const update of INDUSTRY_UPDATES) {
      expect(update.sourceUrl.startsWith("https://")).toBe(true);
      expect(update.sourceName.length).toBeGreaterThan(2);
      expect(update.whatChanged.length).toBeGreaterThan(40);
      expect(update.whyItMatters.length).toBeGreaterThan(40);
      expect(update.headline.length).toBeGreaterThan(8);
    }
  });

  it("names only roles and skills this app actually knows", () => {
    for (const update of INDUSTRY_UPDATES) {
      expect(update.tracks.length).toBeGreaterThan(0);
      expect(update.skills.length).toBeGreaterThan(0);

      for (const slug of update.tracks) {
        expect(isCareerTrackSlug(slug)).toBe(true);
      }

      for (const slug of update.skills) {
        expect(SKILL_SLUGS.has(slug)).toBe(true);
      }
    }
  });

  it("keeps dates honest about what the source actually shows", () => {
    for (const update of INDUSTRY_UPDATES) {
      expect(update.readOn).toBe(INTELLIGENCE_SNAPSHOT.readOn);

      if (update.datePrecision === "undated") {
        expect(update.publishedOn).toBe("");
      } else {
        expect(update.publishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(update.publishedOn <= update.readOn).toBe(true);
      }

      if (update.datePrecision === "month") {
        expect(update.publishedOn.endsWith("-01")).toBe(true);
      }
    }
  });

  it("covers every topic the page promises", () => {
    const covered = new Set(
      INDUSTRY_UPDATES.map((update) => update.topic),
    );

    for (const topic of INTELLIGENCE_TOPICS as readonly IntelligenceTopic[]) {
      expect(covered.has(topic)).toBe(true);
    }
  });

  it("claims no salary figure, hiring count, or open role anywhere", () => {
    const forbidden = /salary|wage|pay range|hiring|vacanc|opening|posted a job|unemploy/i;

    for (const update of INDUSTRY_UPDATES) {
      const visible = [
        update.headline,
        update.whatChanged,
        update.whyItMatters,
      ].join(" ");

      expect(visible).not.toMatch(forbidden);
    }

    const missingText = INTELLIGENCE_MISSING_DATA.map(
      (item) => item.heading,
    ).join(" ");

    expect(missingText).toContain("No salary figures");
  });

  it("labels itself as a dated snapshot rather than live research", () => {
    expect(INTELLIGENCE_SNAPSHOT.note).toContain(INTELLIGENCE_SNAPSHOT.readOn);
    expect(INTELLIGENCE_SNAPSHOT.note).toContain("not live research");
  });
});

describe("learning attention rules", () => {
  it("sets everything to monitor when no direction is recorded", () => {
    const model = buildIntelligenceModel({
      summary: null,
      preference: null,
      experiments: [],
      profileTarget: null,
    });

    expect(model.counts.monitor).toBe(INDUSTRY_UPDATES.length);
    expect(model.counts["learn-now"]).toBe(0);
    expect(model.goal.track).toBeNull();
    expect(model.headline).toContain("all set to just monitor it");
  });

  it("marks entries that touch the saved career choice as learn now", () => {
    const model = buildIntelligenceModel({
      summary: null,
      preference: preference({ specializationChoice: "data-engineer" }),
      experiments: [],
      profileTarget: null,
    });
    const matches = model.entries.filter(
      (item) => item.attention === "learn-now",
    );

    expect(matches.length).toBeGreaterThan(0);

    for (const item of matches) {
      expect(item.update.tracks).toContain("data-engineer");
      expect(item.reason).toContain("the choice you saved on the Career Explorer");
    }
  });

  it("prefers the saved choice over the profile target and the assessment leader", () => {
    const goal = getIntelligenceGoal({
      preference: preference({ specializationChoice: "data-engineer" }),
      profileTarget: "mlops-engineer",
      summary: emptySummary({
        careerRecommendations: [
          {
            slug: "data-analyst",
            name: "Data Analyst",
            family: "Analytics",
            fitScore: 70,
            reasons: ["Synthetic"],
            experiment: "Synthetic",
          },
        ],
      }),
    });

    expect(goal.track).toBe("data-engineer");
    expect(goal.source).toContain("saved on the Career Explorer");
  });

  it("falls back to the profile target, then to the highest assessment score", () => {
    const fromProfile = getIntelligenceGoal({
      preference: null,
      profileTarget: "mlops-engineer",
      summary: emptySummary({ profileTarget: "data-analyst" }),
    });
    const fromAssessment = getIntelligenceGoal({
      preference: null,
      profileTarget: null,
      summary: emptySummary({
        careerRecommendations: [
          {
            slug: "data-scientist",
            name: "Data Scientist",
            family: "Data science",
            fitScore: 55,
            reasons: ["Synthetic"],
            experiment: "Synthetic",
          },
          {
            slug: "data-analyst",
            name: "Data Analyst",
            family: "Analytics",
            fitScore: 80,
            reasons: ["Synthetic"],
            experiment: "Synthetic",
          },
        ],
      }),
    });

    expect(fromProfile.track).toBe("mlops-engineer");
    expect(fromAssessment.track).toBe("data-analyst");
    expect(fromAssessment.source).toContain("80 of 100");
  });

  it("says whether a skill comparison was even possible", () => {
    const withoutAssessment = buildIntelligenceModel({
      summary: null,
      preference: null,
      experiments: [],
      profileTarget: null,
    });
    const withAssessment = buildIntelligenceModel({
      summary: emptySummary({
        sections: [makeSection("sql", [makeSkillResult({ skillSlug: "sql-aggregation", percent: 40 })])],
      }),
      preference: null,
      experiments: [],
      profileTarget: null,
    });

    expect(withoutAssessment.hasAssessment).toBe(false);
    expect(withoutAssessment.weakSkills).toEqual([]);
    expect(withAssessment.hasAssessment).toBe(true);
    expect(withAssessment.weakSkills[0]?.percent).toBe(40);
  });

  it("pulls forward an entry whose skill your assessment scored below the ceiling", () => {
    const summary = emptySummary({
      sections: [
        makeSection("sql", [
          makeSkillResult({
            skillSlug: "database-design",
            percent: 30,
            score: 1,
            maxScore: 3,
          }),
        ]),
      ],
    });
    const model = buildIntelligenceModel({
      summary,
      preference: preference({ specializationChoice: "data-scientist" }),
      experiments: [],
      profileTarget: null,
    });
    const promoted = model.entries.find(
      (item) =>
        item.attention === "learn-now" &&
        item.reason.includes(`under the ${LEARN_NOW_PERCENT_CEILING} percent line`),
    );

    expect(promoted).toBeDefined();
    expect(promoted?.update.skills).toContain("database-design");
    expect(promoted?.update.tracks).not.toContain("data-scientist");
  });

  it("does not promote a skill scored at the ceiling", () => {
    const summary = emptySummary({
      sections: [
        makeSection("sql", [
          makeSkillResult({
            skillSlug: "database-design",
            percent: LEARN_NOW_PERCENT_CEILING,
            score: 3,
            maxScore: 3,
          }),
        ]),
      ],
    });
    const model = buildIntelligenceModel({
      summary,
      preference: preference({ specializationChoice: "data-scientist" }),
      experiments: [],
      profileTarget: null,
    });

    expect(model.weakSkills).toEqual([]);

    for (const item of model.entries) {
      expect(item.reason).not.toContain("Your own assessment scored");
    }
  });

  it("keeps a tested role at learn later when it is not your direction", () => {
    const model = buildIntelligenceModel({
      summary: null,
      preference: preference({ specializationChoice: "data-analyst" }),
      experiments: [
        makeCareerExperiment({
          id: "experiment-1",
          careerSlug: "data-engineer",
          status: "completed",
        }),
      ],
      profileTarget: null,
    });
    const tested = model.entries.filter(
      (item) =>
        item.update.tracks.includes("data-engineer") &&
        !item.update.tracks.includes("data-analyst"),
    );

    expect(tested.length).toBeGreaterThan(0);

    for (const item of tested) {
      expect(["learn-later", "learn-now", "monitor"]).toContain(item.attention);
    }

    expect(model.testedTracks).toEqual(["data-engineer"]);
  });

  it("explains why an entry is only worth monitoring", () => {
    const model = buildIntelligenceModel({
      summary: null,
      preference: preference({ specializationChoice: "data-analyst" }),
      experiments: [],
      profileTarget: null,
    });
    const watched = model.entries.find((item) => item.attention === "monitor");

    expect(watched?.reason).toContain("Neither the roles it names");
  });

  it("lists learn-now entries before everything else", () => {
    const model = buildIntelligenceModel({
      summary: null,
      preference: preference({ specializationChoice: "data-engineer" }),
      experiments: [],
      profileTarget: null,
    });
    const ranks = model.entries.map(
      (item) =>
        item.attention === "learn-now"
          ? 0
          : item.attention === "learn-later"
            ? 1
            : 2,
    );

    expect([...ranks].sort((left, right) => left - right)).toEqual(ranks);
  });
});

describe("weekly briefing", () => {
  it("puts every dated entry into exactly one week and keeps undated apart", () => {
    const model = buildIntelligenceModel({
      summary: null,
      preference: null,
      experiments: [],
      profileTarget: null,
    });
    const inWeeks = model.weeks.reduce((total, week) => total + week.count, 0);
    const dated = INDUSTRY_UPDATES.filter(
      (update) => update.datePrecision !== "undated",
    ).length;

    expect(inWeeks).toBe(dated);
    expect(model.undated.length).toBe(
      INDUSTRY_UPDATES.length - dated,
    );

    for (const week of model.weeks) {
      expect(week.count).toBe(week.items.length);
      expect(week.label).toContain("Week beginning");
    }
  });

  it("orders weeks newest first", () => {
    const model = buildIntelligenceModel({
      summary: null,
      preference: null,
      experiments: [],
      profileTarget: null,
    });

    expect(model.weeks[0]?.label).toContain("Week beginning");
    expect(model.weeks.length).toBeGreaterThan(4);
  });

  it("describes a month-dated source without inventing a day", () => {
    const monthly = INDUSTRY_UPDATES.find(
      (update) => update.datePrecision === "month",
    );
    const undated = INDUSTRY_UPDATES.find(
      (update) => update.datePrecision === "undated",
    );

    expect(monthly).toBeDefined();
    expect(formatPublishedDate(monthly!)).toContain("the source dates this by month");

    if (undated) {
      expect(formatPublishedDate(undated)).toContain("no date shown on the source");
    }
  });
});
