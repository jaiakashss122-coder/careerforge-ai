"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAiConfig } from "@/lib/ai/config";
import { buildLearnerContext } from "@/lib/ai/context";
import { buildDemoTutorReply } from "@/lib/ai/demo";
import {
  deleteSavedPrompt,
  deleteTutorConversation,
  getTutorConversationById,
  insertSavedPrompt,
  insertTutorExchange,
  listAiUsageEvents,
  recordAiUsage,
  updateSavedPrompt,
} from "@/lib/ai/repository";
import { generateWithProvider } from "@/lib/ai/provider";
import {
  buildPromptGenerationSystemPrompt,
  buildTutorSystemPrompt,
  parseGeneratedPrompt,
} from "@/lib/ai/prompts";
import { evaluateAiQuota } from "@/lib/ai/quotas";
import { buildPromptTemplate, PROMPT_GUIDES } from "@/lib/ai/templates";
import {
  createConversationTitle,
  normalizePromptTags,
} from "@/lib/ai/text";
import {
  isPromptCategory,
  isTutorMode,
  PROMPT_BODY_MAX_LENGTH,
  PROMPT_TITLE_MAX_LENGTH,
  TUTOR_MESSAGE_MAX_LENGTH,
  TUTOR_REPLY_MAX_LENGTH,
  type AiActionResult,
  type AiFailureCode,
  type PromptBuilderInput,
} from "@/lib/ai/types";
import type {
  DeleteAiRecordResult,
  GeneratePromptInput,
  GeneratePromptResult,
  LoadTutorConversationResult,
  SavePromptInput,
  SavePromptResult,
  SendTutorMessageInput,
  SendTutorMessageResult,
} from "@/lib/ai/action-types";
import { getLatestAssessmentRecord } from "@/lib/assessment/repository";
import { getCareerTrack } from "@/lib/career/tracks";
import { getCurrentProfile } from "@/lib/profile/repository";
import {
  CAREER_STATUS_META,
  LEARNING_PREFERENCES,
  TOOLS,
} from "@/lib/profile/constants";
import { getActiveRoadmapRecord } from "@/lib/roadmap/repository";
import { getAuthenticatedContext } from "@/lib/workspace/server";

const tutorInputSchema = z.object({
  conversationId: z.string().trim().max(120).nullable().optional(),
  mode: z.string().refine(isTutorMode, "Choose a supported tutor mode."),
  message: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(TUTOR_MESSAGE_MAX_LENGTH, "Keep the message under 4,000 characters."),
  taskId: z.string().trim().max(120).nullable().optional(),
});

const promptRequestSchema = z.object({
  category: z.string().refine(isPromptCategory, "Choose a supported category."),
  goal: z.string().trim().max(500).optional().default(""),
  targetRole: z.string().trim().max(120).optional().default(""),
  timeBudget: z.string().trim().max(120).optional().default(""),
  tools: z.string().trim().max(200).optional().default(""),
  teachingStyle: z.string().trim().max(200).optional().default(""),
  deliverable: z.string().trim().max(300).optional().default(""),
  evaluationFocus: z.string().trim().max(300).optional().default(""),
  constraints: z.string().trim().max(500).optional().default(""),
});

const savePromptSchema = z.object({
  id: z.string().trim().max(120).nullable().optional(),
  title: z.string().trim().min(1).max(PROMPT_TITLE_MAX_LENGTH),
  category: z.string().refine(isPromptCategory, "Choose a supported category."),
  body: z.string().trim().min(10).max(PROMPT_BODY_MAX_LENGTH),
  tags: z.array(z.string()).max(20),
  source: z.enum(["generated", "edited", "template"]),
  isDemo: z.boolean(),
});

function fail<T>(
  code: AiFailureCode,
  message: string,
  retryable = false,
): AiActionResult<T> {
  return { ok: false, code, message, retryable };
}

function logActionFailure(label: string, error: unknown) {
  console.error(
    `${label}:`,
    error instanceof Error ? error.message : "unknown error",
  );
}

async function loadQuota() {
  const events = await listAiUsageEvents();
  return evaluateAiQuota(events);
}

export async function loadTutorConversationAction(
  id: unknown,
): Promise<LoadTutorConversationResult> {
  if (typeof id !== "string" || id.length === 0 || id.length > 120) {
    return fail("invalid_input", "That conversation id was not readable.");
  }

  const context = await getAuthenticatedContext();
  if (!context) {
    return fail(
      "not_authenticated",
      "Loading a server conversation requires a signed-in account.",
    );
  }

  try {
    const conversation = await getTutorConversationById(id);
    if (!conversation) {
      return fail(
        "invalid_input",
        "That conversation is not available on this account.",
      );
    }
    return { ok: true, data: { conversation } };
  } catch (error) {
    logActionFailure("Conversation load failed", error);
    return fail(
      "provider_error",
      "That conversation could not be loaded. Try again.",
      true,
    );
  }
}

