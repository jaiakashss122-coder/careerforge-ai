import { loadSkillIdBySlug } from "@/lib/evidence/repository";
import { getInterviewQuestion } from "@/lib/interview/questions";
import {
  isAnswerRating,
  isApplicationSourceKind,
  isApplicationStatus,
  isInterviewTopic,
  type ApplicationSourceKind,
  type ApplicationStatus,
  type InterviewAttemptRecord,
  type InterviewTopic,
  type JobApplicationRecord,
  type MockInterviewRecord,
} from "@/lib/interview/types";
import type {
  InterviewAttemptRow,
  JobApplicationRow,
  Json,
  MockInterviewRow,
} from "@/lib/supabase/database.types";
import { getAuthenticatedContext } from "@/lib/workspace/server";

type WriteResult = { ok: true } | { ok: false; message: string };

function stringList(value: Json): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is string => typeof entry === "string");
}

function topicsOf(value: Json): InterviewTopic[] {
  return stringList(value).filter(isInterviewTopic);
}

function attemptRowToRecord(row: InterviewAttemptRow): InterviewAttemptRecord | null {
  // The prompt and skills are read from the row, not the bank, because they
  // were copied when the answer was recorded. A later edit to the bank cannot
  // rewrite what a learner was actually asked.
  if (!isInterviewTopic(row.topic) || !isAnswerRating(row.rating)) return null;

  return {
    id: row.id,
    questionId: row.question_id,
    topic: row.topic,
    prompt: row.prompt,
    answerText: row.answer_text,
    rating: row.rating,
    skills: stringList(row.skills),
    interviewId: row.interview_id,
    createdAt: row.created_at,
  };
}

function interviewRowToRecord(row: MockInterviewRow): MockInterviewRecord | null {
  const questionIds = stringList(row.question_ids).filter(
    (id) => getInterviewQuestion(id) !== null,
  );

  if (questionIds.length === 0) return null;

  return {
    id: row.id,
    label: row.label,
    topics: topicsOf(row.topics),
    questionIds,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function applicationRowToRecord(row: JobApplicationRow): JobApplicationRecord | null {
  if (!isApplicationStatus(row.status) || !isApplicationSourceKind(row.source_kind)) {
    return null;
  }

  return {
    id: row.id,
    company: row.company,
    roleTitle: row.role_title,
    jobUrl: row.job_url,
    location: row.location,
    sourceKind: row.source_kind as ApplicationSourceKind,
    status: row.status as ApplicationStatus,
    appliedOn: row.applied_on,
    nextAction: row.next_action,
    nextActionOn: row.next_action_on,
    skills: stringList(row.skills),
    description: row.description,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listInterviewAttemptRecords(): Promise<
  InterviewAttemptRecord[]
> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("interview_attempts")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Interview attempt lookup failed:", error.code);
    throw new Error("Your practised answers could not be loaded.");
  }

  return (data ?? []).flatMap((row) => {
    const record = attemptRowToRecord(row);
    return record ? [record] : [];
  });
}

export async function listMockInterviewRecords(): Promise<MockInterviewRecord[]> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("mock_interviews")
    .select("*")
    .eq("user_id", context.userId)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Mock interview lookup failed:", error.code);
    throw new Error("Your practice interviews could not be loaded.");
  }

  return (data ?? []).flatMap((row) => {
    const record = interviewRowToRecord(row);
    return record ? [record] : [];
  });
}

export async function listJobApplicationRecords(): Promise<JobApplicationRecord[]> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", context.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Application lookup failed:", error.code);
    throw new Error("Your saved roles could not be loaded.");
  }

  return (data ?? []).flatMap((row) => {
    const record = applicationRowToRecord(row);
    return record ? [record] : [];
  });
}

