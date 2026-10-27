import { createId } from "@/lib/id";
import {
  isPromptCategory,
  isTutorMode,
  type PromptCategoryId,
  type SavedPromptRecord,
  type TutorConversationRecord,
  type TutorConversationSummary,
  type TutorMessageRecord,
  type TutorMode,
} from "@/lib/ai/types";
import { AI_QUOTA_DAY_MS } from "@/lib/ai/quotas";
import type {
  SavedPromptRow,
  TutorConversationRow,
  TutorMessageRow,
} from "@/lib/supabase/database.types";
import { getAuthenticatedContext } from "@/lib/workspace/server";

const PROMPT_SOURCES = new Set(["generated", "edited", "template"]);

function asMode(value: string): TutorMode {
  return isTutorMode(value) ? value : "explain";
}

function asCategory(value: string): PromptCategoryId {
  return isPromptCategory(value) ? value : "learning-plan";
}

function asSource(value: string): SavedPromptRecord["source"] {
  return PROMPT_SOURCES.has(value)
    ? (value as SavedPromptRecord["source"])
    : "template";
}

function messageRowToRecord(row: TutorMessageRow): TutorMessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    isDemo: row.is_demo === true,
    createdAt: row.created_at,
  };
}

function conversationRowToRecord(
  row: TutorConversationRow,
  messages: TutorMessageRecord[],
): TutorConversationRecord {
  return {
    id: row.id,
    title: row.title,
    mode: asMode(row.mode),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages,
  };
}

function promptRowToRecord(row: SavedPromptRow): SavedPromptRecord {
  return {
    id: row.id,
    title: row.title,
    category: asCategory(row.category),
    body: row.body,
    tags: row.tags.filter((tag): tag is string => typeof tag === "string"),
    source: asSource(row.source),
    isDemo: row.is_demo === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTutorConversations(): Promise<
  TutorConversationSummary[]
> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("tutor_conversations")
    .select("*")
    .eq("user_id", context.userId)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Tutor conversation lookup failed:", error.code);
    throw new Error("Your tutor conversations could not be loaded.");
  }

  const conversations = data ?? [];
  if (conversations.length === 0) return [];

  const { data: messages, error: messagesError } = await context.supabase
    .from("tutor_messages")
    .select("conversation_id")
    .in(
      "conversation_id",
      conversations.map((conversation) => conversation.id),
    );

  if (messagesError) {
    console.error("Tutor message count failed:", messagesError.code);
    throw new Error("Your tutor conversations could not be loaded.");
  }

  const counts = new Map<string, number>();
  for (const message of messages ?? []) {
    counts.set(
      message.conversation_id,
      (counts.get(message.conversation_id) ?? 0) + 1,
    );
  }

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    mode: asMode(conversation.mode),
    updatedAt: conversation.updated_at,
    messageCount: counts.get(conversation.id) ?? 0,
  }));
}

export async function getTutorConversationById(
  conversationId: string,
): Promise<TutorConversationRecord | null> {  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("tutor_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) {
    console.error("Tutor conversation lookup failed:", error.code);
    throw new Error("That tutor conversation could not be loaded.");
  }
  if (!data) return null;

  const { data: messages, error: messageError } = await context.supabase
    .from("tutor_messages")
    .select("*")
    .eq("conversation_id", data.id)
    .order("created_at", { ascending: true })
    .limit(100);

  if (messageError) {
    console.error("Tutor message lookup failed:", messageError.code);
    throw new Error("That tutor conversation could not be loaded.");
  }

  return conversationRowToRecord(
    data,
    (messages ?? [])
      .filter(
        (message) => message.role === "user" || message.role === "assistant",
      )
      .map(messageRowToRecord),
  );
}

export async function listTutorConversationRecords(): Promise<
  TutorConversationRecord[]
> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data: conversations, error } = await context.supabase
    .from("tutor_conversations")
    .select("*")
    .eq("user_id", context.userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Tutor conversation export failed:", error.code);
    throw new Error("Your tutor conversations could not be exported.");
  }
  if (!conversations || conversations.length === 0) return [];

  const { data: messages, error: messageError } = await context.supabase
    .from("tutor_messages")
    .select("*")
    .in(
      "conversation_id",
      conversations.map((conversation) => conversation.id),
    )
    .order("created_at", { ascending: true })
    .limit(2000);

  if (messageError) {
    console.error("Tutor message export failed:", messageError.code);
    throw new Error("Your tutor conversations could not be exported.");
  }

  const byConversation = new Map<string, TutorMessageRecord[]>();
  for (const message of messages ?? []) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const list = byConversation.get(message.conversation_id) ?? [];
    list.push(messageRowToRecord(message));
    byConversation.set(message.conversation_id, list);
  }

  return conversations.map((conversation) =>
    conversationRowToRecord(
      conversation,
      byConversation.get(conversation.id) ?? [],
    ),
  );
}

