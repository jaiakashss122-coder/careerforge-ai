import { describe, expect, it } from "vitest";
import {
  CAREER_ACTIVITY_QUESTION,
  CAREER_STYLE_QUESTION,
  INTEREST_QUESTIONS,
} from "@/lib/assessment/questions";
import {
  getCareerRecommendations,
  rankAllCareerRecommendations,
} from "@/lib/assessment/career-fit";
import type {
  AssessmentAnswers,
  CareerRecommendation,
  ConfidenceLevel,
  InterestKey,
} from "@/lib/assessment/types";
import {
  buildCareerExplorationModel,
  describeOverride,
  getEvidenceAdjustment,
  getSpecializationStage,
  rankCareersForExploration,
} from "@/lib/career/exploration";
import type { CareerTrackSlug } from "@/lib/career/tracks";
import type { CareerPreferenceRecord } from "@/lib/career/types";
import { PROJECT_TEMPLATES } from "@/lib/projects/templates";
import {
  emptySummary,
  makeCareerExperiment,
  makeProject,
  makeReflection,
  recommendation,
} from "@/lib/test-support/fixtures";

function buildAnswers({
  interests,
  style,
  activity,
}: {
  interests: Partial<Record<InterestKey, number>>;
  style: string;
  activity: string;
}): AssessmentAnswers {
  const answers: AssessmentAnswers = {};

  for (const question of INTEREST_QUESTIONS) {
    answers[question.key] = String(interests[question.interest] ?? 1);
  }

  answers[CAREER_STYLE_QUESTION.key] = style;
  answers[CAREER_ACTIVITY_QUESTION.key] = activity;

  return answers;
}

const engineeringLeaningAnswers = buildAnswers({
  interests: {
    "software-apps": 5,
    automation: 5,
    "ai-systems": 5,
  },
  style: "code",
  activity: "build-app",
});

function preference(
  overrides: Partial<CareerPreferenceRecord> & {
    specializationChoice: CareerTrackSlug | null;
  },
): CareerPreferenceRecord {
  return {
    id: "preference-test",
    specializationChoice: overrides.specializationChoice,
    alternativeChoice: overrides.alternativeChoice ?? null,
    overrideReason: overrides.overrideReason ?? "",
    updatedAt: overrides.updatedAt ?? "2026-11-01T12:00:00.000Z",
  };
}

describe("career scoring", () => {
  it("scores all nine roles when the full ranking is requested", () => {
    const ranked = rankAllCareerRecommendations({
      answers: engineeringLeaningAnswers,
      sections: [],
      profileTarget: null,
    });

    expect(ranked).toHaveLength(9);
    expect(ranked.map((entry) => entry.fitScore)).toEqual(
      [...ranked.map((entry) => entry.fitScore)].sort((a, b) => b - a),
    );
  });

  it("keeps the saved target role in the short list even when it scores lower", () => {
    const full = rankAllCareerRecommendations({
      answers: engineeringLeaningAnswers,
      sections: [],
      profileTarget: null,
    });

    const weakest = full[full.length - 1];

    const short = getCareerRecommendations({
      answers: engineeringLeaningAnswers,
      sections: [],
      profileTarget: weakest.slug,
    });

    expect(short).toHaveLength(3);
    expect(short.map((entry) => entry.slug)).toContain(weakest.slug);
    expect(short[2].slug).toBe(weakest.slug);
  });

  it("returns the three best matches when no target role is saved", () => {
    const short = getCareerRecommendations({
      answers: engineeringLeaningAnswers,
      sections: [],
      profileTarget: null,
    });

    const full = rankAllCareerRecommendations({
      answers: engineeringLeaningAnswers,
      sections: [],
      profileTarget: null,
    });

    expect(short.map((entry) => entry.slug)).toEqual(
      full.slice(0, 3).map((entry) => entry.slug),
    );
  });
});

describe("experiment reflections", () => {
  it("changes nothing when every reflection answer is the middle of the scale", () => {
    expect(getEvidenceAdjustment(makeReflection())).toBe(0);
  });

  it("adds the full fifteen points when interest, enjoyment and willingness are all five", () => {
    expect(
      getEvidenceAdjustment(
        makeReflection({ interest: 5, enjoyment: 5, willingness: 5, difficulty: 1 }),
      ),
    ).toBe(15);
  });

  it("subtracts fifteen points when you would not practise it and did not enjoy it", () => {
    expect(
      getEvidenceAdjustment(
        makeReflection({ interest: 1, enjoyment: 1, willingness: 1, difficulty: 5 }),
      ),
    ).toBe(-15);
  });

  it("ignores difficulty when scoring the reflection, because difficulty alone is not a preference", () => {
    const easy = getEvidenceAdjustment(
      makeReflection({ interest: 5, enjoyment: 5, willingness: 5, difficulty: 1 }),
    );
    const hard = getEvidenceAdjustment(
      makeReflection({ interest: 5, enjoyment: 5, willingness: 5, difficulty: 5 }),
    );

    expect(easy).toBe(hard);
  });

  it("adds nothing when the experiment was never finished", () => {
    expect(getEvidenceAdjustment(null)).toBe(0);
  });
});

