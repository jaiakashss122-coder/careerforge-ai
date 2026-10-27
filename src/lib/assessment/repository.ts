import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TECHNICAL_SECTIONS,
  type AssessmentEvaluation,
  type AssessmentRecord,
  type AssessmentSection,
  type AssessmentSummary,
  type AssessmentType,
  type StoredAnswer,
} from "@/lib/assessment/types";
import type {
  AssessmentAnswerInsert,
  AssessmentAnswerRow,
  Database,
  Json,
  SkillAssessmentRow,
} from "@/lib/supabase/database.types";
import { createId } from "@/lib/id";
import { getAuthenticatedContext } from "@/lib/workspace/server";

const SECTION_VALUES = new Set<string>([
  ...TECHNICAL_SECTIONS.map((section) => section.id),
  "career",
  "constraints",
]);

const QUESTION_TYPES = new Set<string>([
  "multiple_choice",
  "short_answer",
  "code",
  "self_report",
  "preference",
]);

const ASSESSMENT_TYPES = new Set<string>([
  "initial",
  "retake",
  "checkpoint",
]);

function asAssessmentType(value: string): AssessmentType {
  return ASSESSMENT_TYPES.has(value) ? (value as AssessmentType) : "retake";
}

function asSection(value: string): AssessmentSection {
  return SECTION_VALUES.has(value)
    ? (value as AssessmentSection)
    : "programming";
}

function asQuestionType(value: string): StoredAnswer["questionType"] {
  return QUESTION_TYPES.has(value)
    ? (value as StoredAnswer["questionType"])
    : "multiple_choice";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseSummary(value: Json): AssessmentSummary | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.sections) ||
    !isRecord(value.overall) ||
    !Array.isArray(value.careerRecommendations) ||
    !isRecord(value.constraints)
  ) {
    return null;
  }

  return value as unknown as AssessmentSummary;
}

function responseValue(value: Json) {
  if (isRecord(value)) {
    return {
      value: typeof value.value === "string" ? value.value : "",
      label:
        typeof value.label === "string"
          ? value.label
          : typeof value.value === "string"
            ? value.value
            : "",
    };
  }

  return {
    value: typeof value === "string" ? value : "",
    label: typeof value === "string" ? value : "",
  };
}

export function assessmentAnswerRowToStoredAnswer(
  row: AssessmentAnswerRow,
): StoredAnswer {
  const response = responseValue(row.response);

  return {
    section: asSection(row.section),
    questionKey: row.question_key,
    questionType: asQuestionType(row.question_type),
    promptText: row.prompt_text,
    responseValue: response.value,
    responseLabel: response.label,
    isCorrect: row.is_correct,
    score: row.score,
    maxScore: row.max_score,
    selfConfidence: row.self_confidence,
    concept: row.concept,
    feedback: row.feedback,
    remedialLessonSlug: row.remedial_lesson_slug,
  };
}

export function assessmentRowToRecord(
  row: SkillAssessmentRow,
  answers: StoredAnswer[],
): AssessmentRecord | null {
  const summary = parseSummary(row.summary);
  if (!summary) return null;
  const completedAt = row.completed_at ?? row.started_at;

  return {
    id: row.id,
    type: asAssessmentType(row.assessment_type),
    overallScore: Number(row.overall_score ?? 0),
    maxScore: Number(row.max_score ?? 0),
    confidenceAverage: Number(row.confidence_average ?? 0),
    summary,
    answers,
    startedAt: row.started_at,
    completedAt,
    createdAt: row.created_at,
  };
}

async function loadAnswers(
  supabase: SupabaseClient<Database>,
  assessmentIds: string[],
) {
  const grouped = new Map<string, StoredAnswer[]>();
  if (assessmentIds.length === 0) return grouped;

  const { data, error } = await supabase
    .from("assessment_answers")
    .select("*")
    .in("assessment_id", assessmentIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Assessment answers lookup failed:", error.code);
    throw new Error("Assessment answers could not be loaded.");
  }

  for (const row of data ?? []) {
    const list = grouped.get(row.assessment_id) ?? [];
    list.push(assessmentAnswerRowToStoredAnswer(row));
    grouped.set(row.assessment_id, list);
  }

  return grouped;
}

