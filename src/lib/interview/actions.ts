"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCareerTrackSlug, type CareerTrackSlug } from "@/lib/career/tracks";
import {
  deleteInterviewAttemptRow,
  deleteInterviewEvidenceRows,
  deleteJobApplicationRow,
  deleteMockInterviewRow,
  completeMockInterviewRow,
  insertInterviewAttemptRow,
  insertInterviewEvidenceRows,
  insertJobApplicationRow,
  insertMockInterviewRow,
  listInterviewAttemptRecords,
  listMockInterviewRecords,
  updateJobApplicationRow,
} from "@/lib/interview/repository";
import { readJobDescription } from "@/lib/interview/description";
import { createId } from "@/lib/id";
import { SKILLS } from "@/lib/skills/catalog";
import {
  ANSWER_RATING_META,
  APPLICATION_SOURCE_KINDS,
  APPLICATION_STATUS_META,
  INTERVIEW_STATUSES,
  INTERVIEW_TOPICS,
  MAX_ANSWER_LENGTH,
  MAX_APPLICATION_FIELD_LENGTH,
  MAX_JOB_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  MIN_JOB_DESCRIPTION_LENGTH,
  type AnswerRating,
  type ApplicationSourceKind,
  type ApplicationStatus,
  type InterviewTopic,
  type JobApplicationRecord,
} from "@/lib/interview/types";
import {
  MOCK_INTERVIEW_MAX_QUESTIONS,
  MOCK_INTERVIEW_MIN_QUESTIONS,
  buildInterviewEvidence,
  chooseMockQuestions,
  summarizeInterview,
} from "@/lib/interview/mock";
import { getInterviewQuestion } from "@/lib/interview/questions";
import type {
  FinishMockInterviewInput,
  InterviewActionResult,
  RecordInterviewAnswerInput,
  RemoveInterviewAttemptInput,
  RemoveJobApplicationInput,
  RemoveMockInterviewInput,
  SaveJobApplicationInput,
  StartMockInterviewInput,
  UpdateApplicationProgressInput,
} from "@/lib/interview/action-types";

const REVALIDATED_PATHS = ["/interview", "/dashboard", "/progress", "/settings"];

function revalidateInterview() {
  for (const path of REVALIDATED_PATHS) {
    revalidatePath(path);
  }
}

