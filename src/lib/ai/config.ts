import type { PublicAiStatus } from "@/lib/ai/types";

export type AiConfig =
  | {
      mode: "live";
      provider: "openai" | "openai-compatible";
      model: string;
      apiKey: string;
      baseUrl: string;
    }
  | {
      mode: "demo" | "misconfigured";
      provider: string | null;
      model: string | null;
      detail: string;
    };

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function readBaseUrl(raw: string | undefined):
  | { ok: true; value: string }
  | { ok: false } {
  const value = (raw?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false };
    }
  } catch {
    return { ok: false };
  }

  return { ok: true, value };
}

export function getAiConfig(): AiConfig {
  const apiKey = process.env.AI_API_KEY?.trim() ?? "";
  const providerRaw = process.env.AI_PROVIDER?.trim().toLowerCase() ?? "";
  const model = process.env.AI_MODEL?.trim() ?? "";

  if (!apiKey) {
    return {
      mode: "demo",
      provider: null,
      model: null,
      detail:
        "No AI_API_KEY is configured. Tutor and Prompt Studio use clearly labeled curated demo responses, not live model output.",
    };
  }

  const provider = providerRaw || "openai";

  if (provider !== "openai" && provider !== "openai-compatible") {
    return {
      mode: "misconfigured",
      provider,
      model: model || null,
      detail:
        "AI_PROVIDER must be openai or openai-compatible for the configured server adapter. Remove AI_API_KEY to use demo mode.",
    };
  }

  if (!model) {
    return {
      mode: "misconfigured",
      provider,
      model: null,
      detail:
        "AI_API_KEY is set, but AI_MODEL is missing. Set AI_MODEL or remove AI_API_KEY to use demo mode.",
    };
  }

  const baseUrl = readBaseUrl(process.env.AI_BASE_URL);

  if (!baseUrl.ok) {
    return {
      mode: "misconfigured",
      provider,
      model,
      detail:
        "AI_BASE_URL is not a valid http(s) URL. Remove AI_API_KEY to use demo mode.",
    };
  }

  return {
    mode: "live",
    provider,
    model,
    apiKey,
    baseUrl: baseUrl.value,
  };
}

export function getAiPublicStatus(): PublicAiStatus {
  const config = getAiConfig();

  if (config.mode === "live") {
    return {
      mode: "live",
      provider: config.provider,
      model: config.model,
      detail:
        "Live AI is configured on the server. Provider credentials never reach the browser.",
    };
  }

  return {
    mode: config.mode,
    provider: config.provider,
    model: config.model,
    detail: config.detail,
  };
}
