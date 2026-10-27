import { describe, expect, it } from "vitest";
import { buildDemoTutorReply } from "@/lib/ai/demo";

describe("demo tutor replies", () => {
  it("labels simulated output clearly", () => {
    const reply = buildDemoTutorReply({
      mode: "debug",
      message: "Why does my groupby return duplicate rows?",
      context: "No completed assessment is available.",
    });

    expect(reply).toContain("Demo mode");
    expect(reply).toContain("not live model output");
    expect(reply).toContain("curated teaching response");
    expect(reply).toContain("groupby");
  });

  it("uses different guidance for different modes", () => {
    const debug = buildDemoTutorReply({
      mode: "debug",
      message: "An error",
      context: "",
    });
    const interview = buildDemoTutorReply({
      mode: "interview",
      message: "An error",
      context: "",
    });

    expect(debug).not.toBe(interview);
    expect(debug).toContain("Debug with evidence");
    expect(interview).toContain("three rounds");
  });

  it("states the context and capability boundaries", () => {
    const reply = buildDemoTutorReply({
      mode: "explain",
      message: "Explain joins",
      context: "LATEST SHORT ASSESSMENT — a screen, not verified mastery.",
    });

    expect(reply).toContain("screen, not verified mastery");
    expect(reply).toContain("cannot evaluate your actual answer");
    expect(reply).toContain("does not call a model");
  });
});