export async function insertMockInterviewRow({
  label,
  topics,
  questionIds,
}: {
  label: string;
  topics: InterviewTopic[];
  questionIds: string[];
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to run a practice interview." };
  }

  const { data, error } = await context.supabase
    .from("mock_interviews")
    .insert({
      user_id: context.userId,
      label,
      topics,
      question_ids: questionIds,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Mock interview insert failed:", error.code);
    return { ok: false, message: "The practice interview could not be started." };
  }

  if (!data) {
    return { ok: false, message: "The practice interview could not be started." };
  }

  return { ok: true, id: data.id };
}

export async function completeMockInterviewRow(
  interviewId: string,
): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to finish a practice interview." };
  }

  const { data, error } = await context.supabase
    .from("mock_interviews")
    .update({ completed_at: new Date().toISOString() })
    .eq("user_id", context.userId)
    .eq("id", interviewId)
    .is("completed_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Mock interview update failed:", error.code);
    return { ok: false, message: "The practice interview could not be finished." };
  }

  if (!data) {
    return {
      ok: false,
      message: "That interview is not open on this account, or it is already finished.",
    };
  }

  return { ok: true };
}

export async function deleteMockInterviewRow(
  interviewId: string,
): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to remove a practice interview." };
  }

  const { data, error } = await context.supabase
    .from("mock_interviews")
    .delete()
    .eq("user_id", context.userId)
    .eq("id", interviewId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Mock interview delete failed:", error.code);
    return { ok: false, message: "That practice interview could not be removed." };
  }

  if (!data) {
    return { ok: false, message: "That practice interview no longer exists." };
  }

  return { ok: true };
}

export async function insertInterviewAttemptRow({
  attempt,
}: {
  attempt: InterviewAttemptRecord;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to record a practised answer." };
  }

  const question = getInterviewQuestion(attempt.questionId);

  if (!question) {
    return { ok: false, message: "That question is not one this app asks." };
  }

  const { data, error } = await context.supabase
    .from("interview_attempts")
    .insert({
      id: attempt.id,
      user_id: context.userId,
      interview_id: attempt.interviewId,
      question_id: question.id,
      topic: question.topic,
      // The prompt and skills are copied from the bank at the moment of
      // answering, so a later edit to the bank cannot rewrite history.
      prompt: question.prompt,
      answer_text: attempt.answerText,
      rating: attempt.rating,
      skills: question.skills,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Interview attempt insert failed:", error.code);

    if (error.code === "23505") {
      return {
        ok: false,
        message: "That question is already answered in this interview.",
      };
    }

    return { ok: false, message: "The answer could not be recorded." };
  }

  if (!data) {
    return { ok: false, message: "The answer could not be recorded." };
  }

  return { ok: true, id: data.id };
}

export async function rateInterviewAttemptRow({
  attemptId,
  rating,
  answerText,
}: {
  attemptId: string;
  rating: InterviewAttemptRecord["rating"];
  answerText: string;
}): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to rate a practised answer." };
  }

  const { data, error } = await context.supabase
    .from("interview_attempts")
    .update({ rating, answer_text: answerText })
    .eq("user_id", context.userId)
    .eq("id", attemptId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Interview attempt update failed:", error.code);
    return { ok: false, message: "That rating was not saved." };
  }

  if (!data) {
    return { ok: false, message: "That answer is not on this account." };
  }

  return { ok: true };
}

export async function deleteInterviewAttemptRow(
  attemptId: string,
): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to remove a practised answer." };
  }

  const { data, error } = await context.supabase
    .from("interview_attempts")
    .delete()
    .eq("user_id", context.userId)
    .eq("id", attemptId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Interview attempt delete failed:", error.code);
    return { ok: false, message: "That answer could not be removed." };
  }

  if (!data) {
    return { ok: false, message: "That answer no longer exists." };
  }

  return { ok: true };
}

/**
 * Writes the interview lane of the skill record. Only skills in this project's
 * catalogue are inserted; anything else is skipped with a warning rather than
 * pointed at the nearest matching row.
 */
