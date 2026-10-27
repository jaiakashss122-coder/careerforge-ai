import {
  PROMPT_TAG_MAX_LENGTH,
  PROMPT_TAGS_MAX,
} from "@/lib/ai/types";

export function createConversationTitle(message: string) {
  const normalized = message.trim().replace(/\s+/g, " ");
  if (!normalized) return "New conversation";
  const title =
    normalized.length > 64 ? `${normalized.slice(0, 61)}...` : normalized;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function normalizePromptTags(values: readonly string[]) {
  return Array.from(
    new Set(
      values
        .map((tag) =>
          tag
            .trim()
            .toLowerCase()
            .replace(/^#/, "")
            .replace(/\s+/g, "-")
            .slice(0, PROMPT_TAG_MAX_LENGTH),
        )
        .filter(Boolean),
    ),
  ).slice(0, PROMPT_TAGS_MAX);
}

export function parseTagInput(value: string) {
  return normalizePromptTags(value.split(","));
}
