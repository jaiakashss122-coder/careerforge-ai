import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProjectRecord,
  ProjectSelfAssessment,
  ProjectTemplate,
} from "@/lib/projects/types";
import {
  isProjectRubricKey,
  isProjectStatus,
  isMilestoneStatus,
  RUBRIC_MAX_SCORE,
} from "@/lib/projects/types";
import { getProjectTemplate } from "@/lib/projects/templates";
import type {
  Database,
  ProjectMilestoneRow,
  ProjectRow,
  Json,
} from "@/lib/supabase/database.types";
import { getAuthenticatedContext } from "@/lib/workspace/server";

type SkillIdMaps = {
  idBySlug: Map<string, string>;
  slugById: Map<string, string>;
};

async function loadSkillMaps(
  supabase: SupabaseClient<Database>,
): Promise<SkillIdMaps> {
  const { data, error } = await supabase.from("skills").select("id, slug");

  if (error) {
    console.error("Skill lookup failed:", error.code);
    return { idBySlug: new Map(), slugById: new Map() };
  }

  return {
    idBySlug: new Map((data ?? []).map((skill) => [skill.slug, skill.id])),
    slugById: new Map((data ?? []).map((skill) => [skill.id, skill.slug])),
  };
}

function parseSelfAssessment(value: Json): ProjectSelfAssessment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (record.version !== 1 || !record.scores || typeof record.scores !== "object") {
    return null;
  }

  const scores: ProjectSelfAssessment["scores"] = {};

  for (const [key, raw] of Object.entries(
    record.scores as Record<string, unknown>,
  )) {
    if (
      isProjectRubricKey(key) &&
      typeof raw === "number" &&
      raw >= 0 &&
      raw <= RUBRIC_MAX_SCORE
    ) {
      scores[key] = Math.round(raw);
    }
  }

  return {
    version: 1,
    scores,
    reflection:
      typeof record.reflection === "string" ? record.reflection : "",
    updatedAt:
      typeof record.updatedAt === "string"
        ? record.updatedAt
        : new Date().toISOString(),
  };
}

function milestoneRowToRecord(row: ProjectMilestoneRow) {
  return {
    id: row.id,
    templateKey: row.template_key,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    status: isMilestoneStatus(row.status) ? row.status : ("pending" as const),
    evidenceUrl: row.evidence_url,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function projectRowToRecord(
  row: ProjectRow,
  milestoneRows: ProjectMilestoneRow[],
): ProjectRecord {
  return {
    id: row.id,
    templateSlug: row.template_slug,
    title: row.title,
    problemStatement: row.problem_statement,
    status: isProjectStatus(row.status) ? row.status : "planned",
    repoUrl: row.repo_url,
    deploymentUrl: row.deployment_url,
    selfAssessment: parseSelfAssessment(row.self_assessment),
    milestones: milestoneRows
      .filter((milestone) => milestone.project_id === row.id)
      .map(milestoneRowToRecord)
      .sort((a, b) => a.orderIndex - b.orderIndex),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjectRecords(): Promise<ProjectRecord[]> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data: rows, error } = await context.supabase
    .from("projects")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Project lookup failed:", error.code);
    throw new Error("Your projects could not be loaded.");
  }
  if (!rows || rows.length === 0) return [];

  const { data: milestoneRows } = await context.supabase
    .from("project_milestones")
    .select("*")
    .in(
      "project_id",
      rows.map((row) => row.id),
    );

  return rows.map((row) =>
    projectRowToRecord(row, milestoneRows ?? []),
  );
}

export async function getProjectRecordById(
  id: string,
): Promise<ProjectRecord | null> {
  const context = await getAuthenticatedContext();
  if (!context) return null;

  const { data: row, error } = await context.supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) {
    console.error("Project lookup failed:", error.code);
    return null;
  }
  if (!row) return null;

  const { data: milestoneRows } = await context.supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", row.id);

  return projectRowToRecord(row, milestoneRows ?? []);
}

