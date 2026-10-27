export const SKILL_LEVELS = [
  "unassessed",
  "none",
  "foundational",
  "beginner",
  "basic",
  "intermediate",
  "advanced",
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_META: Record<
  SkillLevel,
  { label: string; description: string }
> = {
  unassessed: {
    label: "Not assessed",
    description: "You haven't told us yet — the assessment will check this.",
  },
  none: {
    label: "No experience",
    description: "You're starting from zero. That's a valid starting point.",
  },
  foundational: {
    label: "Foundational",
    description: "You've seen the basics but have limited hands-on practice.",
  },
  beginner: {
    label: "Beginner",
    description: "You can follow tutorials and need guidance on most tasks.",
  },
  basic: {
    label: "Basic",
    description: "You can write simple programs with occasional help.",
  },
  intermediate: {
    label: "Intermediate",
    description: "You can complete typical tasks independently.",
  },
  advanced: {
    label: "Advanced",
    description: "You can handle complex, unfamiliar tasks independently.",
  },
};

export const SELF_REPORTED_SKILLS = [
  { key: "pythonLevel", label: "Python" },
  { key: "sqlLevel", label: "SQL" },
  { key: "webLevel", label: "HTML / CSS / JavaScript" },
  { key: "statisticsLevel", label: "Statistics & mathematics" },
  { key: "machineLearningLevel", label: "Machine learning" },
  { key: "gitLevel", label: "Git & GitHub" },
] as const;

export type SelfReportedSkillKey =
  (typeof SELF_REPORTED_SKILLS)[number]["key"];

export const YEAR_OF_STUDY = [
  "First year",
  "Second year",
  "Third year",
  "Fourth year",
  "Graduated",
  "Other",
] as const;

export type YearOfStudy = (typeof YEAR_OF_STUDY)[number];

export const CAREER_STATUSES = ["undecided", "exploring", "decided"] as const;

export type CareerStatus = (typeof CAREER_STATUSES)[number];

export const CAREER_STATUS_META: Record<
  CareerStatus,
  { label: string; description: string }
> = {
  undecided: {
    label: "Undecided",
    description: "Keep the field open while you gather evidence from experiments.",
  },
  exploring: {
    label: "Exploring",
    description: "You have a few directions in mind and want to test them.",
  },
  decided: {
    label: "Decided",
    description: "You have a target role, while staying open to new evidence.",
  },
};

export const LEARNING_PREFERENCE_VALUES = [
  "practical-projects",
  "clear-explanations",
  "hands-on-exercises",
  "personalized-guidance",
  "visual-explanations",
  "documentation-deep-dives",
] as const;

export type LearningPreference = (typeof LEARNING_PREFERENCE_VALUES)[number];

export const LEARNING_PREFERENCES: ReadonlyArray<{
  value: LearningPreference;
  label: string;
  description: string;
}> = [
  {
    value: "practical-projects",
    label: "Practical projects",
    description: "Learn by building something that works.",
  },
  {
    value: "clear-explanations",
    label: "Clear explanations",
    description: "Plain-language explanations before technical detail.",
  },
  {
    value: "hands-on-exercises",
    label: "Hands-on exercises",
    description: "Practice with small, focused exercises.",
  },
  {
    value: "personalized-guidance",
    label: "Personalized guidance",
    description: "Feedback adapted to your current level and gaps.",
  },
  {
    value: "visual-explanations",
    label: "Visual explanations",
    description: "Diagrams and visual models for abstract ideas.",
  },
  {
    value: "documentation-deep-dives",
    label: "Documentation deep dives",
    description: "Read primary sources and official references.",
  },
];

export const TOOL_VALUES = [
  "vscode",
  "ai-coding-agent",
  "github",
  "jupyter",
  "google-colab",
  "terminal",
] as const;

export type ToolId = (typeof TOOL_VALUES)[number];

export const TOOLS: ReadonlyArray<{ value: ToolId; label: string }> = [
  { value: "vscode", label: "VS Code" },
  { value: "ai-coding-agent", label: "AI coding agent" },
  { value: "github", label: "GitHub" },
  { value: "jupyter", label: "Jupyter Notebook" },
  { value: "google-colab", label: "Google Colab" },
  { value: "terminal", label: "Terminal / command line" },
];

export const SESSION_LENGTH_VALUES = [20, 45, 90] as const;

export type SessionLength = (typeof SESSION_LENGTH_VALUES)[number];

export const SESSION_LENGTHS: ReadonlyArray<{
  value: SessionLength;
  label: string;
  description: string;
}> = [
  { value: 20, label: "Quick learn", description: "20 minutes" },
  { value: 45, label: "Focused session", description: "45 minutes" },
  { value: 90, label: "Project session", description: "90 minutes" },
];
