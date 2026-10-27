import { describe, expect, it } from "vitest";
import {
  CAREER_EXPERIMENT_KIND_META,
  CAREER_EXPERIMENTS,
  getCareerExperimentForTrack,
  listCareerExperimentsByKind,
} from "@/lib/career/experiments";
import {
  CAREER_ROLE_PROFILES,
  getRolePortfolioProjectSlugs,
  getRoleSkills,
} from "@/lib/career/role-profiles";
import { CAREER_TRACK_SLUGS } from "@/lib/career/tracks";
import { REFLECTION_QUESTIONS } from "@/lib/career/types";
import { PROJECT_TEMPLATES } from "@/lib/projects/templates";

describe("career role profiles", () => {
  it("covers every career track the app knows about", () => {
    expect(Object.keys(CAREER_ROLE_PROFILES).sort()).toEqual(
      [...CAREER_TRACK_SLUGS].sort(),
    );
  });

  it("gives every role enough substance to describe the actual work", () => {
    for (const slug of CAREER_TRACK_SLUGS) {
      const profile = CAREER_ROLE_PROFILES[slug];

      expect(profile.responsibilities.length).toBeGreaterThanOrEqual(4);
      expect(profile.tools.length).toBeGreaterThanOrEqual(3);
      expect(profile.interviewTopics.length).toBeGreaterThanOrEqual(3);
      expect(profile.entryBar.length).toBeGreaterThanOrEqual(3);
      expect(profile.progression.length).toBeGreaterThan(40);
    }
  });

  it("lists portfolio projects that exist in the project library", () => {
    const knownTemplateSlugs = PROJECT_TEMPLATES.map(
      (template) => template.slug,
    );

    for (const slug of CAREER_TRACK_SLUGS) {
      const suggestions = getRolePortfolioProjectSlugs(slug);

      expect(suggestions.length).toBeGreaterThan(0);

      for (const suggestion of suggestions) {
        expect(knownTemplateSlugs).toContain(suggestion.slug);
      }
    }
  });

  it("names skills the assessment can actually screen", () => {
    for (const slug of CAREER_TRACK_SLUGS) {
      const skills = getRoleSkills(slug);

      expect(skills.length).toBeGreaterThanOrEqual(4);

      for (const skill of skills) {
        expect(skill.name.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("career experiments", () => {
  it("gives every career track exactly one experiment to run", () => {
    for (const slug of CAREER_TRACK_SLUGS) {
      const definition = getCareerExperimentForTrack(slug);

      expect(definition).not.toBeNull();
      expect(CAREER_EXPERIMENTS.filter((item) => item.careerSlug === slug)).toHaveLength(
        1,
      );
    }
  });

  it("groups the nine experiments into the five kinds the plan promised", () => {
    const kinds = new Set(CAREER_EXPERIMENTS.map((item) => item.kind));

    expect([...kinds].sort()).toEqual(Object.keys(CAREER_EXPERIMENT_KIND_META).sort());
    expect(CAREER_EXPERIMENTS).toHaveLength(9);
    expect(listCareerExperimentsByKind("ai-applications")).toHaveLength(3);
  });

  it("describes work a learner can start without asking what it means", () => {
    for (const definition of CAREER_EXPERIMENTS) {
      expect(definition.steps.length).toBeGreaterThanOrEqual(4);
      expect(definition.observe.length).toBeGreaterThanOrEqual(3);
      expect(definition.output.length).toBeGreaterThan(30);
      expect(definition.brief.length).toBeGreaterThan(30);
      expect(definition.estimatedMinutes).toBeGreaterThanOrEqual(120);
      expect(definition.estimatedMinutes).toBeLessThanOrEqual(210);

      for (const step of definition.steps) {
        expect(step.length).toBeGreaterThan(25);
      }
    }
  });
});

describe("reflection questions", () => {
  it("explains both ends of every scale so a rating cannot be misread", () => {
    expect(REFLECTION_QUESTIONS.map((question) => question.scale)).toEqual([
      "interest",
      "difficulty",
      "enjoyment",
      "willingness",
    ]);

    for (const question of REFLECTION_QUESTIONS) {
      expect(question.question.length).toBeGreaterThan(15);
      expect(question.oneMeans.startsWith("1 ")).toBe(true);
      expect(question.fiveMeans.startsWith("5 ")).toBe(true);
    }
  });
});