export async function insertProjectFromTemplate({
  template,
  title,
  problemStatement,
}: {
  template: ProjectTemplate;
  title: string;
  problemStatement: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to start a project." };
  }

  const { data, error } = await context.supabase
    .from("projects")
    .insert({
      user_id: context.userId,
      template_slug: template.slug,
      title,
      problem_statement: problemStatement,
      status: "planned",
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Project insert failed:", error?.code);
    return { ok: false, message: "The project could not be created." };
  }

  const { error: milestoneError } = await context.supabase
    .from("project_milestones")
    .insert(
      template.milestones.map((milestone, index) => ({
        project_id: data.id,
        template_key: milestone.key,
        title: milestone.title,
        description: milestone.description,
        order_index: index,
        status: "pending",
      })),
    );

  if (milestoneError) {
    console.error("Milestone insert failed:", milestoneError.code);
    await context.supabase
      .from("projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return {
      ok: false,
      message: "The project was created but its milestones could not be saved.",
    };
  }

  return { ok: true, id: data.id };
}

export async function updateProjectRow(
  projectId: string,
  changes: Partial<{
    status: ProjectRecord["status"];
    repo_url: string | null;
    deployment_url: string | null;
    problem_statement: string;
    title: string;
    self_assessment: Json;
    started_at: string | null;
    completed_at: string | null;
  }>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to update your project." };
  }

  const { data, error } = await context.supabase
    .from("projects")
    .update(changes)
    .eq("id", projectId)
    .eq("user_id", context.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Project update failed:", error.code);
    return { ok: false, message: "The project could not be updated." };
  }
  if (!data) {
    return { ok: false, message: "That project no longer exists." };
  }

  return { ok: true };
}

export async function updateMilestoneRow({
  milestoneId,
  projectId,
  changes,
}: {
  milestoneId: string;
  projectId: string;
  changes: Partial<{
    status: ProjectRecord["milestones"][number]["status"];
    evidence_url: string | null;
    completed_at: string | null;
  }>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to update your project." };
  }

  const { data: owned } = await context.supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (!owned) {
    return { ok: false, message: "That project is not yours." };
  }

  const { data, error } = await context.supabase
    .from("project_milestones")
    .update(changes)
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Milestone update failed:", error.code);
    return { ok: false, message: "That milestone could not be updated." };
  }
  if (!data) {
    return { ok: false, message: "That milestone no longer exists." };
  }

  return { ok: true };
}

export async function deleteProjectRecord(
  projectId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to delete a project." };
  }

  const { data, error } = await context.supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", context.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Project delete failed:", error.code);
    return { ok: false, message: "The project could not be deleted." };
  }
  if (!data) {
    return { ok: false, message: "That project no longer exists." };
  }

  return { ok: true };
}

export async function insertProjectEvidence({
  projectId,
  entries,
}: {
  projectId: string;
  entries: { skillSlug: string; score: number | null; notes: string }[];
}): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to record project evidence." };
  }

  const { idBySlug } = await loadSkillMaps(context.supabase);

  const rows = entries.flatMap((entry) => {
    const skillId = idBySlug.get(entry.skillSlug);

    if (!skillId) {
      console.warn(
        `Skipping evidence for unknown skill slug: ${entry.skillSlug}`,
      );
      return [];
    }

    return [
      {
        user_id: context.userId,
        skill_id: skillId,
        source_type: "project",
        source_id: projectId,
        evidence_level: "project_evidence",
        score: entry.score,
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
    console.error("Project evidence insert failed:", error.code);
    return {
      ok: false,
      message: "The project was completed but its evidence could not be saved.",
    };
  }

  return { ok: true, count: rows.length };
}

export async function deleteProjectEvidenceRows(
  projectId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to update your evidence." };
  }

  const { error } = await context.supabase
    .from("user_skill_evidence")
    .delete()
    .eq("user_id", context.userId)
    .eq("source_type", "project")
    .eq("source_id", projectId);

  if (error) {
    console.error("Project evidence delete failed:", error.code);
    return { ok: false, message: "The linked skill evidence could not be removed." };
  }

  return { ok: true };
}

export async function hasProjectEvidenceRows(projectId: string) {
  const context = await getAuthenticatedContext();
  if (!context) return false;

  const { count, error } = await context.supabase
    .from("user_skill_evidence")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .eq("source_type", "project")
    .eq("source_id", projectId);

  if (error) {
    console.error("Project evidence count failed:", error.code);
    return true;
  }

  return (count ?? 0) > 0;
}

export async function countProjectRecords() {
  const context = await getAuthenticatedContext();
  if (!context) return 0;

  const { count, error } = await context.supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId);

  if (error) {
    console.error("Project count failed:", error.code);
    return 0;
  }

  return count ?? 0;
}

export function isKnownTemplate(slug: string | null | undefined) {
  return Boolean(getProjectTemplate(slug));
}
