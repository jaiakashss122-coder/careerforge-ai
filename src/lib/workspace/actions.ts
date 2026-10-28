"use server";

import { revalidatePath } from "next/cache";
import { createAssessmentRecord } from "@/lib/assessment/record";
import {
  countAssessments,
  getAssessmentRecordById,
  insertAssessmentRecord,
} from "@/lib/assessment/repository";
import { evaluateAssessment } from "@/lib/assessment/engine";
import type {
  AssessmentAnswers,
  AssessmentType,
} from "@/lib/assessment/types";
import { isCareerTrackSlug, type CareerTrackSlug } from "@/lib/career/tracks";
import { createId } from "@/lib/id";
import { getCurrentProfile } from "@/lib/profile/repository";
import { generateRoadmap } from "@/lib/roadmap/generate";
import { createInitialRoadmap } from "@/lib/roadmap/initial";
import {
  getActiveRoadmapRecord,
  getCompletedDependents,
  getUnmetPrerequisites,
  insertRoadmapPlan,
  loadOwnedTaskContext,
  refreshRoadmapSummaryPercent,
  updateTaskRow,
} from "@/lib/roadmap/repository";
import {
  finishActiveSession,
  getActiveSessionById,
  getActiveSessionRecord,
  insertActiveSession,
} from "@/lib/sessions/repository";
import {
  isSessionPreset,
  SESSION_MODE_VALUES,
  type SessionMode,
} from "@/lib/sessions/types";
import { getAuthenticatedContext } from "@/lib/workspace/server";
import {
  DELETION_SCOPES,
  deleteOwnedRows,
} from "@/lib/workspace/deletion";
import {
  ACCOUNT_USER_ID_TABLES,
  LEARNING_DATA_TABLES,
} from "@/lib/workspace/tables";
import type {
  CreateRoadmapResult,
  DeleteAccountResult,
  DeleteLearningDataResult,
  StartSessionResult,
  SubmitAssessmentResult,
  WorkspaceActionResult,
} from "@/lib/workspace/action-types";

const MAX_ANSWER_LENGTH = 500;
const MAX_NOTES_LENGTH = 500;
const MAX_ASSESSMENT_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function revalidateWorkspace() {
  for (const path of [
    "/dashboard",
    "/roadmap",
    "/assessment",
    "/settings",
    "/projects",
    "/progress",
    "/careers",
    "/interview",
  ]) {
    revalidatePath(path);
  }
}

function normalizeAnswers(value: unknown): AssessmentAnswers | null {
  if (!isRecord(value)) return null;

  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > 100) return null;

  const answers: AssessmentAnswers = {};
  for (const [key, answer] of entries) {
    if (
      typeof key !== "string" ||
      key.length > 120 ||
      typeof answer !== "string" ||
      answer.length > MAX_ANSWER_LENGTH
    ) {
      return null;
    }
    answers[key] = answer;
  }

  return answers;
}

function normalizeStartedAt(value: unknown, now: Date) {
  if (typeof value !== "string") return now.toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return now.toISOString();

  const age = now.getTime() - parsed.getTime();
  if (age < -FUTURE_SKEW_MS || age > MAX_ASSESSMENT_AGE_MS) {
    return now.toISOString();
  }

  return parsed.toISOString();
}

function normalizeNotes(value: unknown) {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_NOTES_LENGTH)
    : "";
}

function normalizeWeek(value: unknown) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 13
    ? value
    : null;
}

