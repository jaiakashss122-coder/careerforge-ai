import {
  SESSION_MODE_VALUES,
  type LearningSessionRecord,
  type SessionMode,
  type SessionStatus,
} from "@/lib/sessions/types";
import type { LearningSessionRow } from "@/lib/supabase/database.types";
import { getAuthenticatedContext } from "@/lib/workspace/server";

const SESSION_STATUSES = new Set<string>(["active", "completed", "abandoned"]);

function asSessionMode(value: string): SessionMode {
  return SESSION_MODE_VALUES.includes(value as SessionMode)
    ? (value as SessionMode)
    : "focused";
}

function asSessionStatus(value: string): SessionStatus {
  return SESSION_STATUSES.has(value)
    ? (value as SessionStatus)
    : "abandoned";
}

function sessionRowToRecord(row: LearningSessionRow): LearningSessionRecord {
  return {
    id: row.id,
    taskId: row.roadmap_task_id,
    mode: asSessionMode(row.mode),
    status: asSessionStatus(row.status),
    plannedMinutes: row.planned_minutes ?? 45,
    actualMinutes: row.actual_minutes,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listSessionRecords(limit = 100) {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("learning_sessions")
    .select("*")
    .eq("user_id", context.userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Session history lookup failed:", error.code);
    throw new Error("Your study sessions could not be loaded.");
  }

  return (data ?? []).map(sessionRowToRecord);
}

export async function getActiveSessionRecord() {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("learning_sessions")
    .select("*")
    .eq("user_id", context.userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Active session lookup failed:", error.code);
    return null;
  }

  return data ? sessionRowToRecord(data) : null;
}

export async function getActiveSessionById(sessionId: string) {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("learning_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", context.userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Session lookup failed:", error.code);
    return null;
  }

  return data ? sessionRowToRecord(data) : null;
}

export async function insertActiveSession({
  taskId,
  mode,
  plannedMinutes,
}: {
  taskId: string;
  mode: SessionMode;
  plannedMinutes: number;
}): Promise<
  { ok: true; session: LearningSessionRecord } | { ok: false; message: string }
> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to start a study session." };
  }

  const { data, error } = await context.supabase
    .from("learning_sessions")
    .insert({
      user_id: context.userId,
      roadmap_task_id: taskId,
      mode,
      status: "active",
      planned_minutes: plannedMinutes,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("Session insert failed:", error?.code);
    return {
      ok: false,
      message: "The session could not be started. Reload and try again.",
    };
  }

  return { ok: true, session: sessionRowToRecord(data) };
}

export async function finishActiveSession({
  sessionId,
  outcome,
  notes,
  endedAt,
  actualMinutes,
}: {
  sessionId: string;
  outcome: "completed" | "abandoned";
  notes: string;
  endedAt: string;
  actualMinutes: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to finish a study session." };
  }

  const { data, error } = await context.supabase
    .from("learning_sessions")
    .update({
      status: outcome,
      ended_at: endedAt,
      actual_minutes: actualMinutes,
      notes,
    })
    .eq("id", sessionId)
    .eq("user_id", context.userId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Session update failed:", error.code);
    return {
      ok: false,
      message: "The session could not be closed. Reload and try again.",
    };
  }
  if (!data) {
    return { ok: false, message: "That session is no longer active." };
  }

  return { ok: true };
}
