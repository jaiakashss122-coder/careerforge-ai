import { afterEach, describe, expect, it, vi } from "vitest";
import { getAiConfig, getAiPublicStatus } from "@/lib/ai/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AI runtime configuration", () => {
  it("uses demo mode when no provider key exists", () => {
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("AI_MODEL", "");
    vi.stubEnv("AI_PROVIDER", "");

    const config = getAiConfig();
    expect(config.mode).toBe("demo");
    if (config.mode === "demo") {
      expect(config.detail).toContain("No AI_API_KEY");
    }
  });

  it("uses live mode only when key, model, provider, and base URL are valid", () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubEnv("AI_PROVIDER", "openai");

    const config = getAiConfig();
    expect(config).toMatchObject({
      mode: "live",
      provider: "openai",
      model: "test-model",
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
    });
  });

  it("fails explicitly when a key is set without a model", () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "");
    vi.stubEnv("AI_PROVIDER", "openai");

    expect(getAiConfig().mode).toBe("misconfigured");
  });

  it("fails explicitly for unsupported providers and invalid base URLs", () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubEnv("AI_PROVIDER", "some-other-provider");

    expect(getAiConfig().mode).toBe("misconfigured");

    vi.stubEnv("AI_PROVIDER", "openai-compatible");
    vi.stubEnv("AI_BASE_URL", "javascript:alert(1)");
    expect(getAiConfig().mode).toBe("misconfigured");
  });

  it("never exposes the key or base URL in the public status", () => {
    vi.stubEnv("AI_API_KEY", "super-secret-key");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("AI_BASE_URL", "https://internal.example/v1");

    const serialized = JSON.stringify(getAiPublicStatus());
    expect(serialized).not.toContain("super-secret-key");
    expect(serialized).not.toContain("internal.example");
  });
});
