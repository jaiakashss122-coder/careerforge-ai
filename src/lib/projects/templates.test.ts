import { describe, expect, it } from "vitest";
import { PROJECT_LEVELS, PROJECT_RUBRIC } from "./types";
import { PROJECT_TEMPLATES, getProjectTemplate } from "./templates";
import { SKILLS } from "@/lib/skills/catalog";
import { CAREER_TRACK_SLUGS } from "@/lib/career/tracks";

const skillSlugs = new Set(SKILLS.map((skill) => skill.slug));
const trackSlugs = new Set<string>(CAREER_TRACK_SLUGS);

describe("project templates", () => {
  it("provides ten starter templates with unique slugs", () => {
    expect(PROJECT_TEMPLATES).toHaveLength(10);
    expect(new Set(PROJECT_TEMPLATES.map((t) => t.slug)).size).toBe(10);
  });

  it("covers the project levels used by the lock ladder", () => {
    const levels = new Set(PROJECT_TEMPLATES.map((t) => t.level));
    for (const level of PROJECT_LEVELS) {
      expect(levels).toContain(level);
    }
  });

  it("names the projects promised on the Project Lab page", () => {
    for (const slug of [
      "personal-expense-analysis",
      "sql-business-insights",
      "churn-prediction",
      "model-api-service",
      "rag-document-assistant",
      "batch-data-pipeline",
    ]) {
      expect(getProjectTemplate(slug)).not.toBeNull();
    }
  });

  it("references only catalogued skills and real career tracks", () => {
    for (const template of PROJECT_TEMPLATES) {
      for (const slug of [
        ...template.prerequisiteSkillSlugs,
        ...template.skillSlugs,
      ]) {
        expect(skillSlugs, `${template.slug} -> ${slug}`).toContain(slug);
      }

      for (const slug of template.trackSlugs) {
        expect(trackSlugs, `${template.slug} -> ${slug}`).toContain(slug);
      }
    }
  });

  it("gives every template the full briefing the page promises", () => {
    for (const template of PROJECT_TEMPLATES) {
      expect(template.motivation.length, template.slug).toBeGreaterThan(80);
      expect(template.problemStatement.length, template.slug).toBeGreaterThan(20);
      expect(template.datasetGuidance.source.length, template.slug).toBeGreaterThan(20);
      expect(template.datasetGuidance.alternatives.length, template.slug).toBeGreaterThan(0);
      expect(template.milestones.length, template.slug).toBeGreaterThanOrEqual(5);
      expect(template.folderStructure.length, template.slug).toBeGreaterThanOrEqual(5);
      expect(template.testingChecklist.length, template.slug).toBeGreaterThanOrEqual(4);
      expect(template.metrics.length, template.slug).toBeGreaterThanOrEqual(3);
      expect(template.interviewQuestions.length, template.slug).toBeGreaterThanOrEqual(4);
      expect(template.portfolioChecklist.length, template.slug).toBeGreaterThanOrEqual(4);
      expect(template.estimatedHours, template.slug).toBeGreaterThan(0);
    }
  });

  it("keeps milestone keys unique and ordered within each template", () => {
    for (const template of PROJECT_TEMPLATES) {
      const keys = template.milestones.map((milestone) => milestone.key);
      expect(new Set(keys).size, template.slug).toBe(keys.length);

      for (const milestone of template.milestones) {
        expect(milestone.estimatedMinutes, milestone.key).toBeGreaterThan(0);
        expect(milestone.evidenceHint.length, milestone.key).toBeGreaterThan(10);
      }
    }
  });

  it("does not embed dataset URLs that could rot or be fabricated", () => {
    for (const template of PROJECT_TEMPLATES) {
      const text = JSON.stringify(template);
      expect(text, template.slug).not.toMatch(/https?:\/\//);
    }
  });

  it("requires more prior evidence as the level rises", () => {
    const required = Object.fromEntries(
      PROJECT_LEVELS.map((level) => [
        level,
        PROJECT_TEMPLATES.filter((t) => t.level === level).map(
          (t) => t.requiresCompletedProjects,
        ),
      ]),
    );

    expect(Math.max(...required.foundation)).toBe(0);
    expect(Math.min(...required.applied)).toBeGreaterThan(0);
    expect(Math.min(...required.advanced)).toBeGreaterThanOrEqual(
      Math.max(...required.applied),
    );
  });

  it("returns null for an unknown template slug", () => {
    expect(getProjectTemplate("nope")).toBeNull();
    expect(getProjectTemplate(null)).toBeNull();
  });

  it("exposes a rubric with unique keys", () => {
    const keys = PROJECT_RUBRIC.map((criterion) => criterion.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThanOrEqual(5);
  });
});