export async function submitAssessmentAction(input: {
  answers: unknown;
  startedAt?: unknown;
}): Promise<SubmitAssessmentResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return {
      ok: false,
      message:
        "Saving an assessment requires a signed-in Supabase account. Preview mode stores results in this browser instead.",
    };
  }

  const answers = normalizeAnswers(input.answers);
  if (!answers) {
    return {
      ok: false,
      message: "The submitted answers were not readable. Reload and try again.",
    };
  }

  const profile = await getCurrentProfile();
  const outcome = evaluateAssessment(answers, profile);

  if (!outcome.ok) {
    return {
      ok: false,
      message: outcome.message,
      missingKeys: outcome.missingKeys,
      invalidKeys: outcome.invalidKeys,
    };
  }

  const now = new Date();
  const startedAt = normalizeStartedAt(input.startedAt, now);
  const completedAt = now.toISOString();
  const previousCount = await countAssessments();
  const type: AssessmentType = previousCount > 0 ? "retake" : "initial";
  const record = createAssessmentRecord({
    type,
    evaluation: outcome.evaluation,
    startedAt,
    completedAt,
  });

  try {
    const saved = await insertAssessmentRecord({
      supabase: context.supabase,
      userId: context.userId,
      id: record.id,
      evaluation: outcome.evaluation,
      type,
      startedAt,
      completedAt,
    });

    let initialRoadmapId: string | null = null;
    let roadmapNotice: string | null = null;

    if (type === "initial") {
      const active = await getActiveRoadmapRecord();
      if (!active) {
        const roadmap = createInitialRoadmap({
          assessmentId: saved.id,
          summary: saved.summary,
          weeklyHours: saved.summary.constraints.weeklyHours,
          now: completedAt,
        });

        const inserted = await insertRoadmapPlan(roadmap);

        if (inserted.ok) {
          initialRoadmapId = roadmap.id;
        } else {
          roadmapNotice = `${inserted.message} You can build it again from the results page.`;
        }
      }
    }

    revalidateWorkspace();

    return {
      ok: true,
      record: saved,
      initialRoadmapId,
      roadmapNotice,
    };
  } catch (error) {
    console.error(
      "Assessment submission failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Your assessment could not be saved. Try again.",
    };
  }
}

export async function createRoadmapAction(input: {
  assessmentId: unknown;
  focusTracks: unknown;
  weeklyHours?: unknown;
  startDate?: unknown;
  replaceExisting?: unknown;
}): Promise<CreateRoadmapResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return {
      ok: false,
      message:
        "Roadmaps require a signed-in Supabase account. Preview mode builds plans in this browser.",
    };
  }

  if (typeof input.assessmentId !== "string") {
    return { ok: false, message: "Choose a completed assessment first." };
  }

  const tracks = Array.isArray(input.focusTracks)
    ? Array.from(
        new Set(input.focusTracks.filter(isCareerTrackSlug)),
      )
    : [];

  if (tracks.length !== 2) {
    return {
      ok: false,
      message: "Choose exactly two different career tracks to test.",
    };
  }

  const assessment = await getAssessmentRecordById(input.assessmentId);
  if (!assessment) {
    return {
      ok: false,
      message: "That assessment is not available on this account.",
    };
  }

  const active = await getActiveRoadmapRecord();
  if (active && input.replaceExisting !== true) {
    return {
      ok: false,
      message:
        "You already have an active roadmap. Confirm that replacing it is intentional.",
    };
  }

  const weeklyHours =
    typeof input.weeklyHours === "number" &&
    Number.isFinite(input.weeklyHours)
      ? input.weeklyHours
      : assessment.summary.constraints.weeklyHours;

  const startDate =
    typeof input.startDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.startDate)
      ? input.startDate
      : new Date().toISOString().slice(0, 10);

  let roadmap;
  try {
    roadmap = generateRoadmap({
      roadmapId: createId(),
      assessmentId: assessment.id,
      summary: assessment.summary,
      focusTracks: tracks as [CareerTrackSlug, CareerTrackSlug],
      weeklyHours,
      startDate,
      idFactory: createId,
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The roadmap could not be generated.",
    };
  }

  const inserted = await insertRoadmapPlan(roadmap);
  if (!inserted.ok) {
    return { ok: false, message: inserted.message };
  }

  revalidateWorkspace();
  return { ok: true, roadmap };
}

