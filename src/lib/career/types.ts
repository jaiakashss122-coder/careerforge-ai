import type { CareerTrackSlug } from "@/lib/career/tracks";

export const CAREER_EXPERIMENT_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;

export type CareerExperimentStatus =
  (typeof CAREER_EXPERIMENT_STATUSES)[number];

export const CAREER_EXPERIMENT_STATUS_LABELS: Record<
  CareerExperimentStatus,
  string
> = {
  not_started: "Not started",
  in_progress: "Trying it now",
  completed: "Tested",
};

export function isCareerExperimentStatus(
  value: string,
): value is CareerExperimentStatus {
  return CAREER_EXPERIMENT_STATUSES.includes(value as CareerExperimentStatus);
}

export const REFLECTION_SCALES = [
  "interest",
  "difficulty",
  "enjoyment",
  "willingness",
] as const;

export type ReflectionScale = (typeof REFLECTION_SCALES)[number];

export type CareerExperimentReflection = Record<ReflectionScale, number>;

export const MIN_REFLECTION_RATING = 1;
export const MAX_REFLECTION_RATING = 5;

export type ReflectionQuestion = {
  scale: ReflectionScale;
  label: string;
  question: string;
  oneMeans: string;
  fiveMeans: string;
};

export const REFLECTION_QUESTIONS: readonly ReflectionQuestion[] = [
  {
    scale: "interest",
    label: "Interest afterwards",
    question: "How curious do you still feel about this kind of work?",
    oneMeans:
      "1 means you do not want to look at it again. It is a valid answer and it counts.",
    fiveMeans:
      "5 means you want to keep going, and you would read about it even without a deadline.",
  },
  {
    scale: "difficulty",
    label: "Difficulty",
    question: "How hard was the work while you were doing it?",
    oneMeans: "1 means it felt easy, so it told you little about the role.",
    fiveMeans:
      "5 means you struggled the whole time. Struggle alone is not a reason to avoid a role.",
  },
  {
    scale: "enjoyment",
    label: "Enjoyment",
    question: "Did you enjoy the hours the work actually took?",
    oneMeans:
      "1 means you disliked the day-to-day activity, even if the result was good.",
    fiveMeans:
      "5 means you lost track of time doing the task itself, not just finishing it.",
  },
  {
    scale: "willingness",
    label: "Willingness to improve",
    question:
      "Would you put in the practice needed to get good at this, even though you were slow at it?",
    oneMeans: "1 means the effort needed does not feel worth it to you.",
    fiveMeans:
      "5 means you would keep practising this specific skill for months.",
  },
];

export function isReflectionScale(value: string): value is ReflectionScale {
  return REFLECTION_SCALES.includes(value as ReflectionScale);
}

export function isReflectionRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_REFLECTION_RATING &&
    value <= MAX_REFLECTION_RATING
  );
}

export type CareerExperimentEvidence = {
  version: 1;
  kindSlug: string;
  outputUrl: string;
};

export type CareerExperimentRecord = {
  id: string;
  careerSlug: CareerTrackSlug;
  title: string;
  brief: string;
  status: CareerExperimentStatus;
  reflection: CareerExperimentReflection | null;
  reflectionText: string;
  outputUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CareerPreferenceRecord = {
  id: string;
  specializationChoice: CareerTrackSlug | null;
  alternativeChoice: CareerTrackSlug | null;
  overrideReason: string;
  updatedAt: string;
};

export function getReflectionAverage(
  reflection: CareerExperimentReflection,
): number {
  const sum = REFLECTION_SCALES.reduce(
    (total, scale) => total + reflection[scale],
    0,
  );
  return sum / REFLECTION_SCALES.length;
}

export function getEnjoymentAverage(
  reflection: CareerExperimentReflection,
): number {
  return (
    (reflection.interest + reflection.enjoyment + reflection.willingness) / 3
  );
}
