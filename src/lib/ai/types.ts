export const TUTOR_MODES = [
  {
    id: "explain",
    label: "Beginner explanation",
    description: "Plain-language explanation with a concrete analogy.",
  },
  {
    id: "step-by-step",
    label: "Step-by-step teaching",
    description: "Break the idea into ordered steps you can follow.",
  },
  {
    id: "example",
    label: "Real-world example",
    description: "Connect the concept to a realistic data task.",
  },
  {
    id: "socratic",
    label: "Socratic questioning",
    description: "Learn through guided questions instead of a lecture.",
  },
  {
    id: "hint",
    label: "Hint only",
    description: "Nudges without giving away the full answer.",
  },
  {
    id: "debug",
    label: "Debug my code",
    description: "Trace an error systematically and find the cause.",
  },
  {
    id: "review",
    label: "Senior code review",
    description: "Review correctness, clarity, testing, and trade-offs.",
  },
  {
    id: "practice",
    label: "Practice questions",
    description: "Generate exercises with checkable acceptance criteria.",
  },
  {
    id: "diagnose",
    label: "Diagnose a mistake",
    description: "Separate a content gap from a careless error.",
  },
  {
    id: "revision",
    label: "Revision plan",
    description: "Review previously learned material without cramming.",
  },
  {
    id: "interview",
    label: "Interview practice",
    description: "Role-specific questions with feedback criteria.",
  },
] as const;

export type TutorMode = (typeof TUTOR_MODES)[number]["id"];

export function isTutorMode(value: unknown): value is TutorMode {
  return (
    typeof value === "string" &&
    TUTOR_MODES.some((mode) => mode.id === value)
  );
}

export function getTutorMode(value: string | null | undefined) {
  return TUTOR_MODES.find((mode) => mode.id === value) ?? TUTOR_MODES[0];
}

export const PROMPT_CATEGORIES = [
  {
    id: "learning-plan",
    label: "Learning plan",
    description: "Turn a broad goal into a sequenced study plan.",
  },
  {
    id: "python",
    label: "Python practice",
    description: "Exercises for functions, collections, debugging, and problem solving.",
  },
  {
    id: "sql",
    label: "SQL practice",
    description: "Filtering, aggregation, joins, subqueries, and query design.",
  },
  {
    id: "statistics",
    label: "Statistics and probability",
    description: "Descriptive statistics, distributions, uncertainty, and interpretation.",
  },
  {
    id: "machine-learning",
    label: "Machine learning",
    description: "Problem framing, baselines, evaluation, and responsible modelling.",
  },
  {
    id: "ai-applications",
    label: "AI application design",
    description: "Design a model-backed feature with evaluation and failure handling.",
  },
  {
    id: "data-portfolio",
    label: "Data portfolio",
    description: "Scope an honest portfolio project with reproducible evidence.",
  },
  {
    id: "resume",
    label: "Resume and profile",
    description: "Improve evidence-based descriptions without inventing experience.",
  },
  {
    id: "job-description",
    label: "Job description analysis",
    description: "Compare a real posting with your current, proven skills.",
  },
  {
    id: "interview",
    label: "Interview preparation",
    description: "Practice role-specific questions and structured answers.",
  },
  {
    id: "code-review",
    label: "Code review",
    description: "Get feedback on correctness, readability, and tests.",
  },
  {
    id: "debugging",
    label: "Debugging",
    description: "Investigate an error with a reproducible debugging process.",
  },
  {
    id: "study-schedule",
    label: "Study schedule",
    description: "Fit realistic sessions around your available hours.",
  },
  {
    id: "career-exploration",
    label: "Career exploration",
    description: "Design a small experiment to test a career direction.",
  },
  {
    id: "emerging-technology",
    label: "Emerging technology",
    description: "Build a learning plan for a new tool or research area.",
  },
  {
    id: "project-scoping",
    label: "Project scoping",
    description: "Define a small deliverable, boundaries, and acceptance criteria.",
  },
] as const;

export type PromptCategoryId = (typeof PROMPT_CATEGORIES)[number]["id"];

export function isPromptCategory(
  value: unknown,
): value is PromptCategoryId {
  return (
    typeof value === "string" &&
    PROMPT_CATEGORIES.some((category) => category.id === value)
  );
}

export function getPromptCategory(value: string | null | undefined) {
  return (
    PROMPT_CATEGORIES.find((category) => category.id === value) ??
    PROMPT_CATEGORIES[0]
  );
}

export const TUTOR_MESSAGE_MAX_LENGTH = 4000;
export const TUTOR_REPLY_MAX_LENGTH = 12000;
export const PROMPT_TITLE_MAX_LENGTH = 120;
export const PROMPT_BODY_MAX_LENGTH = 20000;
export const PROMPT_TAGS_MAX = 8;
export const PROMPT_TAG_MAX_LENGTH = 24;
export const MAX_CONTEXT_LENGTH = 4000;

export type AiRuntimeMode = "live" | "demo" | "misconfigured";

export type PublicAiStatus = {
  mode: AiRuntimeMode;
  provider: string | null;
  model: string | null;
  detail: string;
};

export type TutorMessageRecord = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  isDemo: boolean;
  createdAt: string;
};

export type TutorConversationRecord = {
  id: string;
  title: string;
  mode: TutorMode;
  createdAt: string;
  updatedAt: string;
  messages: TutorMessageRecord[];
};

export type TutorConversationSummary = {
  id: string;
  title: string;
  mode: TutorMode;
  updatedAt: string;
  messageCount: number;
};

export type SavedPromptRecord = {
  id: string;
  title: string;
  category: PromptCategoryId;
  body: string;
  tags: string[];
  source: "generated" | "edited" | "template";
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromptBuilderInput = {
  category: PromptCategoryId;
  goal: string;
  targetRole: string;
  careerStatus: string;
  weeklyHours: number;
  timeBudget: string;
  tools: string;
  teachingStyle: string;
  deliverable: string;
  evaluationFocus: string;
  constraints: string;
  learnerContext: string;
};

export type PromptGeneration = {
  title: string;
  body: string;
  tags: string[];
  category: PromptCategoryId;
  isDemo: boolean;
  source: "generated" | "template";
};

export type AiFailureCode =
  | "not_authenticated"
  | "invalid_input"
  | "quota_exceeded"
  | "not_configured"
  | "timeout"
  | "rate_limited"
  | "provider_error"
  | "invalid_response";

export type AiActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: AiFailureCode;
      message: string;
      retryable?: boolean;
    };