export async function insertInterviewEvidenceRows({
  interviewId,
  entries,
}: {
  interviewId: string;
  entries: { skillSlug: string; notes: string }[];
}): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to record interview evidence." };
  }

  const idBySlug = await loadSkillIdBySlug(context.supabase);

  const rows = entries.flatMap((entry) => {
    const skillId = idBySlug.get(entry.skillSlug);

    if (!skillId) {
      console.warn(`Skipping evidence for unknown skill slug: ${entry.skillSlug}`);
      return [];
    }

    return [
      {
        user_id: context.userId,
        skill_id: skillId,
        source_type: "interview" as const,
        source_id: interviewId,
        evidence_level: "interview_evidence" as const,
        score: null,
        verified: false,
        notes: entry.notes,
      },
    ];
  });

  if (rows.length === 0) {
    return { ok: true, count: 0 };
  }

  const { error } = await context.supabase
    .from("user_skill_evidence")
    .insert(rows);

  if (error) {
    console.error("Interview evidence insert failed:", error.code);
    return {
      ok: false,
      message: "The interview finished, but its skill records could not be saved.",
    };
  }

  return { ok: true, count: rows.length };
}

export async function deleteInterviewEvidenceRows(
  interviewId: string,
): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to update your skill records." };
  }

  const { error } = await context.supabase
    .from("user_skill_evidence")
    .delete()
    .eq("user_id", context.userId)
    .eq("source_type", "interview")
    .eq("source_id", interviewId);

  if (error) {
    console.error("Interview evidence delete failed:", error.code);
    return { ok: false, message: "The linked skill records could not be removed." };
  }

  return { ok: true };
}

export async function insertJobApplicationRow({
  application,
}: {
  application: Omit<JobApplicationRecord, "id" | "createdAt" | "updatedAt">;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to save a role." };
  }

  const { data, error } = await context.supabase
    .from("job_applications")
    .insert({
      user_id: context.userId,
      company: application.company,
      role_title: application.roleTitle,
      job_url: application.jobUrl,
      location: application.location,
      source_kind: application.sourceKind,
      status: application.status,
      applied_on: application.appliedOn,
      next_action: application.nextAction,
      next_action_on: application.nextActionOn,
      skills: application.skills,
      description: application.description,
      notes: application.notes,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Application insert failed:", error.code);
    return { ok: false, message: "That role could not be saved." };
  }

  if (!data) {
    return { ok: false, message: "That role could not be saved." };
  }

  return { ok: true, id: data.id };
}

export async function updateJobApplicationRow({
  applicationId,
  changes,
}: {
  applicationId: string;
  changes: {
    status?: ApplicationStatus;
    appliedOn?: string | null;
    nextAction?: string | null;
    nextActionOn?: string | null;
    notes?: string;
    description?: string;
    /** Only meaningful beside `description`: the skills read out of the new text. */
    skills?: string[];
  };
}): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to change a saved role." };
  }

  const { data, error } = await context.supabase
    .from("job_applications")
    .update({
      ...(changes.status ? { status: changes.status } : {}),
      ...(changes.appliedOn !== undefined ? { applied_on: changes.appliedOn } : {}),
      ...(changes.nextAction !== undefined
        ? { next_action: changes.nextAction }
        : {}),
      ...(changes.nextActionOn !== undefined
        ? { next_action_on: changes.nextActionOn }
        : {}),
      ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
      ...(changes.description !== undefined
        ? { description: changes.description }
        : {}),
      ...(changes.skills !== undefined ? { skills: changes.skills } : {}),
    })
    .eq("user_id", context.userId)
    .eq("id", applicationId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Application update failed:", error.code);
    return { ok: false, message: "That role could not be updated." };
  }

  if (!data) {
    return { ok: false, message: "That role is not on this account." };
  }

  return { ok: true };
}

export async function deleteJobApplicationRow(
  applicationId: string,
): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to remove a saved role." };
  }

  const { data, error } = await context.supabase
    .from("job_applications")
    .delete()
    .eq("user_id", context.userId)
    .eq("id", applicationId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Application delete failed:", error.code);
    return { ok: false, message: "That role could not be removed." };
  }

  if (!data) {
    return { ok: false, message: "That role no longer exists." };
  }

  return { ok: true };
}
