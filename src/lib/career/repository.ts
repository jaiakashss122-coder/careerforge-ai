import type {
  CareerExperimentDefinition,
  CareerExperimentKind,
} from "@/lib/career/experiments";
import { isCareerTrackSlug, type CareerTrackSlug } from "@/lib/career/tracks";
import {
  isCareerExperimentStatus,
  isReflectionRating,
  type CareerExperimentEvidence,
  type CareerExperimentRecord,
  type CareerExperimentReflection,
  type CareerPreferenceRecord,
} from "@/lib/career/types";
import { getAuthenticatedContext } from "@/lib/workspace/server";
import type {
  CareerExperimentRow,
  CareerPreferenceRow,
  Json,
} from "@/lib/supabase/database.types";

function parseEvidence(value: Json): CareerExperimentEvidence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;

  if (record.version !== 1) return null;
  if (typeof record.kindSlug !== "string") return null;
  if (typeof record.outputUrl !== "string") return null;

  return {
    version: 1,
    kindSlug: record.kindSlug,
    outputUrl: record.outputUrl,
  };
}

function parseReflection(
  row: CareerExperimentRow,
): CareerExperimentReflection | null {
  const ratings = [
    row.interest_rating,
    row.difficulty_rating,
    row.enjoyment_rating,
    row.willingness_rating,
  ];

  if (!ratings.every(isReflectionRating)) return null;

  return {
    interest: row.interest_rating as number,
    difficulty: row.difficulty_rating as number,
    enjoyment: row.enjoyment_rating as number,
    willingness: row.willingness_rating as number,
  };
}

function experimentRowToRecord(row: CareerExperimentRow): CareerExperimentRecord | null {
  if (!isCareerTrackSlug(row.career_slug)) return null;

  const evidence = parseEvidence(row.evidence);

  return {
    id: row.id,
    careerSlug: row.career_slug,
    title: row.title,
    brief: row.brief,
    status: isCareerExperimentStatus(row.status) ? row.status : "in_progress",
    reflection: parseReflection(row),
    reflectionText: row.reflection,
    outputUrl: evidence?.outputUrl ? evidence.outputUrl : null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function preferenceRowToRecord(
  row: CareerPreferenceRow,
): CareerPreferenceRecord {
  return {
    id: row.id,
    specializationChoice: isCareerTrackSlug(row.specialization_choice ?? "")
      ? (row.specialization_choice as CareerTrackSlug)
      : null,
    alternativeChoice: isCareerTrackSlug(row.alternative_choice ?? "")
      ? (row.alternative_choice as CareerTrackSlug)
      : null,
    overrideReason: row.override_reason ?? "",
    updatedAt: row.updated_at,
  };
}

export async function listCareerExperimentRecords(): Promise<
  CareerExperimentRecord[]
> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("career_experiments")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Career experiment lookup failed:", error.code);
    throw new Error("Your career experiments could not be loaded.");
  }

  return (data ?? []).flatMap((row) => {
    const record = experimentRowToRecord(row);
    return record ? [record] : [];
  });
}

export async function insertCareerExperimentRow({
  definition,
  kind,
}: {
  definition: CareerExperimentDefinition;
  kind: CareerExperimentKind;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to run a career experiment." };
  }

  const { data, error } = await context.supabase
    .from("career_experiments")
    .insert({
      user_id: context.userId,
      career_slug: definition.careerSlug,
      title: definition.title,
      brief: definition.brief,
      status: "in_progress",
      started_at: new Date().toISOString(),
      evidence: { version: 1, kindSlug: kind, outputUrl: "" },
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Career experiment insert failed:", error.code);

    if (error.code === "23505") {
      return {
        ok: false,
        message: "You already have this experiment. Finish it instead of starting another copy.",
      };
    }

    return { ok: false, message: "The experiment could not be started." };
  }

  if (!data) {
    return { ok: false, message: "The experiment could not be started." };
  }

  return { ok: true, id: data.id };
}

export async function completeCareerExperimentRow({
  careerSlug,
  kind,
  reflection,
  reflectionText,
  outputUrl,
}: {
  careerSlug: CareerTrackSlug;
  kind: CareerExperimentKind;
  reflection: CareerExperimentReflection;
  reflectionText: string;
  outputUrl: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to record a career experiment." };
  }

  const now = new Date().toISOString();

  const { data, error } = await context.supabase
    .from("career_experiments")
    .update({
      status: "completed",
      interest_rating: reflection.interest,
      difficulty_rating: reflection.difficulty,
      enjoyment_rating: reflection.enjoyment,
      willingness_rating: reflection.willingness,
      reflection: reflectionText,
      completed_at: now,
      evidence: { version: 1, kindSlug: kind, outputUrl },
    })
    .eq("user_id", context.userId)
    .eq("career_slug", careerSlug)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Career experiment update failed:", error.code);
    return { ok: false, message: "The experiment could not be finished." };
  }

  if (!data) {
    return {
      ok: false,
      message: "Start the experiment first, so the date you began it stays honest.",
    };
  }

  return { ok: true };
}

export async function deleteCareerExperimentRow(
  careerSlug: CareerTrackSlug,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to change your career experiments." };
  }

  const { data, error } = await context.supabase
    .from("career_experiments")
    .delete()
    .eq("user_id", context.userId)
    .eq("career_slug", careerSlug)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Career experiment delete failed:", error.code);
    return { ok: false, message: "That experiment result could not be cleared." };
  }

  if (!data) {
    return { ok: false, message: "That experiment result no longer exists." };
  }

  return { ok: true };
}

export async function getCareerPreferenceRecord(): Promise<CareerPreferenceRecord | null> {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("career_preferences")
    .select("*")
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) {
    console.error("Career preference lookup failed:", error.code);
    return null;
  }

  return data ? preferenceRowToRecord(data) : null;
}

export async function saveCareerPreferenceRow({
  specialization,
  alternative,
  reason,
}: {
  specialization: CareerTrackSlug;
  alternative: CareerTrackSlug;
  reason: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to record your own choice." };
  }

  const { error } = await context.supabase
    .from("career_preferences")
    .upsert(
      {
        user_id: context.userId,
        specialization_choice: specialization,
        alternative_choice: alternative,
        override_reason: reason,
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Career preference save failed:", error.code);
    return { ok: false, message: "Your choice could not be saved." };
  }

  return { ok: true };
}

export async function deleteCareerPreferenceRow(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to change your recorded choice." };
  }

  const { error } = await context.supabase
    .from("career_preferences")
    .delete()
    .eq("user_id", context.userId);

  if (error) {
    console.error("Career preference delete failed:", error.code);
    return { ok: false, message: "Your recorded choice could not be removed." };
  }

  return { ok: true };
}