function firstIssue(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

const topicSchema = z
  .array(z.unknown())
  .min(1, "Pick at least one area to practise.")
  .max(INTERVIEW_TOPICS.length, "That is more areas than this app has.")
  .refine(
    (values): values is InterviewTopic[] =>
      values.every(
        (value) =>
          typeof value === "string" &&
          (INTERVIEW_TOPICS as readonly string[]).includes(value),
      ),
    "An area you picked is not one this app asks about.",
  );

const trackSchema = z
  .unknown()
  .refine(
    (value) => value === null || value === "" || isCareerTrackSlug(value as string),
    "That role is not one this app knows about.",
  );

const countSchema = z
  .number()
  .int()
  .min(MOCK_INTERVIEW_MIN_QUESTIONS, "A practice interview needs at least 3 questions.")
  .max(MOCK_INTERVIEW_MAX_QUESTIONS, `The bank cannot run more than ${MOCK_INTERVIEW_MAX_QUESTIONS} questions at once.`);

const ratingSchema = z
  .unknown()
  .refine(
    (value): value is AnswerRating =>
      typeof value === "string" &&
      ["covered", "partial", "not-covered"].includes(value),
    "Choose one of the three answers about how it went.",
  );

const answerSchema = z
  .string()
  .trim()
  .max(MAX_ANSWER_LENGTH, "That written answer is longer than this field can hold.");

const daySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date form 2026-10-27.")
  .nullable();

const textFieldSchema = z
  .string()
  .trim()
  .max(MAX_APPLICATION_FIELD_LENGTH, "One of those fields is longer than 160 characters.");

const urlSchema = z
  .string()
  .trim()
  .max(500, "That link is too long to save.")
  .refine(
    (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
    "The link must start with http:// or https://, or be left empty.",
  );

const descriptionSchema = z
  .string()
  .trim()
  .max(MAX_JOB_DESCRIPTION_LENGTH, "That posting is longer than this app will read.")
  .refine(
    (value) =>
      value === "" ||
      value.length >= MIN_JOB_DESCRIPTION_LENGTH,
    `A posting has to be at least ${MIN_JOB_DESCRIPTION_LENGTH} characters before anything useful can be read out of it. Paste the responsibilities and requirements, not the title.`,
  );

const notesSchema = z
  .string()
  .trim()
  .max(MAX_NOTES_LENGTH, "Those notes are longer than this field can hold.");

const statusSchema = z
  .unknown()
  .refine(
    (value): value is ApplicationStatus =>
      typeof value === "string" &&
      (INTERVIEW_STATUSES as readonly string[]).includes(value),
    "That status is not one this app records.",
  );

const sourceKindSchema = z
  .unknown()
  .refine(
    (value): value is ApplicationSourceKind =>
      typeof value === "string" &&
      (APPLICATION_SOURCE_KINDS as readonly string[]).includes(value),
    "Say whether this is an opening you found or a written example.",
  );

export async function startMockInterviewAction(
  input: StartMockInterviewInput,
): Promise<InterviewActionResult> {
  const parsedTopics = topicSchema.safeParse(input.topics);

  if (!parsedTopics.success) {
    return { ok: false, message: firstIssue(parsedTopics.error, "Pick an area to practise.") };
  }

  const parsedTrack = trackSchema.safeParse(input.track ?? null);

  if (!parsedTrack.success) {
    return { ok: false, message: firstIssue(parsedTrack.error, "Choose a role.") };
  }

  const parsedCount = countSchema.safeParse(input.count);

  if (!parsedCount.success) {
    return { ok: false, message: firstIssue(parsedCount.error, "Choose how many questions.") };
  }

  const attempts = await listInterviewAttemptRecords();
  const plan = chooseMockQuestions({
    topics: parsedTopics.data,
    track: (parsedTrack.data || null) as CareerTrackSlug | null,
    count: parsedCount.data,
    attempts,
  });

  if (plan.questionIds.length === 0) {
    return {
      ok: false,
      message: "This app has no questions for that combination, so there is nothing to run.",
    };
  }

  const created = await insertMockInterviewRow({
    label: plan.label,
    topics: plan.topics,
    questionIds: plan.questionIds,
  });

  if (!created.ok) return created;

  revalidateInterview();

  return {
    ok: true,
    message: `A ${plan.questionIds.length}-question practice interview is open. Nothing is written to your skill records until you finish it.`,
  };
}

export async function recordInterviewAnswerAction(
  input: RecordInterviewAnswerInput,
): Promise<InterviewActionResult> {
  const parsedInterviewId = z
    .union([z.string().uuid(), z.literal("")])
    .safeParse(input.interviewId ?? "");

  if (!parsedInterviewId.success) {
    return { ok: false, message: "That interview could not be read." };
  }

  const parsedRating = ratingSchema.safeParse(input.rating);

  if (!parsedRating.success) {
    return { ok: false, message: firstIssue(parsedRating.error, "Rate the answer.") };
  }

  const parsedAnswer = answerSchema.safeParse(input.answerText ?? "");

  if (!parsedAnswer.success) {
    return { ok: false, message: firstIssue(parsedAnswer.error, "Shorten the answer.") };
  }

  const question = getInterviewQuestion(
    typeof input.questionId === "string" ? input.questionId : "",
  );

  if (!question) {
    return { ok: false, message: "That question is not one this app asks." };
  }

  const interviews = await listMockInterviewRecords();
  const interviewId = parsedInterviewId.data || null;
  const interview = interviewId
    ? interviews.find((entry) => entry.id === interviewId)
    : null;

  if (interviewId && !interview) {
    return { ok: false, message: "That interview is not open on this account." };
  }

  if (interview?.completedAt) {
    return {
      ok: false,
      message: "That interview is already finished, so its answers are closed. Start another one to practise again.",
    };
  }

  if (interview && !interview.questionIds.includes(question.id)) {
    return {
      ok: false,
      message: "That question is not part of this interview.",
    };
  }

  const existing = await listInterviewAttemptRecords();

  if (
    existing.some(
      (attempt) =>
        attempt.questionId === question.id &&
        (interviewId === null || attempt.interviewId === interviewId),
    )
  ) {
    return {
      ok: false,
      message: "You have already rated that question in this interview. Remove the answer first if you want to change it.",
    };
  }

  const saved = await insertInterviewAttemptRow({
    attempt: {
      id: createId(),
      questionId: question.id,
      topic: question.topic,
      prompt: question.prompt,
      answerText: parsedAnswer.data,
      rating: parsedRating.data,
      skills: question.skills,
      interviewId,
      createdAt: new Date().toISOString(),
    },
  });

  if (!saved.ok) return saved;

  revalidateInterview();

  return {
    ok: true,
    message: `Recorded as “${ANSWER_RATING_META[parsedRating.data].label}”. No skill record is written yet; a finished interview is what writes those.`,
  };
}

export async function removeInterviewAttemptAction(
  input: RemoveInterviewAttemptInput,
): Promise<InterviewActionResult> {
  const attemptId = z.string().uuid().safeParse(input.attemptId);

  if (!attemptId.success) {
    return { ok: false, message: "That answer could not be read." };
  }

  const [attempts, interviews] = await Promise.all([
    listInterviewAttemptRecords(),
    listMockInterviewRecords(),
  ]);
  const attempt = attempts.find((entry) => entry.id === attemptId.data);

  if (!attempt) {
    return { ok: false, message: "That answer no longer exists." };
  }

  const interview = interviews.find((entry) => entry.id === attempt.interviewId);

  if (interview?.completedAt) {
    return {
      ok: false,
      message:
        "That answer belongs to a finished interview. Remove the interview itself to clear everything it wrote.",
    };
  }

  const removed = await deleteInterviewAttemptRow(attempt.id);

  if (!removed.ok) return removed;

  revalidateInterview();

  return {
    ok: true,
    message: "That answer was removed. It counts toward nothing now.",
  };
}

export async function finishMockInterviewAction(
  input: FinishMockInterviewInput,
): Promise<InterviewActionResult> {
  const interviewId = z.string().uuid().safeParse(input.interviewId);

  if (!interviewId.success) {
    return { ok: false, message: "That interview could not be read." };
  }

  const [interviews, attempts] = await Promise.all([
    listMockInterviewRecords(),
    listInterviewAttemptRecords(),
  ]);
  const interview = interviews.find((entry) => entry.id === interviewId.data);

  if (!interview) {
    return { ok: false, message: "That interview is not on this account." };
  }

  if (interview.completedAt) {
    return { ok: false, message: "That interview is already finished." };
  }

  const outcome = summarizeInterview({
    questionIds: interview.questionIds,
    attempts,
  });

  if (!outcome.ready) {
    return { ok: false, message: outcome.notReadyMessage ?? "Rate every question first." };
  }

  const finished = await completeMockInterviewRow(interview.id);

  if (!finished.ok) return finished;

  const completed = { ...interview, completedAt: new Date().toISOString() };
  const drafts = buildInterviewEvidence({ interview: completed, attempts, outcome });
  const written = await insertInterviewEvidenceRows({
    interviewId: interview.id,
    entries: drafts.map((draft) => ({
      skillSlug: draft.skillSlug,
      notes: draft.notes,
    })),
  });

  if (!written.ok) return written;

  revalidateInterview();

  const evidenceLine =
    written.count === 0
      ? "No skill record was written, because no question in it was rated “I answered it”."
      : `Written ${written.count} unverified ${written.count === 1 ? "skill record" : "skill records"} at the interview level, one for each skill you rated as answered.`;

  return {
    ok: true,
    message: `Interview finished: ${outcome.covered} of ${outcome.total} questions rated as answered, ${outcome.partial} part-answered, ${outcome.missed} you could not answer. ${evidenceLine}`,
  };
}

export async function removeMockInterviewAction(
  input: RemoveMockInterviewInput,
): Promise<InterviewActionResult> {
  const interviewId = z.string().uuid().safeParse(input.interviewId);

  if (!interviewId.success) {
    return { ok: false, message: "That interview could not be read." };
  }

  const removed = await deleteMockInterviewRow(interviewId.data);

  if (!removed.ok) return removed;

  const evidence = await deleteInterviewEvidenceRows(interviewId.data);

  if (!evidence.ok) return evidence;

  revalidateInterview();

  return {
    ok: true,
    message:
      "That practice interview, its answers, and the skill records it wrote were removed. Nothing about it stays in your progress.",
  };
}

export async function saveJobApplicationAction(
  input: SaveJobApplicationInput,
): Promise<InterviewActionResult> {
  const company = textFieldSchema.safeParse(input.company);

  if (!company.success) {
    return {
      ok: false,
      message: firstIssue(company.error, "Write the organisation this role is at."),
    };
  }

  const roleTitle = textFieldSchema.safeParse(input.roleTitle);

  if (!roleTitle.success) {
    return {
      ok: false,
      message: firstIssue(roleTitle.error, "Write the role title as the posting words it."),
    };
  }

  const jobUrl = urlSchema.safeParse(input.jobUrl ?? "");

  if (!jobUrl.success) {
    return { ok: false, message: firstIssue(jobUrl.error, "Check the link.") };
  }

  const location = textFieldSchema.safeParse(input.location ?? "");

  if (!location.success) {
    return { ok: false, message: firstIssue(location.error, "Check the location.") };
  }

  const sourceKind = sourceKindSchema.safeParse(input.sourceKind);

  if (!sourceKind.success) {
    return {
      ok: false,
      message: firstIssue(sourceKind.error, "Say whether this is an opening you found or a written example."),
    };
  }

  const status = statusSchema.safeParse(input.status);

  if (!status.success) {
    return { ok: false, message: firstIssue(status.error, "That status is not one this app records.") };
  }

  const appliedOn = daySchema.safeParse(input.appliedOn || null);

  if (!appliedOn.success) {
    return { ok: false, message: firstIssue(appliedOn.error, "Check the date you applied.") };
  }

  const nextAction = textFieldSchema.safeParse(input.nextAction ?? "");

  if (!nextAction.success) {
    return { ok: false, message: firstIssue(nextAction.error, "Check the next action.") };
  }

  const nextActionOn = daySchema.safeParse(input.nextActionOn || null);

  if (!nextActionOn.success) {
    return { ok: false, message: firstIssue(nextActionOn.error, "Check the date of the next action.") };
  }

  const notes = notesSchema.safeParse(input.notes ?? "");

  if (!notes.success) {
    return { ok: false, message: firstIssue(notes.error, "Shorten the notes.") };
  }

  const description = descriptionSchema.safeParse(input.description ?? "");

  if (!description.success) {
    return { ok: false, message: firstIssue(description.error, "Check the posting text.") };
  }

  if (company.data === "") {
    return { ok: false, message: "Write the organisation this role is at." };
  }

  if (roleTitle.data === "") {
    return { ok: false, message: "Write the role title as the posting words it." };
  }

  const payload = {
    company: company.data,
    roleTitle: roleTitle.data,
    jobUrl: jobUrl.data === "" ? null : jobUrl.data,
    location: location.data === "" ? null : location.data,
    sourceKind: sourceKind.data,
    status: status.data,
    appliedOn: appliedOn.data,
    nextAction: nextAction.data === "" ? null : nextAction.data,
    nextActionOn: nextActionOn.data,
    notes: notes.data,
    description: description.data,
  };

  if (payload.status === "applied" && payload.appliedOn === null) {
    return {
      ok: false,
      message: "Marking this as applied needs the date you sent it, so the record stays checkable.",
    };
  }

  const saved = await insertJobApplicationRow({
    application: {
      ...payload,
      skills: readJobDescription(payload.description).skills.map(
        (skill) => skill.slug,
      ),
    } satisfies Omit<JobApplicationRecord, "id" | "createdAt" | "updatedAt">,
  });

  if (!saved.ok) return saved;

  revalidateInterview();

  return {
    ok: true,
    message:
      payload.description === ""
        ? "Saved. Without the posting text there is nothing to read a skill out of, so no comparison is shown."
        : `Saved. The comparison below reads the text you pasted against the ${SKILLS.length} skills this app knows.`,
  };
}

export async function updateApplicationProgressAction(
  input: UpdateApplicationProgressInput,
): Promise<InterviewActionResult> {
  const applicationId = z.string().uuid().safeParse(input.applicationId);

  if (!applicationId.success) {
    return { ok: false, message: "That saved role could not be read." };
  }

  const status = statusSchema.safeParse(input.status);

  if (!status.success) {
    return { ok: false, message: firstIssue(status.error, "That status is not one this app records.") };
  }

  const appliedOn = daySchema.safeParse(input.appliedOn || null);

  if (!appliedOn.success) {
    return { ok: false, message: firstIssue(appliedOn.error, "Check the date you applied.") };
  }

  const nextAction = textFieldSchema.safeParse(input.nextAction ?? "");

  if (!nextAction.success) {
    return { ok: false, message: firstIssue(nextAction.error, "Check the next action.") };
  }

  const nextActionOn = daySchema.safeParse(input.nextActionOn || null);

  if (!nextActionOn.success) {
    return { ok: false, message: firstIssue(nextActionOn.error, "Check the date of the next action.") };
  }

  const notes = notesSchema.safeParse(input.notes ?? "");

  if (!notes.success) {
    return { ok: false, message: firstIssue(notes.error, "Shorten the notes.") };
  }

  const description = descriptionSchema.safeParse(input.description ?? "");

  if (!description.success) {
    return {
      ok: false,
      message: firstIssue(
        description.error,
        "Check the posting text before saving.",
      ),
    };
  }

  if (status.data === "applied" && appliedOn.data === null) {
    return {
      ok: false,
      message: "Marking this as applied needs the date you sent it, so the record stays checkable.",
    };
  }

  const skills = readJobDescription(description.data).skills.map(
    (skill) => skill.slug,
  );

  const updated = await updateJobApplicationRow({
    applicationId: applicationId.data,
    changes: {
      status: status.data,
      appliedOn: appliedOn.data,
      nextAction: nextAction.data === "" ? null : nextAction.data,
      nextActionOn: nextActionOn.data,
      notes: notes.data,
      description: description.data,
      skills,
    },
  });

  if (!updated.ok) return updated;

  revalidateInterview();

  const descriptionLine =
    description.data === ""
      ? " The posting text was cleared, so no comparison is shown for this role."
      : ` The posting text was saved, and ${skills.length} of the ${SKILLS.length} skills this app knows were found in it.`;

  return {
    ok: true,
    message: `That role now reads “${APPLICATION_STATUS_META[status.data].label}”: ${APPLICATION_STATUS_META[status.data].meaning}${descriptionLine}`,
  };
}

export async function removeJobApplicationAction(
  input: RemoveJobApplicationInput,
): Promise<InterviewActionResult> {
  const applicationId = z.string().uuid().safeParse(input.applicationId);

  if (!applicationId.success) {
    return { ok: false, message: "That saved role could not be read." };
  }

  const removed = await deleteJobApplicationRow(applicationId.data);

  if (!removed.ok) return removed;

  revalidateInterview();

  return { ok: true, message: "That saved role and the text you pasted with it were removed." };
}