describe("ranked career exploration", () => {
  it("keeps an untested role at its assessment score and calls it a hypothesis", () => {
    const ranked = rankCareersForExploration({
      recommendations: [recommendation("data-analyst", 60)],
      experiments: [],
      completedProjectTracks: [],
      preference: null,
      profileTarget: null,
    });

    expect(ranked[0].combinedScore).toBe(60);
    expect(ranked[0].evidenceAdjustment).toBe(0);
    expect(ranked[0].confidence).toBe("assessment_only");
    expect(ranked[0].confidenceNote).toContain("hypothesis to test");
    expect(ranked[0].supportingEvidence).toEqual(["Synthetic test reason"]);
  });

  it("lets a tested role overtake one that scored higher on the assessment alone", () => {
    const recommendations: CareerRecommendation[] = [
      recommendation("data-analyst", 70),
      recommendation("data-scientist", 60),
    ];

    const ranked = rankCareersForExploration({
      recommendations,
      experiments: [
        makeCareerExperiment({
          id: "experiment-scientist",
          careerSlug: "data-scientist",
          reflection: makeReflection({
            interest: 5,
            enjoyment: 5,
            willingness: 5,
            difficulty: 4,
          }),
        }),
      ],
      completedProjectTracks: [],
      preference: null,
      profileTarget: null,
    });

    expect(ranked[0].slug).toBe("data-scientist");
    expect(ranked[0].combinedScore).toBe(75);
    expect(ranked[0].confidence).toBe("one_experiment");
    expect(ranked[0].supportingEvidence.join(" ")).toContain(
      "interest 5 of 5, enjoyment 5 of 5",
    );
  });

  it("reports a hard trial you would still practise as a stronger signal", () => {
    const ranked = rankCareersForExploration({
      recommendations: [recommendation("data-engineer", 55)],
      experiments: [
        makeCareerExperiment({
          id: "experiment-engineer",
          careerSlug: "data-engineer",
          reflection: makeReflection({
            interest: 5,
            enjoyment: 4,
            willingness: 5,
            difficulty: 5,
          }),
        }),
      ],
      completedProjectTracks: [],
      preference: null,
      profileTarget: null,
    });

    expect(ranked[0].supportingEvidence.join(" ")).toContain(
      "A hard trial you would repeat is a stronger signal than an easy one.",
    );
  });

  it("counts finished project work as a higher confidence level, without claiming outside verification", () => {
    const ranked = rankCareersForExploration({
      recommendations: [recommendation("data-analyst", 65)],
      experiments: [
        makeCareerExperiment({
          id: "experiment-analyst",
          careerSlug: "data-analyst",
          reflection: makeReflection({ interest: 4, enjoyment: 4, willingness: 4 }),
        }),
      ],
      completedProjectTracks: ["data-analyst"],
      preference: null,
      profileTarget: null,
    });

    expect(ranked[0].confidence).toBe("experiment_and_project");
    expect(ranked[0].confidenceNote).toContain("not of anything an outside reviewer confirmed");
    expect(ranked[0].supportingEvidence.join(" ")).toContain(
      "accepted by you, not by an outside reviewer",
    );
  });

  it("never pushes a score past one hundred", () => {
    const ranked = rankCareersForExploration({
      recommendations: [recommendation("data-scientist", 95)],
      experiments: [
        makeCareerExperiment({
          id: "experiment-scientist",
          careerSlug: "data-scientist",
          reflection: makeReflection({ interest: 5, enjoyment: 5, willingness: 5 }),
        }),
      ],
      completedProjectTracks: [],
      preference: null,
      profileTarget: null,
    });

    expect(ranked[0].combinedScore).toBe(100);
  });

  it("marks the role you chose and the alternative you recorded", () => {
    const ranked = rankCareersForExploration({
      recommendations: [
        recommendation("data-analyst", 60),
        recommendation("data-engineer", 55),
      ],
      experiments: [],
      completedProjectTracks: [],
      preference: preference({
        specializationChoice: "data-engineer",
        alternativeChoice: "data-analyst",
      }),
      profileTarget: "data-engineer",
    });

    const engineer = ranked.find((entry) => entry.slug === "data-engineer");
    const analyst = ranked.find((entry) => entry.slug === "data-analyst");

    expect(engineer?.chosen).toBe(true);
    expect(engineer?.profileTarget).toBe(true);
    expect(analyst?.alternative).toBe(true);
  });
});