export async function sendTutorMessageAction(
  input: SendTutorMessageInput,
): Promise<SendTutorMessageResult> {  const parsed = tutorInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "The message was not readable.",
    );
  }

  const context = await getAuthenticatedContext();
  if (!context) {
    return fail(
      "not_authenticated",
      "Server tutor conversations require a signed-in Supabase account. Preview mode uses local demo responses.",
    );
  }

  const conversationId = parsed.data.conversationId || null;
  const taskId = parsed.data.taskId || null;

  try {
    const existing = conversationId
      ? await getTutorConversationById(conversationId)
      : null;

    if (conversationId && !existing) {
      return fail(
        "invalid_input",
        "That conversation is not available on this account.",
      );
    }

    const [profile, assessment, roadmap] = await Promise.all([
      getCurrentProfile(),
      getLatestAssessmentRecord(),
      getActiveRoadmapRecord(),
    ]);

    const task =
      taskId && roadmap
        ? (roadmap.tasks.find((entry) => entry.id === taskId) ?? null)
        : null;

    if (taskId && !task) {
      return fail(
        "invalid_input",
        "That roadmap task is not in your active plan.",
      );
    }

    const learnerContext = buildLearnerContext({
      profile,
      assessment,
      task,
    });

    const config = getAiConfig();
    if (config.mode === "misconfigured") {
      return fail("not_configured", config.detail);
    }

    let quota;
    try {
      quota = await loadQuota();
    } catch {
      return fail(
        "provider_error",
        "AI usage limits could not be verified. Try again.",
        true,
      );
    }

    if (!quota.allowed) {
      return fail("quota_exceeded", quota.message);
    }

    const isDemo = config.mode === "demo";
    let reply: string;
    let model: string | null = null;

    if (isDemo) {
      reply = buildDemoTutorReply({
        mode: parsed.data.mode,
        message: parsed.data.message,
        context: learnerContext,
      });
    } else {
      const result = await generateWithProvider({
        system: buildTutorSystemPrompt({
          mode: parsed.data.mode,
          context: learnerContext,
        }),
        messages: [
          ...(existing?.messages ?? []).map((message) => ({
            role: message.role,
            content: message.content,
          })),
          { role: "user" as const, content: parsed.data.message },
        ],
        maxTokens: 1000,
      });

      if (!result.ok) {
        return fail(result.code, result.message, result.retryable);
      }

      reply = result.text;
      model = result.model;
    }

    reply = reply.trim().slice(0, TUTOR_REPLY_MAX_LENGTH);
    if (!reply) {
      return fail(
        "invalid_response",
        "The tutor returned an empty reply. Try again.",
        true,
      );
    }

    const saved = await insertTutorExchange({
      conversationId,
      mode: parsed.data.mode,
      title: existing?.title ?? createConversationTitle(parsed.data.message),
      userContent: parsed.data.message,
      assistantContent: reply,
      isDemo,
    });

    if ("error" in saved) {
      return fail("provider_error", saved.error, true);
    }

    await recordAiUsage("tutor", isDemo);
    revalidatePath("/tutor");

    return {
      ok: true,
      data: {
        conversation: saved.conversation,
        isDemo,
        model,
      },
    };
  } catch (error) {
    logActionFailure("Tutor message failed", error);
    return fail(
      "provider_error",
      "The tutor request could not be completed. Try again.",
      true,
    );
  }
}

