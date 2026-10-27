import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkPreviewAiQuota,
  deletePreviewConversation,
  deletePreviewPrompt,
  loadPreviewAiState,
  parsePreviewAiState,
  recordPreviewAiUsage,
  savePreviewAiState,
  savePreviewPrompt,
  sendPreviewTutorMessage,
} from "@/lib/preview/ai-store";
import { MemoryStorage } from "@/lib/test-support/fixtures";

function setup() {
  vi.stubGlobal("window", {
    localStorage: new MemoryStorage(),
    dispatchEvent: vi.fn(),
  });
  savePreviewAiState({
    conversations: [],
    prompts: [],
    usage: [],
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T09:00:00.000Z"));
  setup();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("preview AI state parsing", () => {
  it("returns empty state for missing or corrupt data", () => {
    expect(parsePreviewAiState(null)).toEqual({
      conversations: [],
      prompts: [],
      usage: [],
    });
    expect(parsePreviewAiState("{")).toEqual({
      conversations: [],
      prompts: [],
      usage: [],
    });
  });

  it("drops malformed records while keeping valid ones", () => {
    const sent = sendPreviewTutorMessage({
      conversationId: null,
      mode: "explain",
      content: "Explain joins",
      reply: "Demo reply",
      isDemo: true,
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;

    const saved = savePreviewPrompt({
      id: null,
      title: "SQL prompt",
      category: "sql",
      body: "Body",
      tags: ["sql"],
      source: "template",
      isDemo: false,
    });
    expect(saved.ok).toBe(true);

    const parsed = parsePreviewAiState(
      JSON.stringify({
        conversations: [
          { id: "broken" },
          ...loadPreviewAiState().conversations,
        ],
        prompts: [{ id: "broken" }, ...loadPreviewAiState().prompts],
        usage: [{ feature: "invalid" }],
      }),
    );

    expect(parsed.conversations).toHaveLength(1);
    expect(parsed.prompts).toHaveLength(1);
    expect(parsed.usage).toHaveLength(0);
  });
});

describe("preview tutor conversations", () => {
  it("creates a conversation with both messages and a derived title", () => {
    const result = sendPreviewTutorMessage({
      conversationId: null,
      mode: "debug",
      content: "  Why does my groupby return duplicate rows?  ",
      reply: "Demo reply",
      isDemo: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.conversation.title).toBe(
      "Why does my groupby return duplicate rows?",
    );
    expect(result.conversation.messages).toHaveLength(2);
    expect(result.conversation.messages[0].role).toBe("user");
    expect(result.conversation.messages[1].role).toBe("assistant");
    expect(result.conversation.messages[1].isDemo).toBe(true);
    expect(loadPreviewAiState().conversations).toHaveLength(1);
  });

  it("appends to an existing conversation and deletes it", () => {
    const first = sendPreviewTutorMessage({
      conversationId: null,
      mode: "explain",
      content: "First",
      reply: "Reply one",
      isDemo: true,
    });
    if (!first.ok) throw new Error("setup failed");

    const second = sendPreviewTutorMessage({
      conversationId: first.conversation.id,
      mode: "hint",
      content: "Second",
      reply: "Reply two",
      isDemo: true,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.conversation.messages).toHaveLength(4);
    expect(second.conversation.title).toBe("First");

    deletePreviewConversation(first.conversation.id);
    expect(loadPreviewAiState().conversations).toHaveLength(0);
  });

  it("refuses a missing conversation id", () => {
    const result = sendPreviewTutorMessage({
      conversationId: "missing",
      mode: "explain",
      content: "Hello",
      reply: "Hi",
      isDemo: true,
    });

    expect(result.ok).toBe(false);
  });
});

describe("preview prompts", () => {
  it("creates, updates, and deletes a saved prompt", () => {
    const created = savePreviewPrompt({
      id: null,
      title: "Initial",
      category: "sql",
      body: "Body",
      tags: [" SQL ", "careerforge"],
      source: "template",
      isDemo: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.prompt.tags).toEqual(["sql", "careerforge"]);

    const updated = savePreviewPrompt({
      id: created.prompt.id,
      title: "Edited",
      category: "python",
      body: "New body",
      tags: ["python"],
      source: "edited",
      isDemo: false,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.prompt.title).toBe("Edited");
    expect(updated.prompt.category).toBe("python");
    expect(updated.prompt.createdAt).toBe(created.prompt.createdAt);

    deletePreviewPrompt(created.prompt.id);
    expect(loadPreviewAiState().prompts).toHaveLength(0);
  });
});

describe("preview AI quotas", () => {
  it("records usage and blocks after the short-term limit", () => {
    for (let index = 0; index < 9; index += 1) {
      recordPreviewAiUsage("tutor", true);
    }
    expect(checkPreviewAiQuota().allowed).toBe(true);

    recordPreviewAiUsage("tutor", true);
    const blocked = checkPreviewAiQuota();
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.message).toContain("short-term");
    }
  });
});