describe("specialization stage", () => {
  const leaderRecommendations = [
    recommendation("data-analyst", 70),
    recommendation("data-engineer", 60),
  ];

  it("stays exploratory while the top-ranked role has not been tried", () => {
    const experiments = [
      makeCareerExperiment({
        id: "experiment-engineer",
        careerSlug: "data-engineer",
      }),
    ];

    const ranked = rankCareersForExploration({
      recommendations: leaderRecommendations,
      experiments,
      completedProjectTracks: ["data-engineer"],
      preference: null,
      profileTarget: null,
    });

    const stage = getSpecializationStage({
      ranked,
      experiments,
      completedProjectTracks: ["data-engineer"],
    });

    expect(stage.ready).toBe(false);
    expect(stage.label).toBe("Exploratory");
    expect(stage.missing[0]).toContain("you have not finished its experiment yet");
  });

  it("does not commit on a single trial even when it went well", () => {
    const experiments = [
      makeCareerExperiment({
        id: "experiment-analyst",
        careerSlug: "data-analyst",
      }),
    ];

    const ranked = rankCareersForExploration({
      recommendations: leaderRecommendations,
      experiments,
      completedProjectTracks: ["data-analyst"],
      preference: null,
      profileTarget: null,
    });

    const stage = getSpecializationStage({
      ranked,
      experiments,
      completedProjectTracks: ["data-analyst"],
    });

    expect(stage.ready).toBe(false);
    expect(stage.missing.join(" ")).toContain("not a comparison");
  });

  it("commits once the leader is tested, a second experiment is finished, and project work is complete", () => {
    const experiments = [
      makeCareerExperiment({
        id: "experiment-analyst",
        careerSlug: "data-analyst",
      }),
      makeCareerExperiment({
        id: "experiment-engineer",
        careerSlug: "data-engineer",
      }),
    ];

    const ranked = rankCareersForExploration({
      recommendations: leaderRecommendations,
      experiments,
      completedProjectTracks: ["data-analyst"],
      preference: null,
      profileTarget: null,
    });

    const stage = getSpecializationStage({
      ranked,
      experiments,
      completedProjectTracks: ["data-analyst"],
    });

    expect(stage.ready).toBe(true);
    expect(stage.label).toBe("Ready to commit");
    expect(stage.description).toContain("2 finished experiments");
    expect(stage.description).toContain("data-analyst");
    expect(stage.missing).toEqual([]);
  });

  it("asks for the assessment when there is nothing to rank", () => {
    const stage = getSpecializationStage({
      ranked: [],
      experiments: [],
      completedProjectTracks: [],
    });

    expect(stage.ready).toBe(false);
    expect(stage.description).toContain(
      "Finish the skills assessment so the workspace has a ranking to work from",
    );
  });
});

describe("overriding the recommendation", () => {
  const ranked = rankCareersForExploration({
    recommendations: [
      recommendation("data-analyst", 70, "Data Analyst"),
      recommendation("data-engineer", 50, "Data Engineer"),
    ],
    experiments: [],
    completedProjectTracks: [],
    preference: null,
    profileTarget: null,
  });

  it("shows nothing when no choice has been recorded", () => {
    expect(
      describeOverride({ preference: null, ranked }),
    ).toBeNull();
  });

  it("says the choice matches the ranking when you take the top role", () => {
    const summary = describeOverride({
      preference: preference({
        specializationChoice: "data-analyst",
        overrideReason: "I like answering questions about money.",
      }),
      ranked,
    });

    expect(summary?.headline).toBe("You chose Data Analyst.");
    expect(summary?.detail).toContain("matches the workspace ranking");
  });

  it("keeps your reason visible when you pick against the ranking", () => {
    const summary = describeOverride({
      preference: preference({
        specializationChoice: "data-engineer",
        overrideReason: "Pipelines appealed more than reports.",
      }),
      ranked,
    });

    expect(summary?.headline).toContain("You chose Data Engineer");
    expect(summary?.headline).toContain("behind Data Analyst at 70");
    expect(summary?.detail).toContain(
      "Your recorded reason: Pipelines appealed more than reports.",
    );
  });

  it("says so when the override has no reason recorded", () => {
    const summary = describeOverride({
      preference: preference({ specializationChoice: "data-engineer" }),
      ranked,
    });

    expect(summary?.detail).toContain("No reason was recorded");
  });
});