export async function getLatestAssessmentRecord(): Promise<AssessmentRecord | null> {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("skill_assessments")
    .select("*")
    .eq("user_id", context.userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Assessment lookup failed:", error.code);
    throw new Error("Your latest assessment could not be loaded.");
  }
  if (!data) return null;

  const answers = await loadAnswers(context.supabase, [data.id]);
  return assessmentRowToRecord(data, answers.get(data.id) ?? []);
}

export async function getAssessmentRecordById(
  id: string,
): Promise<AssessmentRecord | null> {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("skill_assessments")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .eq("status", "completed")
    .maybeSingle();

  if (error) {
    console.error("Assessment lookup failed:", error.code);
    throw new Error("That assessment could not be loaded.");
  }
  if (!data) return null;

  const answers = await loadAnswers(context.supabase, [data.id]);
  return assessmentRowToRecord(data, answers.get(data.id) ?? []);
}

export async function listAssessmentRecords({
  includeAnswers,
}: {
  includeAnswers: boolean;
}): Promise<AssessmentRecord[]> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("skill_assessments")
    .select("*")
    .eq("user_id", context.userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Assessment history lookup failed:", error.code);
    throw new Error("Your assessment history could not be loaded.");
  }

  const rows = data ?? [];
  const answers = includeAnswers
    ? await loadAnswers(
        context.supabase,
        rows.map((row) => row.id),
      )
    : new Map<string, StoredAnswer[]>();

  return rows
    .map((row) => assessmentRowToRecord(row, answers.get(row.id) ?? []))
    .filter((record): record is AssessmentRecord => Boolean(record));
}

export async function countAssessments() {
  const context = await getAuthenticatedContext();
  if (!context) return 0;

  const { count, error } = await context.supabase
    .from("skill_assessments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .eq("status", "completed");

  if (error) {
    console.error("Assessment count failed:", error.code);
    return 0;
  }
  return count ?? 0;
}

export async function insertAssessmentRecord({
  supabase,
  userId,
  id,
  evaluation,
  type,
  startedAt,
  completedAt,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  id?: string;
  evaluation: AssessmentEvaluation;
  type: AssessmentType;
  startedAt: string;
  completedAt: string;
}): Promise<AssessmentRecord> {
  const assessmentId = id ?? createId();

  const { error: assessmentError } = await supabase
    .from("skill_assessments")
    .insert({
      id: assessmentId,
      user_id: userId,
      assessment_type: type,
      status: "completed",
      overall_score: evaluation.overallScore,
      max_score: evaluation.maxScore,
      confidence_average: evaluation.confidenceAverage,
      summary: evaluation.summary as unknown as Json,
      started_at: startedAt,
      completed_at: completedAt,
    });

  if (assessmentError) {
    console.error("Assessment insert failed:", assessmentError.code);
    throw new Error("Your assessment could not be saved.");
  }

  const answers: AssessmentAnswerInsert[] = evaluation.usedAnswers.map(
    (answer) => ({
      assessment_id: assessmentId,
      section: answer.section,
      question_key: answer.questionKey,
      question_type: answer.questionType,
      prompt_text: answer.promptText,
      response: {
        value: answer.responseValue,
        label: answer.responseLabel,
      },
      is_correct: answer.isCorrect,
      score: answer.score,
      max_score: answer.maxScore,
      self_confidence: answer.selfConfidence,
      concept: answer.concept,
      feedback: answer.feedback,
      remedial_lesson_slug: answer.remedialLessonSlug,
    }),
  );

  const { error: answersError } = await supabase
    .from("assessment_answers")
    .insert(answers);

  if (answersError) {
    console.error("Assessment answers insert failed:", answersError.code);
    await supabase
      .from("skill_assessments")
      .delete()
      .eq("id", assessmentId)
      .eq("user_id", userId);
    throw new Error("Your assessment answers could not be saved.");
  }

  return {
    id: assessmentId,
    type,
    overallScore: evaluation.overallScore,
    maxScore: evaluation.maxScore,
    confidenceAverage: evaluation.confidenceAverage,
    summary: evaluation.summary,
    answers: evaluation.usedAnswers,
    startedAt,
    completedAt,
    createdAt: completedAt,
  };
}