export async function insertTutorExchange(input: {
  conversationId: string | null;
  mode: TutorMode;
  title: string;
  userContent: string;
  assistantContent: string;
  isDemo: boolean;
}): Promise<{ conversation: TutorConversationRecord } | { error: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { error: "Saving a tutor conversation requires a signed-in account." };
  }

  const conversationId = input.conversationId ?? createId();
  let title = input.title;
  let createdAt = new Date().toISOString();

  if (input.conversationId) {
    const { data: existing, error: existingError } = await context.supabase
      .from("tutor_conversations")
      .select("id,title,created_at")
      .eq("id", input.conversationId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existingError) {
      console.error("Tutor conversation ownership check failed:", existingError.code);
      return { error: "That tutor conversation is not available on this account." };
    }
    if (!existing) {
      return { error: "That tutor conversation is not available on this account." };
    }
    title = existing.title;
    createdAt = existing.created_at;
  } else {
    const { error: conversationError } = await context.supabase
      .from("tutor_conversations")
      .insert({
        id: conversationId,
        user_id: context.userId,
        title,
        mode: input.mode,
      });

    if (conversationError) {
      console.error("Tutor conversation insert failed:", conversationError.code);
      return { error: "The conversation could not be started." };
    }
  }

  const now = new Date().toISOString();
  const { data: messageRows, error: messageError } = await context.supabase
    .from("tutor_messages")
    .insert([
      {
        id: createId(),
        conversation_id: conversationId,
        role: "user",
        content: input.userContent,
        is_demo: input.isDemo,
        created_at: now,
      },
      {
        id: createId(),
        conversation_id: conversationId,
        role: "assistant",
        content: input.assistantContent,
        is_demo: input.isDemo,
        created_at: new Date(Date.now() + 1).toISOString(),
      },
    ])
    .select("*");

  if (messageError || !messageRows) {
    console.error("Tutor message insert failed:", messageError?.code);
    if (!input.conversationId) {
      await context.supabase
        .from("tutor_conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", context.userId);
    }
    return { error: "The reply could not be saved. Try again." };
  }

  const { error: updateError } = await context.supabase
    .from("tutor_conversations")
    .update({
      updated_at: new Date().toISOString(),
      title,
      mode: input.mode,
    })
    .eq("id", conversationId)
    .eq("user_id", context.userId);

  if (updateError) {
    console.error("Tutor conversation update failed:", updateError.code);
  }

  return {
    conversation: {
      id: conversationId,
      title,
      mode: input.mode,
      createdAt,
      updatedAt: now,
      messages: messageRows.map(messageRowToRecord),
    },
  };
}

export async function deleteTutorConversation(conversationId: string) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false as const, message: "Sign in to delete conversations." };
  }

  const { error } = await context.supabase
    .from("tutor_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", context.userId);

  if (error) {
    console.error("Tutor conversation delete failed:", error.code);
    return { ok: false as const, message: "The conversation could not be deleted." };
  }

  return { ok: true as const };
}

export async function listSavedPrompts(): Promise<SavedPromptRecord[]> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("saved_prompts")
    .select("*")
    .eq("user_id", context.userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Saved prompt lookup failed:", error.code);
    throw new Error("Your saved prompts could not be loaded.");
  }

  return (data ?? []).map(promptRowToRecord);
}

export async function getSavedPromptById(id: string) {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("saved_prompts")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) {
    console.error("Saved prompt lookup failed:", error.code);
    throw new Error("That saved prompt could not be loaded.");
  }

  return data ? promptRowToRecord(data) : null;
}

export async function insertSavedPrompt(input: {
  title: string;
  category: PromptCategoryId;
  body: string;
  tags: string[];
  source: SavedPromptRecord["source"];
  isDemo: boolean;
}) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false as const, message: "Sign in to save prompts." };
  }

  const { data, error } = await context.supabase
    .from("saved_prompts")
    .insert({
      user_id: context.userId,
      title: input.title,
      category: input.category,
      body: input.body,
      tags: input.tags,
      source: input.source,
      is_demo: input.isDemo,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Saved prompt insert failed:", error?.code);
    return { ok: false as const, message: "The prompt could not be saved." };
  }

  return { ok: true as const, prompt: promptRowToRecord(data) };
}

export async function updateSavedPrompt(input: {
  id: string;
  title: string;
  category: PromptCategoryId;
  body: string;
  tags: string[];
  source: SavedPromptRecord["source"];
}) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false as const, message: "Sign in to update prompts." };
  }

  const { data, error } = await context.supabase
    .from("saved_prompts")
    .update({
      title: input.title,
      category: input.category,
      body: input.body,
      tags: input.tags,
      source: input.source,
    })
    .eq("id", input.id)
    .eq("user_id", context.userId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Saved prompt update failed:", error.code);
    return { ok: false as const, message: "The prompt could not be updated." };
  }
  if (!data) {
    return { ok: false as const, message: "That prompt is not available on this account." };
  }

  return { ok: true as const, prompt: promptRowToRecord(data) };
}

export async function deleteSavedPrompt(id: string) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false as const, message: "Sign in to delete prompts." };
  }

  const { error } = await context.supabase
    .from("saved_prompts")
    .delete()
    .eq("id", id)
    .eq("user_id", context.userId);

  if (error) {
    console.error("Saved prompt delete failed:", error.code);
    return { ok: false as const, message: "The prompt could not be deleted." };
  }

  return { ok: true as const };
}

export async function listAiUsageEvents() {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("ai_usage_events")
    .select("created_at")
    .eq("user_id", context.userId)
    .gte("created_at", new Date(Date.now() - AI_QUOTA_DAY_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("AI usage lookup failed:", error.code);
    throw new Error("AI usage limits could not be verified.");
  }

  return (data ?? []).map((event) => ({ createdAt: event.created_at }));
}

export async function recordAiUsage(feature: "tutor" | "prompt", isDemo: boolean) {
  const context = await getAuthenticatedContext();
  if (!context) return;

  const { error } = await context.supabase.from("ai_usage_events").insert({
    user_id: context.userId,
    feature,
    is_demo: isDemo,
  });

  if (error) {
    console.error("AI usage record failed:", error.code);
  }
}
