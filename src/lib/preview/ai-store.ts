"use client";

import { createId } from "@/lib/id";
import {
  isPromptCategory,
  isTutorMode,
  type PromptCategoryId,
  type SavedPromptRecord,
  type TutorConversationRecord,
  type TutorMessageRecord,
  type TutorMode,
} from "@/lib/ai/types";
import { evaluateAiQuota } from "@/lib/ai/quotas";
import {
  createConversationTitle,
  normalizePromptTags,
} from "@/lib/ai/text";

const STORAGE_KEY = "careerforge:ai:v1";

export const PREVIEW_AI_UPDATED = "careerforge:preview-ai-updated";

export type PreviewAiUsageEvent = {
  feature: "tutor" | "prompt";
  isDemo: boolean;
  createdAt: string;
};

export type PreviewAiState = {
  conversations: TutorConversationRecord[];
  prompts: SavedPromptRecord[];
  usage: PreviewAiUsageEvent[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMessage(value: unknown): value is TutorMessageRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.conversationId === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    typeof value.isDemo === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function isConversation(value: unknown): value is TutorConversationRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isTutorMode(value.mode) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(isMessage)
  );
}

function isPrompt(value: unknown): value is SavedPromptRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isPromptCategory(value.category) &&
    typeof value.body === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    (value.source === "generated" ||
      value.source === "edited" ||
      value.source === "template") &&
    typeof value.isDemo === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isUsage(value: unknown): value is PreviewAiUsageEvent {
  return (
    isRecord(value) &&
    (value.feature === "tutor" || value.feature === "prompt") &&
    typeof value.isDemo === "boolean" &&
    typeof value.createdAt === "string"
  );
}

export function createEmptyAiState(): PreviewAiState {
  return { conversations: [], prompts: [], usage: [] };
}

export function parsePreviewAiState(raw: string | null): PreviewAiState {
  if (!raw) return createEmptyAiState();

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return createEmptyAiState();
  }

  if (!isRecord(value)) return createEmptyAiState();

  return {
    conversations: Array.isArray(value.conversations)
      ? value.conversations.filter(isConversation)
      : [],
    prompts: Array.isArray(value.prompts)
      ? value.prompts.filter(isPrompt)
      : [],
    usage: Array.isArray(value.usage) ? value.usage.filter(isUsage) : [],
  };
}

export function getPreviewAiSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function subscribeToPreviewAi(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(PREVIEW_AI_UPDATED, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(PREVIEW_AI_UPDATED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function loadPreviewAiState(): PreviewAiState {
  return parsePreviewAiState(getPreviewAiSnapshot());
}

export function savePreviewAiState(state: PreviewAiState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, ...state }),
  );
  window.dispatchEvent(new Event(PREVIEW_AI_UPDATED));
}

export function clearPreviewAiState() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(PREVIEW_AI_UPDATED));
}

export function checkPreviewAiQuota(now: Date = new Date()) {
  return evaluateAiQuota(loadPreviewAiState().usage, now);
}

export function recordPreviewAiUsage(
  feature: "tutor" | "prompt",
  isDemo: boolean,
) {
  const state = loadPreviewAiState();
  savePreviewAiState({
    ...state,
    usage: [
      ...state.usage,
      { feature, isDemo, createdAt: new Date().toISOString() },
    ],
  });
}

export function sendPreviewTutorMessage(input: {
  conversationId: string | null;
  mode: TutorMode;
  content: string;
  reply: string;
  isDemo: boolean;
}):
  | { ok: true; conversation: TutorConversationRecord }
  | { ok: false; message: string } {
  const state = loadPreviewAiState();
  const now = new Date().toISOString();
  const existing = input.conversationId
    ? state.conversations.find(
        (conversation) => conversation.id === input.conversationId,
      )
    : null;

  if (input.conversationId && !existing) {
    return { ok: false, message: "That conversation is not available." };
  }

  const conversationId = existing?.id ?? createId();
  const userMessage: TutorMessageRecord = {
    id: createId(),
    conversationId,
    role: "user",
    content: input.content,
    isDemo: input.isDemo,
    createdAt: now,
  };
  const assistantMessage: TutorMessageRecord = {
    id: createId(),
    conversationId,
    role: "assistant",
    content: input.reply,
    isDemo: input.isDemo,
    createdAt: new Date(Date.now() + 1).toISOString(),
  };

  const conversation: TutorConversationRecord = existing
    ? {
        ...existing,
        mode: input.mode,
        updatedAt: now,
        messages: [...existing.messages, userMessage, assistantMessage],
      }
    : {
        id: conversationId,
        title: createConversationTitle(input.content),
        mode: input.mode,
        createdAt: now,
        updatedAt: now,
        messages: [userMessage, assistantMessage],
      };

  savePreviewAiState({
    ...state,
    conversations: [
      conversation,
      ...state.conversations.filter(
        (entry) => entry.id !== conversation.id,
      ),
    ],
  });

  return { ok: true, conversation };
}

export function deletePreviewConversation(conversationId: string) {
  const state = loadPreviewAiState();
  savePreviewAiState({
    ...state,
    conversations: state.conversations.filter(
      (conversation) => conversation.id !== conversationId,
    ),
  });
}

export function savePreviewPrompt(input: {
  id: string | null;
  title: string;
  category: PromptCategoryId;
  body: string;
  tags: string[];
  source: SavedPromptRecord["source"];
  isDemo: boolean;
}):
  | { ok: true; prompt: SavedPromptRecord }
  | { ok: false; message: string } {
  const state = loadPreviewAiState();
  const now = new Date().toISOString();
  const tags = normalizePromptTags(input.tags);

  if (input.id) {
    const existing = state.prompts.find((prompt) => prompt.id === input.id);
    if (!existing) {
      return { ok: false, message: "That saved prompt is not available." };
    }

    const prompt: SavedPromptRecord = {
      ...existing,
      title: input.title,
      category: input.category,
      body: input.body,
      tags,
      source: input.source,
      isDemo: input.isDemo,
      updatedAt: now,
    };
    savePreviewAiState({
      ...state,
      prompts: [
        prompt,
        ...state.prompts.filter((entry) => entry.id !== prompt.id),
      ],
    });
    return { ok: true, prompt };
  }

  const prompt: SavedPromptRecord = {
    id: createId(),
    title: input.title,
    category: input.category,
    body: input.body,
    tags,
    source: input.source,
    isDemo: input.isDemo,
    createdAt: now,
    updatedAt: now,
  };
  savePreviewAiState({
    ...state,
    prompts: [prompt, ...state.prompts],
  });
  return { ok: true, prompt };
}

export function deletePreviewPrompt(id: string) {
  const state = loadPreviewAiState();
  savePreviewAiState({
    ...state,
    prompts: state.prompts.filter((prompt) => prompt.id !== id),
  });
}
