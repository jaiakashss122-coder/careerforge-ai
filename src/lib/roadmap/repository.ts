import type { SupabaseClient } from "@supabase/supabase-js";
import { isCareerTrackSlug, type CareerTrackSlug } from "@/lib/career/tracks";
import {
  ROADMAP_TASK_CATEGORIES,
  type LearningRoadmap,
  type RoadmapLink,
  type RoadmapResources,
  type RoadmapSessionPlan,
  type RoadmapSummary,
  type RoadmapTask,
  type RoadmapTaskCategory,
  type RoadmapTaskStatus,
} from "@/lib/roadmap/types";
import type {
  Database,
  Json,
  LearningRoadmapRow,
  RoadmapPrerequisiteRow,
  RoadmapTaskRow,
} from "@/lib/supabase/database.types";
import { getTaskCompletionPercent } from "@/lib/workspace/progress";
import { getAuthenticatedContext } from "@/lib/workspace/server";

const TASK_STATUSES = new Set<string>([
  "pending",
  "in_progress",
  "completed",
  "skipped",
  "rescheduled",
]);

const EMPTY_SESSION_PLAN: RoadmapSessionPlan = {
  learn: [],
  exercise: "",
  check: [],
  revision: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asTaskCategory(value: string): RoadmapTaskCategory {
  return ROADMAP_TASK_CATEGORIES.includes(value as RoadmapTaskCategory)
    ? (value as RoadmapTaskCategory)
    : "learning";
}

function asTaskStatus(value: string): RoadmapTaskStatus {
  return TASK_STATUSES.has(value)
    ? (value as RoadmapTaskStatus)
    : "pending";
}

function parseSummary(value: Json): RoadmapSummary | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.weeks) ||
    !Array.isArray(value.thirtyDayPlan) ||
    !isRecord(value.constraints)
  ) {
    return null;
  }
  return value as unknown as RoadmapSummary;
}

function parseResources(value: Json): RoadmapResources {
  if (!isRecord(value)) {
    return { sessionPlan: EMPTY_SESSION_PLAN, links: [] };
  }

  const sessionPlan = isRecord(value.sessionPlan)
    ? {
        learn: Array.isArray(value.sessionPlan.learn)
          ? value.sessionPlan.learn.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
        exercise:
          typeof value.sessionPlan.exercise === "string"
            ? value.sessionPlan.exercise
            : "",
        check: Array.isArray(value.sessionPlan.check)
          ? (value.sessionPlan.check as RoadmapSessionPlan["check"])
          : [],
        revision:
          typeof value.sessionPlan.revision === "string"
            ? value.sessionPlan.revision
            : "",
      }
    : EMPTY_SESSION_PLAN;

  const links = Array.isArray(value.links)
    ? value.links.filter(
        (link): link is RoadmapLink =>
          isRecord(link) &&
          typeof link.label === "string" &&
          typeof link.href === "string" &&
          (link.kind === "docs" ||
            link.kind === "practice" ||
            link.kind === "reference"),
      )
    : [];

  return {
    sessionPlan,
    links,
    focus:
      value.focus === "foundation" ||
      value.focus === "standard" ||
      value.focus === "refresh"
        ? value.focus
        : undefined,
    assessmentGap:
      typeof value.assessmentGap === "string"
        ? value.assessmentGap
        : undefined,
  };
}

function roadmapTaskRowToTask(
  row: RoadmapTaskRow,
  prerequisiteIds: string[],
  skillSlugById: Map<string, string>,
): RoadmapTask {
  return {
    id: row.id,
    weekNumber: row.week_number,
    orderIndex: row.order_index,
    title: row.title,
    description: row.description,
    category: asTaskCategory(row.category),
    estimatedMinutes: row.estimated_minutes ?? 60,
    status: asTaskStatus(row.status),
    skillSlug: row.skill_id ? (skillSlugById.get(row.skill_id) ?? null) : null,
    prerequisiteIds,
    resources: parseResources(row.resources),
    completedAt: row.completed_at,
  };
}