describe("career explorer workspace model", () => {
  const coveredTemplate = PROJECT_TEMPLATES.find(
    (template) => template.trackSlugs.length > 0,
  );

  if (!coveredTemplate) {
    throw new Error("Expected at least one project template to cover a role");
  }

  it("ranks all nine roles at zero when no assessment is stored", () => {
    const model = buildCareerExplorationModel({
      summary: null,
      experiments: [],
      projects: [],
      preference: null,
    });

    expect(model.ranked).toHaveLength(9);
    expect(model.ranked.every((entry) => entry.combinedScore === 0)).toBe(true);
    expect(model.stage.ready).toBe(false);
    expect(model.stage.missing).toEqual([
      "No career ranking exists yet. Complete the skills assessment first.",
    ]);
    expect(model.override).toBeNull();
    expect(model.untestedTrackCount).toBe(9);
  });

  it("uses the target role saved in your profile, not the one stored in an older summary", () => {
    const model = buildCareerExplorationModel({
      summary: emptySummary({ profileTarget: "data-analyst" }),
      experiments: [],
      projects: [],
      preference: null,
      profileTarget: "mlops-engineer",
    });

    expect(
      model.ranked.find((entry) => entry.slug === "mlops-engineer")
        ?.profileTarget,
    ).toBe(true);
    expect(
      model.ranked.find((entry) => entry.slug === "data-analyst")?.profileTarget,
    ).toBe(false);
  });

  it("falls back to the role saved in the summary when your profile has none", () => {
    const model = buildCareerExplorationModel({
      summary: emptySummary({ profileTarget: "data-analyst" }),
      experiments: [],
      projects: [],
      preference: null,
    });

    expect(
      model.ranked.find((entry) => entry.slug === "data-analyst")
        ?.profileTarget,
    ).toBe(true);
  });

  it("counts a finished project as evidence for every role that project covers", () => {
    const finished = buildCareerExplorationModel({
      summary: null,
      experiments: [],
      projects: [
        makeProject({
          id: "project-1",
          templateSlug: coveredTemplate.slug,
          status: "completed",
        }),
      ],
      preference: null,
    });

    expect(finished.completedProjectTracks).toEqual(
      expect.arrayContaining([...coveredTemplate.trackSlugs]),
    );

    const paused = buildCareerExplorationModel({
      summary: null,
      experiments: [],
      projects: [
        makeProject({
          id: "project-2",
          templateSlug: coveredTemplate.slug,
          status: "paused",
        }),
      ],
      preference: null,
    });

    expect(paused.completedProjectTracks).toEqual([]);
  });

  it("reproduces the assessment ranking from the stored summary alone", () => {
    const direct = rankAllCareerRecommendations({
      answers: engineeringLeaningAnswers,
      sections: [],
      profileTarget: null,
    });

    const summary = emptySummary({
      careerSignals: INTEREST_QUESTIONS.map((question) => ({
        key: question.interest,
        label: question.interest,
        description: "",
        rating: Number(
          engineeringLeaningAnswers[question.key] ?? 1,
        ) as ConfidenceLevel,
      })),
    });

    const model = buildCareerExplorationModel({
      summary,
      experiments: [],
      projects: [],
      preference: null,
      profileTarget: null,
    });

    expect(model.ranked).toHaveLength(9);

    for (const entry of model.ranked) {
      const original = direct.find((item) => item.slug === entry.slug);

      expect(entry.fitScore).toBe(original?.fitScore);
      expect(entry.combinedScore).toBe(original?.fitScore);
    }
  });

  it("lowers a role the moment your reflection says you would not practise it", () => {
    const summary = emptySummary({
      careerSignals: INTEREST_QUESTIONS.map((question) => ({
        key: question.interest,
        label: question.interest,
        description: "",
        rating: Number(
          engineeringLeaningAnswers[question.key] ?? 1,
        ) as ConfidenceLevel,
      })),
    });

    const before = buildCareerExplorationModel({
      summary,
      experiments: [],
      projects: [],
      preference: null,
      profileTarget: null,
    });

    const leader = before.ranked[0];
    const tested = buildCareerExplorationModel({
      summary,
      experiments: [
        makeCareerExperiment({
          id: "experiment-leader",
          careerSlug: leader.slug,
          reflection: makeReflection({ interest: 1, enjoyment: 1, willingness: 1 }),
        }),
      ],
      projects: [],
      preference: null,
      profileTarget: null,
    });

    const sameRole = tested.ranked.find((entry) => entry.slug === leader.slug);

    expect(sameRole?.evidenceAdjustment).toBe(-15);
    expect(sameRole?.combinedScore).toBe(leader.combinedScore - 15);
    expect(sameRole?.confidenceLabel).toBe("One experiment done");
  });
});
