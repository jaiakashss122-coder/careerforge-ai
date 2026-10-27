import { describe, expect, it } from "vitest";
import {
  AI_QUOTA_DAY_LIMIT,
  AI_QUOTA_WINDOW_LIMIT,
  evaluateAiQuota,
} from "@/lib/ai/quotas";

const NOW = new Date("2026-11-02T12:00:00.000Z");

function event(minutesAgo: number) {
  return {
    createdAt: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
  };
}

describe("AI quota evaluation", () => {
  it("allows requests below both limits", () => {
    const result = evaluateAiQuota([event(1), event(2)], NOW);

    expect(result.allowed).toBe(true);
    expect(result.windowRemaining).toBe(AI_QUOTA_WINDOW_LIMIT - 2);
  });

  it("blocks the eleventh request inside ten minutes", () => {
    const events = Array.from({ length: 9 }, (_, index) =>
      event(index + 1),
    );
    expect(evaluateAiQuota(events, NOW).allowed).toBe(true);

    const result = evaluateAiQuota([...events, event(0)], NOW);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toContain("10 requests");
      expect(new Date(result.retryAt).getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it("ignores requests outside the rolling window", () => {
    const events = Array.from({ length: 10 }, (_, index) =>
      event(11 + index),
    );

    expect(evaluateAiQuota(events, NOW).allowed).toBe(true);
  });

  it("enforces the daily limit independently of the short window", () => {
    const events = Array.from({ length: AI_QUOTA_DAY_LIMIT }, (_, index) =>
      event(30 + index * 10),
    );
    const result = evaluateAiQuota(events, NOW);

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toContain("daily");
    }
  });

  it("ignores invalid and future timestamps", () => {
    const result = evaluateAiQuota(
      [
        { createdAt: "not-a-date" },
        { createdAt: "2027-01-01T00:00:00.000Z" },
      ],
      NOW,
    );

    expect(result.allowed).toBe(true);
    expect(result.windowRemaining).toBe(AI_QUOTA_WINDOW_LIMIT);
  });
});