function roadmapRowToPlan({
  row,
  taskRows,
  prerequisiteRows,
  skillSlugById,
}: {
  row: LearningRoadmapRow;
  taskRows: RoadmapTaskRow[];
  prerequisiteRows: RoadmapPrerequisiteRow[];
  skillSlugById: Map<string, string>;
}): LearningRoadmap | null {
  const summary = parseSummary(row.summary);
  if (!summary) return null;

  const taskIds = new Set(taskRows.map((task) => task.id));
  const prerequisitesByTask = new Map<string, string[]>();
  for (const link of prerequisiteRows) {
    if (!taskIds.has(link.task_id) || !taskIds.has(link.prerequisite_task_id)) {
      continue;
    }
    const list = prerequisitesByTask.get(link.task_id) ?? [];
    list.push(link.prerequisite_task_id);
    prerequisitesByTask.set(link.task_id, list);
  }

  const tasks = taskRows
    .map((task) =>
      roadmapTaskRowToTask(
        task,
        prerequisitesByTask.get(task.id) ?? [],
        skillSlugById,
      ),
    )
    .sort(
      (a, b) =>
        a.weekNumber - b.weekNumber || a.orderIndex - b.orderIndex,
    );

  const focusTracks = row.focus_tracks.filter(isCareerTrackSlug) as CareerTrackSlug[];

  return {
    id: row.id,
    title: row.title,
    status:
      row.status === "draft" ||
      row.status === "completed" ||
      row.status === "archived"
        ? row.status
        : "active",
    startDate: row.start_date ?? new Date().toISOString().slice(0, 10),
    endDate:
      row.end_date ??
      row.start_date ??
      new Date().toISOString().slice(0, 10),
    focusTracks,
    source:
      row.source === "manual" || row.source === "checkpoint"
        ? row.source
        : "assessment",
    summary: { ...summary, overallPercent: getTaskCompletionPercent(tasks) },
    tasks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadSkillsMap(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("skills")
    .select("id, slug");

  if (error) {
    console.error("Skill lookup failed:", error.code);
    return new Map<string, string>();
  }

  return new Map((data ?? []).map((skill) => [skill.id, skill.slug]));
}

async function loadRoadmapRows(
  supabase: SupabaseClient<Database>,
  roadmapRows: LearningRoadmapRow[],
) {
  const roadmapIds = roadmapRows.map((row) => row.id);
  if (roadmapIds.length === 0) {
    return { taskRows: [], prerequisiteRows: [], skillSlugById: new Map<string, string>() };
  }

  const [{ data: taskRows, error: taskError }, skillSlugById] =
    await Promise.all([
      supabase
        .from("roadmap_tasks")
        .select("*")
        .in("roadmap_id", roadmapIds)
        .order("week_number", { ascending: true })
        .order("order_index", { ascending: true }),
      loadSkillsMap(supabase),
    ]);

  if (taskError) {
    console.error("Roadmap tasks lookup failed:", taskError.code);
    throw new Error("Your roadmap tasks could not be loaded.");
  }

  const taskIds = (taskRows ?? []).map((task) => task.id);
  const { data: prerequisiteRows, error: prerequisiteError } =
    taskIds.length > 0
      ? await supabase
          .from("roadmap_task_prerequisites")
          .select("*")
          .in("task_id", taskIds)
      : { data: [] as RoadmapPrerequisiteRow[], error: null };

  if (prerequisiteError) {
    console.error(
      "Roadmap prerequisites lookup failed:",
      prerequisiteError.code,
    );
    throw new Error("Your roadmap prerequisites could not be loaded.");
  }

  return {
    taskRows: taskRows ?? [],
    prerequisiteRows: prerequisiteRows ?? [],
    skillSlugById,
  };
}

export async function getActiveRoadmapRecord(): Promise<LearningRoadmap | null> {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data: row, error } = await context.supabase
    .from("learning_roadmaps")
    .select("*")
    .eq("user_id", context.userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Roadmap lookup failed:", error.code);
    throw new Error("Your roadmap could not be loaded.");
  }
  if (!row) return null;

  const { taskRows, prerequisiteRows, skillSlugById } =
    await loadRoadmapRows(context.supabase, [row]);

  return roadmapRowToPlan({
    row,
    taskRows: taskRows.filter((task) => task.roadmap_id === row.id),
    prerequisiteRows,
    skillSlugById,
  });
}

export async function getRoadmapRecordById(
  id: string,
): Promise<LearningRoadmap | null> {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data: row, error } = await context.supabase
    .from("learning_roadmaps")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) {
    console.error("Roadmap lookup failed:", error.code);
    throw new Error("That roadmap could not be loaded.");
  }
  if (!row) return null;

  const { taskRows, prerequisiteRows, skillSlugById } =
    await loadRoadmapRows(context.supabase, [row]);

  return roadmapRowToPlan({
    row,
    taskRows: taskRows.filter((task) => task.roadmap_id === row.id),
    prerequisiteRows,
    skillSlugById,
  });
}

