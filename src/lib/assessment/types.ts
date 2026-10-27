import type { CareerTrackSlug } from "@/lib/career/tracks";

export const TECHNICAL_SECTIONS = [
  {
    id: "programming",
    label: "Programming",
    description: "Python foundations, debugging, and problem solving.",
  },
  {
    id: "sql",
    label: "SQL and databases",
    description: "Filtering, aggregation, joins, subqueries, and design.",
  },
  {
    id: "data-science",
    label: "Data science foundations",
    description: "Statistics, probability, cleaning, pandas, and EDA.",
  },
  {
    id: "software-development",
    label: "Software development",
    description: "Git, command line, APIs, testing, and project structure.",
  },
] as const;

export type TechnicalSection = (typeof TECHNICAL_SECTIONS)[number]["id"];
export type AssessmentSection =
  | TechnicalSection
  | "career"
  | "constraints";

export const SECTION_LABELS: Record<AssessmentSection, string> = {
  programming: "Programming",
  sql: "SQL and databases",
  "data-science": "Data science foundations",
  "software-development": "Software development",
  career: "Career preferences",
  constraints: "Study constraints",
};

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;
export type DemonstratedLevel =
  | "none"
  | "foundational"
  | "beginner"
  | "basic"
  | "intermediate";
export type ConfidenceMismatch = "overconfident" | "underconfident" | null;

export const CONFIDENCE_OPTIONS: ReadonlyArray<{
  value: `${ConfidenceLevel}`;
  label: string;
}> = [
  { value: "1", label: "Not confident" },
  { value: "2", label: "Slightly confident" },
  { value: "3", label: "Moderately confident" },
  { value: "4", label: "Confident" },
  { value: "5", label: "Very confident" },
];

export const INTEREST_KEYS = [
  "numerical-problems",
  "software-apps",
  "experimentation-research",
  "business-data",
  "automation",
  "ai-systems",
] as const;

export type InterestKey = (typeof INTEREST_KEYS)[number];

export const INTEREST_META: Record<
  InterestKey,
  { label: string; description: string }
> = {
  "numerical-problems": {
    label: "Numerical problems",
    description: "Working with numbers, patterns, and quantitative puzzles.",
  },
  "software-apps": {
    label: "Software applications",
    description: "Building, testing, and improving software that people use.",
  },
  "experimentation-research": {
    label: "Experimentation and research",
    description: "Designing experiments and investigating open questions.",
  },
  "business-data": {
    label: "Business data and decisions",
    description: "Using data to answer business questions and improve decisions.",
  },
  automation: {
    label: "Automation",
    description: "Automating repetitive work and connecting tools.",
  },
  "ai-systems": {
    label: "AI and intelligent systems",
    description: "Building with models, prompts, and intelligent workflows.",
  },
};

export type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

export type RemedialLesson = {
  slug: string;
  title: string;
};

export type TechnicalQuestion = {
  key: string;
  prompt: string;
  code?: string;
  options: readonly ChoiceOption[];
  correctOption: string;
  explanation: string;
  concept: string;
  remedial: RemedialLesson;
  difficulty: "core" | "application" | "foundation";
};

export type TechnicalProbe = {
  id: string;
  section: TechnicalSection;
  skillSlugs: readonly string[];
  concept: string;
  core: TechnicalQuestion;
  ifCorrect: TechnicalQuestion;
  ifIncorrect: TechnicalQuestion;
};

export type ConfidenceQuestion = {
  key: string;
  section: TechnicalSection;
  prompt: string;
  help: string;
  options: typeof CONFIDENCE_OPTIONS;
};

export type InterestQuestion = {
  key: string;
  interest: InterestKey;
  prompt: string;
};

export type CareerChoiceQuestion = {
  key: "career-style" | "career-activity";
  prompt: string;
  help: string;
  options: readonly ChoiceOption[];
};

export type ConstraintChoiceQuestion = {
  key: "environment" | "internet" | "timeline";
  prompt: string;
  help: string;
  options: readonly ChoiceOption[];
};

export type ConstraintHoursQuestion = {
  key: "weekly-hours";
  prompt: string;
  help: string;
  min: number;
  max: number;
  defaultValue: number;
};

export type AssessmentAnswers = Record<string, string>;

export type SkillResult = {
  skillSlug: string;
  skillName: string;
  section: TechnicalSection;
  concept: string;
  level: DemonstratedLevel;
  score: number;
  maxScore: number;
  percent: number;
  confidence: ConfidenceLevel;
  confidenceMismatch: ConfidenceMismatch;
  feedback: string[];
  missedConcepts: string[];
  remedial: RemedialLesson | null;
};

export type SectionResult = {
  section: TechnicalSection;
  label: string;
  score: number;
  maxScore: number;
  percent: number;
  confidence: ConfidenceLevel;
  confidenceMismatch: ConfidenceMismatch;
  skills: SkillResult[];
};

export type OverallResult = {
  score: number;
  maxScore: number;
  percent: number;
  confidenceAverage: number;
  confidenceMismatch: ConfidenceMismatch;
};

export type CareerSignal = {
  key: InterestKey;
  label: string;
  description: string;
  rating: ConfidenceLevel;
};

export type CareerRecommendation = {
  slug: CareerTrackSlug;
  name: string;
  family: string;
  fitScore: number;
  reasons: string[];
  experiment: string;
};

export type AssessmentConstraints = {
  weeklyHours: number;
  environment: string;
  internet: string;
  timeline: string;
};

export type AssessmentSummary = {
  version: 1;
  sections: SectionResult[];
  overall: OverallResult;
  strengths: string[];
  gaps: string[];
  applicationGaps: string[];
  confidenceNotes: string[];
  careerSignals: CareerSignal[];
  careerStyle: { value: string; label: string };
  careerActivity: { value: string; label: string };
  careerRecommendations: CareerRecommendation[];
  constraints: AssessmentConstraints;
  profileTarget: CareerTrackSlug | null;
  disclaimer: string;
};

export type StoredAnswer = {
  section: AssessmentSection;
  questionKey: string;
  questionType:
    | "multiple_choice"
    | "short_answer"
    | "code"
    | "self_report"
    | "preference";
  promptText: string;
  responseValue: string;
  responseLabel: string;
  isCorrect: boolean | null;
  score: number | null;
  maxScore: number | null;
  selfConfidence: number | null;
  concept: string | null;
  feedback: string | null;
  remedialLessonSlug: string | null;
};

export type AssessmentEvaluation = {
  summary: AssessmentSummary;
  overallScore: number;
  maxScore: number;
  confidenceAverage: number;
  usedAnswers: StoredAnswer[];
};

export type AssessmentType = "initial" | "retake" | "checkpoint";

export type AssessmentRecord = {
  id: string;
  type: AssessmentType;
  overallScore: number;
  maxScore: number;
  confidenceAverage: number;
  summary: AssessmentSummary;
  answers: StoredAnswer[];
  startedAt: string;
  completedAt: string;
  createdAt: string;
};

export type EvaluationFailure = {
  ok: false;
  message: string;
  missingKeys: string[];
  invalidKeys: string[];
};

export type EvaluationSuccess = {
  ok: true;
  evaluation: AssessmentEvaluation;
};

export type EvaluationOutcome = EvaluationSuccess | EvaluationFailure;

export const ASSESSMENT_DISCLAIMER =
  "This is a short, auto-scored knowledge screen. It is useful evidence of what you can do today, but it is not a proctored exam and does not verify mastery. Projects, repeated practice, and later assessments add stronger evidence.";