export async function setTaskCompletionAction(
  taskId: unknown,
  completed: unknown,
): Promise<WorkspaceActionResult> {
  if (typeof taskId !== "string" || typeof completed !== "boolean") {
    return { ok: false, message: "The task update was not readable." };
  }

  const own = await loadOwnedTaskContext(taskId);
  if (!own) {
    return { ok: false, message: "That task is not available on this account." };
  }
  if (own.roadmap.status !== "active") {
    return {
      ok: false,
      message: "Only tasks in your active roadmap can be changed.",
    };
  }

  if (completed) {
    const prerequisiteCheck = await getUnmetPrerequisites(taskId);
    if (prerequisiteCheck.hasMissing) {
      return {
        ok: false,
        message:
          "This task's prerequisites could not be verified, so it was not marked complete.",
      };
    }
    if (prerequisiteCheck.unmet.length > 0) {
      const names = prerequisiteCheck.unmet
        .slice(0, 3)
        .map((task) => task.title)
        .join(", ");
      return {
        ok: false,
        message: `Finish ${names} before completing this task.`,
      };
    }
  } else {
    if (own.task.status !== "completed") {
      return { ok: false, message: "Only completed tasks can be reopened." };
    }
    const dependents = await getCompletedDependents(taskId);
    if (dependents.hasMissing) {
      return {
        ok: false,
        message:
          "Dependent tasks could not be verified, so this task was left completed.",
      };
    }
    if (dependents.dependents.length > 0) {
      return {
        ok: false,
        message: `Reopen ${dependents.dependents
          .slice(0, 3)
          .map((task) => task.title)
          .join(", ")} first. A later completed task depends on this one.`,
      };
    }
  }

  const result = await updateTaskRow({
    taskId,
    roadmapId: own.roadmap.id,
    changes: {
      status: completed ? "completed" : "pending",
      completed_at: completed ? new Date().toISOString() : null,
    },
  });

  if (!result.ok) return result;

  await refreshRoadmapSummaryPercent(own.roadmap.id);
  revalidateWorkspace();
  return { ok: true };
}

export async function rescheduleTaskAction(
  taskId: unknown,
  weekNumber: unknown,
): Promise<WorkspaceActionResult> {
  if (typeof taskId !== "string") {
    return { ok: false, message: "The task update was not readable." };
  }

  const week = normalizeWeek(weekNumber);
  if (week === null) {
    return {
      ok: false,
      message: "Choose a week between 1 and 13.",
    };
  }

  const own = await loadOwnedTaskContext(taskId);
  if (!own) {
    return { ok: false, message: "That task is not available on this account." };
  }
  if (own.roadmap.status !== "active") {
    return {
      ok: false,
      message: "Only tasks in your active roadmap can be rescheduled.",
    };
  }
  if (own.task.status === "completed") {
    return { ok: false, message: "Completed tasks cannot be rescheduled." };
  }

  const result = await updateTaskRow({
    taskId,
    roadmapId: own.roadmap.id,
    changes: { week_number: week, status: "pending" },
  });

  if (!result.ok) return result;

  revalidateWorkspace();
  return {
    ok: true,
    message: `Moved to week ${week}. Your progress was not reset.`,
  };
}

export async function startSessionAction(input: {
  taskId: unknown;
  mode: unknown;
  plannedMinutes: unknown;
}): Promise<StartSessionResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return {
      ok: false,
      message: "Sessions require a signed-in Supabase account.",
    };
  }

  if (typeof input.taskId !== "string") {
    return { ok: false, message: "Choose a task before starting a session." };
  }

  const mode =
    typeof input.mode === "string" &&
    SESSION_MODE_VALUES.includes(input.mode as SessionMode)
      ? (input.mode as SessionMode)
      : null;
  const minutes =
    typeof input.plannedMinutes === "number" ? input.plannedMinutes : NaN;

  if (!mode || !isSessionPreset(mode, minutes)) {
    return { ok: false, message: "Choose a supported session length." };
  }

  const active = await getActiveSessionRecord();
  if (active) {
    return {
      ok: false,
      message:
        "A study session is already active. Finish or abandon it before starting another.",
    };
  }

  const own = await loadOwnedTaskContext(input.taskId);
  if (!own) {
    return {
      ok: false,
      message: "That task is not available on this account.",
    };
  }
  if (own.roadmap.status !== "active") {
    return {
      ok: false,
      message: "Start sessions from a task in your active roadmap.",
    };
  }
  if (own.task.status === "completed") {
    return { ok: false, message: "That task is already completed." };
  }

  const prerequisites = await getUnmetPrerequisites(input.taskId);
  if (prerequisites.hasMissing || prerequisites.unmet.length > 0) {
    return {
      ok: false,
      message:
        "Finish this task's prerequisites before starting a session.",
    };
  }

  const inserted = await insertActiveSession({
    taskId: input.taskId,
    mode,
    plannedMinutes: minutes,
  });
  if (!inserted.ok) return inserted;

  if (own.task.status !== "in_progress") {
    await updateTaskRow({
      taskId: input.taskId,
      roadmapId: own.roadmap.id,
      changes: { status: "in_progress" },
    });
  }

  revalidateWorkspace();
  return { ok: true, session: inserted.session };
}

