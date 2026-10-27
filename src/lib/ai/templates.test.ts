import { describe, expect, it } from "vitest";
import {
  buildPromptBody,
  buildPromptTemplate,
  PROMPT_GUIDES,
} from "@/lib/ai/templates";
import {
  PROMPT_CATEGORIES,
  type PromptBuilderInput,
} from "@/lib/ai/types";

function input(
  overrides: Partial<PromptBuilderInput> = {},
): PromptBuilderInput {
  return {
    category: "sql",
    goal: "Practice joins without losing rows",
    targetRole: "Data Analyst",
    careerStatus: "decided",
    weeklyHours: 10,
    timeBudget: "45 minutes",
    tools: "VS Code and PostgreSQL",
    teachingStyle: "Worked examples followed by independent practice",
    deliverable: "Three join exercises with expected output",
    evaluationFocus: "Join correctness and NULL handling",
    constraints: "Stable internet",
    learnerContext: "Python: beginner (unverified).",
    ...overrides,
  };
}

describe("Prompt Studio templates", () => {
  it("covers all sixteen categories", () => {
    expect(PROMPT_CATEGORIES).toHaveLength(16);
    expect(Object.keys(PROMPT_GUIDES)).toHaveLength(16);
    for (const category of PROMPT_CATEGORIES) {
      expect(PROMPT_GUIDES[category.id].focus.length).toBeGreaterThan(0);
    }
  });

  it("includes every required learner field in the generated body", () => {
    const body = buildPromptBody(input());

    expect(body).toContain("Practice joins without losing rows");
    expect(body).toContain("Data Analyst");
    expect(body).toContain("45 minutes");
    expect(body).toContain("10 hours");
    expect(body).toContain("VS Code and PostgreSQL");
    expect(body).toContain("Worked examples");
    expect(body).toContain("Three join exercises");
    expect(body).toContain("Join correctness");
    expect(body).toContain("Do not claim");
  });

  it("keeps editable placeholders when a field is empty", () => {
    const body = buildPromptBody(
      input({ goal: "", targetRole: "", timeBudget: "", tools: "" }),
    );

    expect(body).toContain("[YOUR SPECIFIC GOAL]");
    expect(body).toContain("[TARGET ROLE OR EXPLORATORY DIRECTION]");
    expect(body).toContain("[AVAILABLE TIME]");
    expect(body).toContain("[TOOLS AND ENVIRONMENT]");
  });

  it("labels demo templates and never claims a live call", () => {
    const generation = buildPromptTemplate(input(), { demo: true });

    expect(generation.isDemo).toBe(true);
    expect(generation.source).toBe("template");
    expect(generation.body).toContain("DEMO TEMPLATE");
    expect(generation.body).toContain("No AI provider was called");
  });

  it("builds bounded, unique tags", () => {
    const generation = buildPromptTemplate(input());

    expect(generation.tags.length).toBeLessThanOrEqual(8);
    expect(new Set(generation.tags).size).toBe(generation.tags.length);
    expect(generation.tags).toContain("sql");
    expect(generation.tags).toContain("careerforge");
  });
});