export async function listRoadmapRecords(): Promise<LearningRoadmap[]> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data: rows, error } = await context.supabase
    .from("learning_roadmaps")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Roadmap history lookup failed:", error.code);
    throw new Error("Your roadmaps could not be loaded.");
  }
  if (!rows || rows.length === 0) return [];

  const { taskRows, prerequisiteRows, skillSlugById } =
    await loadRoadmapRows(context.supabase, rows);

  return rows
    .map((row) =>
      roadmapRowToPlan({
        row,
        taskRows: taskRows.filter((task) => task.roadmap_id === row.id),
        prerequisiteRows,
        skillSlugById,
      }),
    )
    .filter((roadmap): roadmap is LearningRoadmap => Boolean(roadmap));
}

export async function countRoadmaps() {
  const context = await getAuthenticatedContext();
  if (!context) return 0;

  const { count, error } = await context.supabase
    .from("learning_roadmaps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId);

  if (error) {
    console.error("Roadmap count failed:", error.code);
    return 0;
  }
  return count ?? 0;
}

export async function insertRoadmapPlan(
  roadmap: LearningRoadmap,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return {
      ok: false,
      message: "Roadmaps require a signed-in account.",
    };
  }

  const { supabase, userId } = context;
  const skills = await loadSkillsMap(supabase);
  const skillIdBySlug = new Map(
    Array.from(skills.entries()).map(([id, slug]) => [slug, id]),
  );

  const { error: roadmapError } = await supabase
    .from("learning_roadmaps")
    .insert({
      id: roadmap.id,
      user_id: userId,
      title: roadmap.title,
      status: "draft",
      start_date: roadmap.startDate,
      end_date: roadmap.endDate,
      focus_tracks: roadmap.focusTracks,
      source: roadmap.source,
      summary: roadmap.summary as unknown as Json,
    });

  if (roadmapError) {
    console.error("Roadmap insert failed:", roadmapError.code);
    return {
      ok: false,
      message: "Your roadmap could not be saved.",
    };
  }

  const { error: taskError } = await supabase.from("roadmap_tasks").insert(
    roadmap.tasks.map((task) => ({
      id: task.id,
      roadmap_id: roadmap.id,
      skill_id: task.skillSlug
        ? (skillIdBySlug.get(task.skillSlug) ?? null)
        : null,
      week_number: task.weekNumber,
      order_index: task.orderIndex,
      title: task.title,
      description: task.description,
      category: task.category,
      estimated_minutes: task.estimatedMinutes,
      status: task.status,
      resources: task.resources as unknown as Json,
      completed_at: task.completedAt,
    })),
  );

  if (taskError) {
    console.error("Roadmap tasks insert failed:", taskError.code);
    await supabase
      .from("learning_roadmaps")
      .delete()
      .eq("id", roadmap.id)
      .eq("user_id", userId);
    return {
      ok: false,
      message: "The plan was generated but its tasks could not be saved.",
    };
  }

  const prerequisites = roadmap.tasks.flatMap((task) =>
    task.prerequisiteIds.map((prerequisiteTaskId) => ({
      task_id: task.id,
      prerequisite_task_id: prerequisiteTaskId,
    })),
  );

  if (prerequisites.length > 0) {
    const { error: prerequisiteError } = await supabase
      .from("roadmap_task_prerequisites")
      .insert(prerequisites);

    if (prerequisiteError) {
      console.error(
        "Roadmap prerequisites insert failed:",
        prerequisiteError.code,
      );
      await supabase
        .from("learning_roadmaps")
        .delete()
        .eq("id", roadmap.id)
        .eq("user_id", userId);
      return {
        ok: false,
        message: "The plan was generated but its prerequisites could not be saved.",
      };
    }
  }

  const { error: archiveError } = await supabase
    .from("learning_roadmaps")
    .update({ status: "archived" })
    .eq("user_id", userId)
    .eq("status", "active")
    .neq("id", roadmap.id);

  if (archiveError) {
    console.error("Roadmap archive failed:", archiveError.code);
  }

  const { error: activateError } = await supabase
    .from("learning_roadmaps")
    .update({ status: "active" })
    .eq("id", roadmap.id)
    .eq("user_id", userId);

  if (activateError) {
    console.error("Roadmap activation failed:", activateError.code);
    return {
      ok: false,
      message:
        "The plan was saved but could not be activated. Reload and try again.",
    };
  }

  return { ok: true };
}