export async function endSessionAction(input: {
  sessionId: unknown;
  outcome: unknown;
  notes?: unknown;
}): Promise<WorkspaceActionResult> {
  if (typeof input.sessionId !== "string") {
    return { ok: false, message: "The session update was not readable." };
  }

  const outcome =
    input.outcome === "completed" || input.outcome === "abandoned"
      ? input.outcome
      : null;

  if (!outcome) {
    return { ok: false, message: "Choose whether the session was completed." };
  }

  const session = await getActiveSessionById(input.sessionId);
  if (!session) {
    return {
      ok: false,
      message: "That session is not active on this account.",
    };
  }

  const endedAt = new Date();
  const elapsedMinutes = Math.max(
    0,
    Math.round(
      (endedAt.getTime() - new Date(session.startedAt).getTime()) / 60000,
    ),
  );

  const result = await finishActiveSession({
    sessionId: session.id,
    outcome,
    notes: normalizeNotes(input.notes),
    endedAt: endedAt.toISOString(),
    actualMinutes: elapsedMinutes,
  });

  if (!result.ok) return result;

  revalidateWorkspace();
  return {
    ok: true,
    message:
      outcome === "completed"
        ? `${elapsedMinutes} minutes recorded from this session.`
        : "Session closed without counting toward your study time.",
  };
}

export async function deleteLearningDataAction(
  confirmation: unknown,
): Promise<DeleteLearningDataResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: DELETION_SCOPES.learning.requiresAccount };
  }

  if (confirmation !== DELETION_SCOPES.learning.confirmWord) {
    return { ok: false, message: DELETION_SCOPES.learning.wrongPhrase };
  }

  const { supabase, userId } = context;

  const outcome = await deleteOwnedRows(
    LEARNING_DATA_TABLES,
    async (table) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("user_id", userId);

      if (!error) return false;
      console.error(`Learning data delete failed (${table}):`, error.code);
      return true;
    },
  );

  if (!outcome.ok) {
    return {
      ok: false,
      message: DELETION_SCOPES.learning.stoppedAt(outcome.stoppedAt),
    };
  }

  revalidateWorkspace();
  revalidatePath("/tutor");
  revalidatePath("/prompts");
  return {
    ok: true,
    message:
      "Assessment results, roadmaps, study sessions, projects with their milestones, skill evidence, career experiments with your reflections, your recorded specialization choice, practice interviews with every written answer, saved roles with their pasted posting text, the wording you saved for your résumé, LinkedIn and portfolio, tutor conversations, and saved prompts were deleted. Your profile and account were kept.",
  };
}

/**
 * Removes every row this account owns, then stops. The sign-in itself lives in
 * the authentication service rather than in any table this app can write, and
 * reaching it would need a service-role key — which this project never holds.
 * So the honest boundary is stated instead of crossed, and the one step left is
 * handed to the learner with their own id filled in.
 */
export async function deleteAccountAction(
  confirmation: unknown,
): Promise<DeleteAccountResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: DELETION_SCOPES.account.requiresAccount };
  }

  if (confirmation !== DELETION_SCOPES.account.confirmWord) {
    return { ok: false, message: DELETION_SCOPES.account.wrongPhrase };
  }

  const { supabase, userId } = context;

  const outcome = await deleteOwnedRows(
    ACCOUNT_USER_ID_TABLES,
    async (table) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("user_id", userId);

      if (!error) return false;
      console.error(`Account closure failed (${table}):`, error.code);
      return true;
    },
  );

  if (!outcome.ok) {
    return {
      ok: false,
      message: DELETION_SCOPES.account.stoppedAt(outcome.stoppedAt),
    };
  }

  // Last, because every screen that is not this one sends a signed-in account
  // without a profile to onboarding, and a half-deleted account should not look
  // like a brand-new one.
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("Account closure failed (profiles):", profileError.code);
    return {
      ok: false,
      message:
        "Your records were deleted but the profile row could not be. Nothing signed you out; retry to finish closing the account.",
    };
  }

  revalidateWorkspace();
  revalidatePath("/tutor");
  revalidatePath("/prompts");
  revalidatePath("/settings");

  return {
    ok: true,
    userId,
    message:
      "Every record this account owned is deleted: your profile, assessments with their answers, roadmaps with their tasks, study sessions, projects with their milestones and links, skill evidence, career experiments with your reflections, your specialization choice, practice interviews with every written answer, saved roles with their posting text, the wording you saved for each application document, tutor conversations, saved prompts and the AI usage counters. You are still signed in, because signing out is the step you should take with the result below in front of you.",
  };
}

