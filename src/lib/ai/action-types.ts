import type {
  AiActionResult,
  PromptGeneration,
  SavedPromptRecord,
  TutorConversationRecord,
} from "@/lib/ai/types";

export type SendTutorMessageInput = {
  conversationId?: string | null;
  mode: string;
  message: string;
  taskId?: string | null;
};

export type SendTutorMessageResult = AiActionResult<{
  conversation: TutorConversationRecord;
  isDemo: boolean;
  model: string | null;
}>;

export type GeneratePromptInput = {
  category: string;
  goal?: string;
  targetRole?: string;
  timeBudget?: string;
  tools?: string;
  teachingStyle?: string;
  deliverable?: string;
  evaluationFocus?: string;
  constraints?: string;
};

export type GeneratePromptResult = AiActionResult<PromptGeneration>;

export type SavePromptInput = {
  id?: string | null;
  title: string;
  category: string;
  body: string;
  tags: string[];
  source: "generated" | "edited" | "template";
  isDemo: boolean;
};

export type SavePromptResult = AiActionResult<{ prompt: SavedPromptRecord }>;

export type DeleteAiRecordResult = AiActionResult<{ id: string }>;

export type LoadTutorConversationResult = AiActionResult<{
  conversation: TutorConversationRecord;
}>;