export async function generatePromptAction(
  input: GeneratePromptInput,
): Promise<GeneratePromptResult> {
  const parsed = promptRequestSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return fail(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "The prompt request was not readable.",
    );
  }

  const context = await getAuthenticatedContext();
  if (!context) {
    return fail(
      "not_authenticated",
      "Server prompt generation requires a signed-in Supabase account. Preview mode uses local demo templates.",
    );
  }

  try {
    const [profile, assessment] = await Promise.all([
      getCurrentProfile(),
      getLatestAssessmentRecord(),
    ]);

    const weeklyHours = profile?.weeklyHours ?? 10;
    const track = getCareerTrack(profile?.targetCareerSlug);
    const tools =
      profile?.tools
        .map((value) => TOOLS.find((tool) => tool.value === value)?.label ?? value)
        .join(", ") ?? "";
    const preferences =
      profile?.learningPreferences
        .map(
          (value) =>
            LEARNING_PREFERENCES.find((entry) => entry.value === value)?.label ??
            value,
        )
        .join(", ") ?? "";

    const guide = PROMPT_GUIDES[parsed.data.category];
    const builder: PromptBuilderInput = {
      category: parsed.data.category,
      goal: parsed.data.goal || profile?.primaryGoal || guide.focus,
      targetRole:
        parsed.data.targetRole ||
        track?.name ||
        (profile?.careerStatus ? CAREER_STATUS_META[profile.careerStatus].label : "exploring options"),
      careerStatus: profile
        ? CAREER_STATUS_META[profile.careerStatus].label
        : "not specified",
      weeklyHours,
      timeBudget:
        parsed.data.timeBudget ||
        `${profile?.preferredSessionMinutes ?? 45}-minute sessions`,
      tools: parsed.data.tools || tools,
      teachingStyle: parsed.data.teachingStyle || preferences,
      deliverable: parsed.data.deliverable || guide.deliverable,
      evaluationFocus:
        parsed.data.evaluationFocus || guide.evaluation,
      constraints: parsed.data.constraints || profile?.constraints || "",
      learnerContext: buildLearnerContext({
        profile,
        assessment,
        task: null,
      }),
    };

    const config = getAiConfig();
    if (config.mode === "misconfigured") {
      return fail("not_configured", config.detail);
    }

    let quota;
    try {
      quota = await loadQuota();
    } catch {
      return fail(
        "provider_error",
        "AI usage limits could not be verified. Try again.",
        true,
      );
    }

    if (!quota.allowed) {
      return fail("quota_exceeded", quota.message);
    }

    if (config.mode === "demo") {
      const generation = buildPromptTemplate(builder, { demo: true });
      await recordAiUsage("prompt", true);
      return { ok: true, data: generation };
    }

    const result = await generateWithProvider({
      system: buildPromptGenerationSystemPrompt(builder.learnerContext),
      messages: [
        {
          role: "user",
          content: `Create a reusable prompt in the "${parsed.data.category}" category.

Objective: ${builder.goal}
Direction: ${builder.targetRole}
Career status: ${builder.careerStatus}
Available time: ${builder.timeBudget}
Weekly availability: ${builder.weeklyHours} hours
Tools and environment: ${builder.tools || "not specified"}
Preferred teaching method: ${builder.teachingStyle || "clear explanations and practice"}
Deliverable: ${builder.deliverable}
Evaluation rubric: ${builder.evaluationFocus}
Other constraints: ${builder.constraints || "none provided"}

Return only the JSON object described in the system instructions.`,
        },
      ],
      maxTokens: 1400,
    });

    if (!result.ok) {
      return fail(result.code, result.message, result.retryable);
    }

    const generation = parseGeneratedPrompt(result.text, parsed.data.category);
    if (!generation.ok) {
      return fail(
        "invalid_response",
        "The AI provider returned an unusable prompt format. Try again.",
        true,
      );
    }

    await recordAiUsage("prompt", false);
    return { ok: true, data: generation.generation };
  } catch (error) {
    logActionFailure("Prompt generation failed", error);
    return fail(
      "provider_error",
      "The prompt could not be generated. Try again.",
      true,
    );
  }
}

export async function savePromptAction(
  input: SavePromptInput,
): Promise<SavePromptResult> {
  const parsed = savePromptSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "The prompt was not readable.",
    );
  }

  const context = await getAuthenticatedContext();
  if (!context) {
    return fail(
      "not_authenticated",
      "Saving prompts requires a signed-in Supabase account. Preview mode saves prompts in this browser.",
    );
  }

  const tags = normalizePromptTags(parsed.data.tags);

  try {
    const result = parsed.data.id
      ? await updateSavedPrompt({
          id: parsed.data.id,
          title: parsed.data.title,
          category: parsed.data.category,
          body: parsed.data.body,
          tags,
          source: parsed.data.source,
        })
      : await insertSavedPrompt({
          title: parsed.data.title,
          category: parsed.data.category,
          body: parsed.data.body,
          tags,
          source: parsed.data.source,
          isDemo: parsed.data.isDemo,
        });

    if (!result.ok) {
      return fail("invalid_input", result.message);
    }

    revalidatePath("/prompts");
    return { ok: true, data: { prompt: result.prompt } };
  } catch (error) {
    logActionFailure("Prompt save failed", error);
    return fail("provider_error", "The prompt could not be saved. Try again.");
  }
}

export async function deletePromptAction(
  id: unknown,
): Promise<DeleteAiRecordResult> {
  if (typeof id !== "string" || id.length === 0 || id.length > 120) {
    return fail("invalid_input", "That prompt id was not readable.");
  }

  const context = await getAuthenticatedContext();
  if (!context) {
    return fail(
      "not_authenticated",
      "Deleting prompts requires a signed-in account.",
    );
  }

  try {
    const result = await deleteSavedPrompt(id);
    if (!result.ok) {
      return fail("invalid_input", result.message);
    }
    revalidatePath("/prompts");
    return { ok: true, data: { id } };
  } catch (error) {
    logActionFailure("Prompt delete failed", error);
    return fail("provider_error", "The prompt could not be deleted. Try again.");
  }
}

export async function deleteConversationAction(
  id: unknown,
): Promise<DeleteAiRecordResult> {
  if (typeof id !== "string" || id.length === 0 || id.length > 120) {
    return fail("invalid_input", "That conversation id was not readable.");
  }

  const context = await getAuthenticatedContext();
  if (!context) {
    return fail(
      "not_authenticated",
      "Deleting conversations requires a signed-in account.",
    );
  }

  try {
    const result = await deleteTutorConversation(id);
    if (!result.ok) {
      return fail("invalid_input", result.message);
    }
    revalidatePath("/tutor");
    return { ok: true, data: { id } };
  } catch (error) {
    logActionFailure("Conversation delete failed", error);
    return fail(
      "provider_error",
      "The conversation could not be deleted. Try again.",
    );
  }
}
