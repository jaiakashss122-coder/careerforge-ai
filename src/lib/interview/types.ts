import type { CareerTrackSlug } from "@/lib/career/tracks";

export const INTERVIEW_TOPICS = [
  "python",
  "sql",
  "statistics",
  "machine-learning",
  "behavioural",
  "role-specific",
] as const;

export type InterviewTopic = (typeof INTERVIEW_TOPICS)[number];

export const INTERVIEW_TOPIC_META: Record<
  InterviewTopic,
  { label: string; whatItProbes: string; group: "technical" | "story" | "role" }
> = {
  python: {
    label: "Python",
    whatItProbes:
      "Whether you can read a short program, explain what it does, and fix what breaks it.",
    group: "technical",
  },
  sql: {
    label: "SQL",
    whatItProbes:
      "Whether you can turn a question about data into a query and defend the result.",
    group: "technical",
  },
  statistics: {
    label: "Statistics",
    whatItProbes:
      "Whether you can reason about uncertainty, averages, and evidence without hand-waving.",
    group: "technical",
  },
  "machine-learning": {
    label: "Machine learning",
    whatItProbes:
      "Whether you understand what a model actually does, how it is measured, and where it fails.",
    group: "technical",
  },
  behavioural: {
    label: "Behavioural",
    whatItProbes:
      "How you describe work you have done: the situation, your decision, and what you would change.",
    group: "story",
  },
  "role-specific": {
    label: "Role-specific",
    whatItProbes:
      "The questions a particular role asks because of what that role is responsible for.",
    group: "role",
  },
};

export const INTERVIEW_TOPIC_ORDER: readonly InterviewTopic[] = [
  "python",
  "sql",
  "statistics",
  "machine-learning",
  "behavioural",
  "role-specific",
];

export const ANSWER_RATINGS = ["covered", "partial", "not-covered"] as const;

export type AnswerRating = (typeof ANSWER_RATINGS)[number];

/**
 * The three labels a learner picks from. They are kept deliberately concrete,
 * because "strong" and "weak" invite a learner to talk themselves up.
 */
export const ANSWER_RATING_META: Record<
  AnswerRating,
  { label: string; meaning: string; countsAsEvidence: boolean }
> = {
  covered: {
    label: "I answered it",
    meaning:
      "You gave the point and the reason, unprompted, without needing the follow-up question.",
    countsAsEvidence: true,
  },
  partial: {
    label: "I got part of it",
    meaning:
      "You reached part of the answer, or you needed a hint or the follow-up to get there.",
    countsAsEvidence: false,
  },
  "not-covered": {
    label: "I could not answer it",
    meaning:
      "You could not give the point in your own words, so this is a gap worth a study block.",
    countsAsEvidence: false,
  },
};

export const INTERVIEW_STATUSES = [
  "saved",
  "prepared",
  "applied",
  "interviewing",
  "offer",
  "closed",
] as const;

export type ApplicationStatus = (typeof INTERVIEW_STATUSES)[number];

export const APPLICATION_STATUS_META: Record<
  ApplicationStatus,
  { label: string; meaning: string }
> = {
  saved: {
    label: "Saved",
    meaning: "You recorded the role. Nothing has been written or sent yet.",
  },
  prepared: {
    label: "Prepared",
    meaning:
      "Its skill gaps have been read against your own records and a plan is attached.",
  },
  applied: {
    label: "Applied",
    meaning: "You have sent the application. The date is the day you sent it.",
  },
  interviewing: {
    label: "Interviewing",
    meaning: "Someone has asked to speak with you.",
  },
  offer: {
    label: "Offer",
    meaning: "An offer has been made to you.",
  },
  closed: {
    label: "Closed",
    meaning:
      "Rejected, withdrawn, or no longer worth tracking. The reason is yours to write.",
  },
};

export const APPLICATION_SOURCE_KINDS = ["real", "example"] as const;

export type ApplicationSourceKind = (typeof APPLICATION_SOURCE_KINDS)[number];

export const APPLICATION_SOURCE_META: Record<
  ApplicationSourceKind,
  { label: string; meaning: string }
> = {
  real: {
    label: "An opening you found",
    meaning:
      "You typed or pasted this from somewhere outside the app. It is your record of a real posting; nothing here checked that it exists.",
  },
  example: {
    label: "A written example",
    meaning:
      "This posting was written for practice by this app. It is not a real vacancy and no one is hiring for it.",
  },
};

export type InterviewQuestion = {
  id: string;
  topic: InterviewTopic;
  prompt: string;
  /** What the answer has to contain before this app treats the question as answered. */
  goodAnswerCovers: string[];
  followUps: string[];
  skills: string[];
  /** Only set for role-specific questions. */
  tracks?: CareerTrackSlug[];
  /** Why an interviewer asks this, shown after the answer is rated. */
  askedWhy: string;
};

export type InterviewAttemptRecord = {
  id: string;
  questionId: string;
  topic: InterviewTopic;
  prompt: string;
  answerText: string;
  rating: AnswerRating;
  skills: string[];
  interviewId: string | null;
  createdAt: string;
};

export type MockInterviewRecord = {
  id: string;
  label: string;
  topics: InterviewTopic[];
  questionIds: string[];
  startedAt: string;
  completedAt: string | null;
};

export type JobApplicationRecord = {
  id: string;
  company: string;
  roleTitle: string;
  jobUrl: string | null;
  location: string | null;
  sourceKind: ApplicationSourceKind;
  status: ApplicationStatus;
  appliedOn: string | null;
  nextAction: string | null;
  nextActionOn: string | null;
  skills: string[];
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const MAX_ANSWER_LENGTH = 1_500;
export const MAX_JOB_DESCRIPTION_LENGTH = 6_000;
export const MAX_APPLICATION_FIELD_LENGTH = 160;
export const MAX_NOTES_LENGTH = 1_000;
export const MIN_JOB_DESCRIPTION_LENGTH = 80;

export function isInterviewTopic(value: string): value is InterviewTopic {
  return (INTERVIEW_TOPICS as readonly string[]).includes(value);
}

export function isAnswerRating(value: string): value is AnswerRating {
  return (ANSWER_RATINGS as readonly string[]).includes(value);
}

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (INTERVIEW_STATUSES as readonly string[]).includes(value);
}

export function isApplicationSourceKind(
  value: string,
): value is ApplicationSourceKind {
  return (APPLICATION_SOURCE_KINDS as readonly string[]).includes(value);
}
