import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithProvider } from "@/lib/ai/provider";

/**
 * Every branch below is a way the live provider can fail the learner. These
 * tests drive it with a stubbed fetch rather than a real account, because the
 * thing being proven is the mapping from a transport outcome to the code, the
 * message and the retry decision the screen shows — not whether a model answers
 * well.
 */

function liveConfig() {
  vi.stubEnv("AI_API_KEY", "test-key");
  vi.stubEnv("AI_MODEL", "test-model");
  vi.stubEnv("AI_PROVIDER", "openai");
  vi.stubEnv("AI_BASE_URL", "");
}

function demoConfig() {
  vi.stubEnv("AI_API_KEY", "");
  vi.stubEnv("AI_MODEL", "");
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("AI_BASE_URL", "");
}

function reply(content: string) {
  return { choices: [{ message: { role: "assistant", content } }] };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("fetch called more times than the test allowed");
    return next;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("a provider that is not configured", () => {
  it("never opens a connection in demo mode", async () => {
    demoConfig();
    const fetchMock = stubFetch(jsonResponse(reply("should not be sent")));

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_configured");
      expect(result.message).toContain("Demo mode does not call a provider");
      expect(result.retryable).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hands back the configuration error instead of a generic one", async () => {
    liveConfig();
    vi.stubEnv("AI_MODEL", "");
    stubFetch(jsonResponse(reply("never")));

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_configured");
      expect(result.message).toContain("AI_MODEL is missing");
    }
  });
});

describe("the request this app sends", () => {
  it("posts to the configured base URL with the key kept on the server side", async () => {
    liveConfig();
    const fetchMock = stubFetch(jsonResponse(reply("Answer.")));

    const result = await generateWithProvider({
      system: "Teach, do not dump.",
      messages: [{ role: "user", content: "What is a join?" }],
    });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-key",
    );

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(false);
    expect(body.max_tokens).toBe(900);
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "Teach, do not dump.",
    });
  });

  it("respects a configured base URL and a caller-chosen token limit", async () => {
    liveConfig();
    vi.stubEnv("AI_BASE_URL", "https://gateway.example.com/v1/");
    const fetchMock = stubFetch(jsonResponse(reply("Answer.")));

    await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 240,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gateway.example.com/v1/chat/completions");
    expect(JSON.parse(init.body as string).max_tokens).toBe(240);
  });

  it("carries only the recent turns and caps each one", async () => {
    liveConfig();
    const fetchMock = stubFetch(jsonResponse(reply("Answer.")));

    await generateWithProvider({
      system: "s",
      messages: Array.from({ length: 20 }, (_, index) => ({
        role: "user" as const,
        content: index === 19 ? "x".repeat(9000) : `turn ${index}`,
      })),
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.messages).toHaveLength(13);
    expect(body.messages[1].content).toBe("turn 8");
    expect(body.messages[12].content).toBe("x".repeat(6000));
  });
});

describe("a provider that refuses", () => {
  it("reads a rate limit once and says it is retryable", async () => {
    liveConfig();
    const fetchMock = stubFetch(jsonResponse({ error: "slow down" }, 429));

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("rate_limited");
      expect(result.retryable).toBe(true);
    }
  });

  it("does not retry a rejected credential", async () => {
    liveConfig();
    const fetchMock = stubFetch(jsonResponse({ error: "bad key" }, 401));

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_error");
      expect(result.retryable).toBe(false);
    }
  });

  it("retries a server-side failure once, then reports it", async () => {
    liveConfig();
    const fetchMock = stubFetch(
      jsonResponse({ error: "overloaded" }, 503),
      jsonResponse({ error: "overloaded" }, 503),
    );

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_error");
      expect(result.retryable).toBe(true);
    }
  });

  it("keeps a successful retry as a successful answer", async () => {
    liveConfig();
    const fetchMock = stubFetch(
      jsonResponse({ error: "overloaded" }, 500),
      jsonResponse(reply("Recovered answer.")),
    );

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, text: "Recovered answer." });
  });

  it("labels a hang as a timeout after one attempt", async () => {
    liveConfig();
    const fetchMock = vi.fn(async () => {
      throw new DOMException("The operation timed out", "TimeoutError");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("timeout");
      expect(result.retryable).toBe(true);
    }
  });

  it("retries a network failure once and says the provider was unreachable", async () => {
    liveConfig();
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_error");
      expect(result.message).toContain("could not be reached");
    }
  });
});

describe("a provider that answers but cannot be trusted", () => {
  it("rejects a body that is not JSON", async () => {
    liveConfig();
    stubFetch(new Response("<html>not json</html>", { status: 200 }));

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_response");
      expect(result.message).toContain("unreadable");
    }
  });

  it.each([
    { name: "no choices at all", body: {} },
    { name: "an empty choice list", body: { choices: [] } },
    { name: "a choice with no message", body: { choices: [{}] } },
    { name: "a message with no content", body: { choices: [{ message: {} }] } },
    {
      name: "content that is not a string",
      body: { choices: [{ message: { content: 7 } }] },
    },
    { name: "only whitespace", body: reply("   \n ") },
  ])("reports $name as an empty response", async ({ body }) => {
    liveConfig();
    stubFetch(jsonResponse(body));

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_response");
      expect(result.message).toContain("empty response");
    }
  });

  it("trims and bounds what it hands to the screen", async () => {
    liveConfig();
    stubFetch(jsonResponse(reply(`  ${"y".repeat(45_000)}\n`)));

    const result = await generateWithProvider({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toHaveLength(40_000);
      expect(result.text).toBe("y".repeat(40_000));
      expect(result.model).toBe("test-model");
    }
  });
});