export type OwnedTaskContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  task: RoadmapTaskRow;
  roadmap: LearningRoadmapRow;
};

export async function loadOwnedTaskContext(
  taskId: string,
): Promise<OwnedTaskContext | null> {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data: task, error: taskError } = await context.supabase
    .from("roadmap_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    console.error("Task lookup failed:", taskError.code);
    return null;
  }
  if (!task) return null;

  const { data: roadmap, error: roadmapError } = await context.supabase
    .from("learning_roadmaps")
    .select("*")
    .eq("id", task.roadmap_id)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (roadmapError) {
    console.error("Task roadmap lookup failed:", roadmapError.code);
    return null;
  }
  if (!roadmap) return null;

  return {
    ...context,
    task,
    roadmap,
  };
}

export async function getUnmetPrerequisites(taskId: string): Promise<{
  unmet: { id: string; title: string; status: string }[];
  hasMissing: boolean;
}> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { unmet: [], hasMissing: false };
  }

  const { data: links, error } = await context.supabase
    .from("roadmap_task_prerequisites")
    .select("*")
    .eq("task_id", taskId);

  if (error) {
    console.error("Prerequisite lookup failed:", error.code);
    return { unmet: [], hasMissing: true };
  }

  const ids = (links ?? []).map((link) => link.prerequisite_task_id);
  if (ids.length === 0) return { unmet: [], hasMissing: false };

  const { data: tasks, error: taskError } = await context.supabase
    .from("roadmap_tasks")
    .select("id, title, status")
    .in("id", ids);

  if (taskError) {
    console.error("Prerequisite task lookup failed:", taskError.code);
    return { unmet: [], hasMissing: true };
  }

  const unmet = (tasks ?? []).filter(
    (task) => task.status !== "completed",
  );

  return {
    unmet,
    hasMissing: (tasks ?? []).length !== ids.length,
  };
}

export async function getCompletedDependents(taskId: string): Promise<{
  dependents: { id: string; title: string }[];
  hasMissing: boolean;
}> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { dependents: [], hasMissing: false };
  }

  const { data: links, error } = await context.supabase
    .from("roadmap_task_prerequisites")
    .select("*")
    .eq("prerequisite_task_id", taskId);

  if (error) {
    console.error("Dependent lookup failed:", error.code);
    return { dependents: [], hasMissing: true };
  }

  const ids = (links ?? []).map((link) => link.task_id);
  if (ids.length === 0) return { dependents: [], hasMissing: false };

  const { data: tasks, error: taskError } = await context.supabase
    .from("roadmap_tasks")
    .select("id, title, status")
    .in("id", ids)
    .eq("status", "completed");

  if (taskError) {
    console.error("Dependent task lookup failed:", taskError.code);
    return { dependents: [], hasMissing: true };
  }

  return {
    dependents: (tasks ?? []).map((task) => ({
      id: task.id,
      title: task.title,
    })),
    hasMissing: false,
  };
}

export async function updateTaskRow({
  taskId,
  roadmapId,
  changes,
}: {
  taskId: string;
  roadmapId: string;
  changes: Partial<{
    status: RoadmapTaskStatus;
    week_number: number;
    completed_at: string | null;
  }>;
}) {
  const context = await getAuthenticatedContext();
  if (!context) return { ok: false as const, message: "Sign in to update tasks." };

  const { error } = await context.supabase
    .from("roadmap_tasks")
    .update(changes)
    .eq("id", taskId)
    .eq("roadmap_id", roadmapId);

  if (error) {
    console.error("Task update failed:", error.code);
    return {
      ok: false as const,
      message: "The task could not be updated. Reload and try again.",
    };
  }

  return { ok: true as const };
}

export async function refreshRoadmapSummaryPercent(roadmapId: string) {
  const roadmap = await getRoadmapRecordById(roadmapId);
  if (!roadmap) return;
  const context = await getAuthenticatedContext();
  if (!context) return;

  const { error } = await context.supabase
    .from("learning_roadmaps")
    .update({
      summary: {
        ...roadmap.summary,
        overallPercent: roadmap.summary.overallPercent,
      } as unknown as Json,
    })
    .eq("id", roadmapId)
    .eq("user_id", context.userId);

  if (error) {
    console.error("Roadmap summary update failed:", error.code);
  }
}
