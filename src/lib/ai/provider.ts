import { getAiConfig } from "@/lib/ai/config";
import type { AiFailureCode } from "@/lib/ai/types";

export type ProviderMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ProviderResult =
  | { ok: true; text: string; model: string }
  | {
      ok: false;
      code: AiFailureCode;
      message: string;
      retryable: boolean;
    };

const AI_TIMEOUT_MS = 20_000;
const MAX_PROVIDER_OUTPUT = 40_000;

function failure(
  code: AiFailureCode,
  message: string,
  retryable = false,
): ProviderResult {
  return { ok: false, code, message, retryable };
}

function extractText(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const choices = (value as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const first = choices[0];
  if (!first || typeof first !== "object") return null;
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") return null;

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

async function requestCompletion(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  messages: ProviderMessage[];
  maxTokens: number;
}) {
  const response = await fetch(`${input.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.4,
      max_tokens: input.maxTokens,
      stream: false,
      messages: [
        { role: "system", content: input.system },
        ...input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });

  return response;
}

export async function generateWithProvider(input: {
  system: string;
  messages: ProviderMessage[];
  maxTokens?: number;
}): Promise<ProviderResult> {
  const config = getAiConfig();

  if (config.mode !== "live") {
    return failure(
      "not_configured",
      config.mode === "misconfigured"
        ? config.detail
        : "No live AI provider is configured. Demo mode does not call a provider.",
    );
  }

  const messages = input.messages
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 6000),
    }));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await requestCompletion({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        system: input.system,
        messages,
        maxTokens: input.maxTokens ?? 900,
      });

      if (!response.ok) {
        const requestId = response.headers.get("x-request-id");
        console.error(
          "AI provider request failed:",
          response.status,
          requestId ? `request ${requestId}` : "no request id",
        );

        if (response.status === 429) {
          return failure(
            "rate_limited",
            "The AI provider is rate limiting requests. Try again shortly.",
            true,
          );
        }

        if (response.status >= 500 && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          continue;
        }

        return failure(
          "provider_error",
          "The AI provider could not complete the request. Try again.",
          response.status >= 500,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return failure(
          "invalid_response",
          "The AI provider returned an unreadable response. Try again.",
          true,
        );
      }

      const text = extractText(payload);
      if (!text || text.trim().length === 0) {
        return failure(
          "invalid_response",
          "The AI provider returned an empty response. Try again.",
          true,
        );
      }

      return {
        ok: true,
        text: text.trim().slice(0, MAX_PROVIDER_OUTPUT),
        model: config.model,
      };
    } catch (error) {
      const isTimeout =
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError");

      if (isTimeout) {
        return failure(
          "timeout",
          "The AI provider took too long to respond. Try again.",
          true,
        );
      }

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }

      console.error(
        "AI provider network failure:",
        error instanceof Error ? error.name : "unknown",
      );
      return failure(
        "provider_error",
        "The AI provider could not be reached. Try again.",
        true,
      );
    }
  }

  return failure(
    "provider_error",
    "The AI provider could not complete the request. Try again.",
    true,
  );
}
