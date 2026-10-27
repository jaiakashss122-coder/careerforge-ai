"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLatestAssessmentRecord } from "@/lib/assessment/repository";
import { getCurrentProfile } from "@/lib/profile/repository";
import {
  buildProjectEvidence,
  buildReadinessContext,
  evaluateProjectCompletion,
  evaluateProjectReadiness,
} from "@/lib/projects/readiness";
import {
  deleteProjectEvidenceRows,
  deleteProjectRecord,
  getProjectRecordById,
  hasProjectEvidenceRows,
  insertProjectEvidence,
  insertProjectFromTemplate,
  listProjectRecords,
  updateMilestoneRow,
  updateProjectRow,
} from "@/lib/projects/repository";
import { getProjectTemplate } from "@/lib/projects/templates";
import {
  isProjectRubricKey,
  isProjectStatus,
  PROJECT_RUBRIC,
  RUBRIC_MAX_SCORE,
  type ProjectSelfAssessment,
} from "@/lib/projects/types";
import { getActiveRoadmapRecord } from "@/lib/roadmap/repository";
import type { Json } from "@/lib/supabase/database.types";
import type {
  CompleteProjectResult,
  DeleteProjectResult,
  ProjectActionResult,
  SaveProjectRubricInput,
  SetMilestoneStatusInput,
  SetProjectLinksInput,
  SetProjectStatusInput,
  StartProjectInput,
  StartProjectResult,
} from "@/lib/projects/action-types";

const MAX_ID_LENGTH = 120;
const MAX_URL_LENGTH = 500;
const MAX_REFLECTION_LENGTH = 4000;

const idSchema = z.string().trim().min(1).max(MAX_ID_LENGTH);

const urlSchema = z
  .string()
  .trim()
  .max(MAX_URL_LENGTH)
  .refine(
    (value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value),
    "Links must start with http:// or https://.",
  );

const rubricScoresSchema = z
  .record(z.string(), z.number().int().min(0).max(RUBRIC_MAX_SCORE))
  .refine(
    (scores) => Object.keys(scores).length <= PROJECT_RUBRIC.length,
    "The rubric has more entries than expected.",
  )
  .refine(
    (scores) =>
      Object.keys(scores).every((key) => isProjectRubricKey(key)),
    "Every rubric entry must be a known criterion.",
  );

const REVALIDATED_PATHS = [
  "/projects",
  "/progress",
  "/dashboard",
  "/roadmap",
  "/settings",
];

function revalidateProjects() {
  for (const path of REVALIDATED_PATHS) {
    revalidatePath(path);
  }
}

function firstIssue(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

function normaliseUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length === 0 ? "" : trimmed;
}

async function buildServerReadiness() {
  const [profile, assessment, roadmap, projects] = await Promise.all([
    getCurrentProfile(),
    getLatestAssessmentRecord(),
    getActiveRoadmapRecord(),
    listProjectRecords(),
  ]);

  return buildReadinessContext({
    assessment: assessment?.summary ?? null,
    roadmap,
    projects,
    weeklyHours: profile?.weeklyHours ?? 10,
  });
}

export async function startProjectAction(
  input: StartProjectInput,
): Promise<StartProjectResult> {
  const parsed = idSchema.safeParse(input.templateSlug);

  if (!parsed.success) {
    return { ok: false, message: "Choose a project to start." };
  }

  const template = getProjectTemplate(parsed.data);

  if (!template) {
    return { ok: false, message: "That project template no longer exists." };
  }

  const context = await buildServerReadiness();

  if (context.startedTemplateSlugs.includes(template.slug)) {
    return {
      ok: false,
      message:
        "You already have this project. Continue it instead of starting another copy.",
    };
  }

  const readiness = evaluateProjectReadiness(template, context);

  if (readiness.locked) {
    return {
      ok: false,
      message: `${readiness.lockReasons.join(" ")} Unlock it by finishing the matching roadmap tasks or the earlier projects in this library.`,
      lockReasons: readiness.lockReasons,
    };
  }

  const result = await insertProjectFromTemplate({
    template,
    title: template.title,
    problemStatement: template.problemStatement,
  });

  if (!result.ok) {
    return result;
  }

  const project = await getProjectRecordById(result.id);

  if (!project) {
    return {
      ok: false,
      message: "The project was created but could not be reloaded. Refresh and try again.",
    };
  }

  revalidateProjects();
  return { ok: true, project };
}

export async function setProjectStatusAction(
  input: SetProjectStatusInput,
): Promise<ProjectActionResult> {
  const projectId = idSchema.safeParse(input.projectId);
  const statusValue =
    typeof input.status === "string" && isProjectStatus(input.status)
      ? input.status
      : null;

  if (!projectId.success || !statusValue) {
    return { ok: false, message: "That project update was not readable." };
  }

  const project = await getProjectRecordById(projectId.data);

  if (!project) {
    return { ok: false, message: "That project is not available on this account." };
  }

  const result = await updateProjectRow(project.id, {
    status: statusValue,
    started_at:
      statusValue === "in_progress" && !project.startedAt
        ? new Date().toISOString()
        : project.startedAt,
  });

  if (!result.ok) return result;

  revalidateProjects();
  return { ok: true };
}

export async function completeProjectAction(
  projectIdInput: unknown,
): Promise<CompleteProjectResult> {
  const projectId = idSchema.safeParse(projectIdInput);

  if (!projectId.success) {
    return { ok: false, message: "That project update was not readable." };
  }

  const project = await getProjectRecordById(projectId.data);

  if (!project) {
    return { ok: false, message: "That project is not available on this account." };
  }

  const check = evaluateProjectCompletion(project);

  if (!check.eligible) {
    return {
      ok: false,
      message: `${check.blockers.join(" ")} Evidence is only recorded once the work itself is submitted.`,
      blockers: check.blockers,
    };
  }

  const now = new Date().toISOString();
  const updated = await updateProjectRow(project.id, {
    status: "completed",
    completed_at: project.completedAt ?? now,
    started_at: project.startedAt ?? now,
  });

  if (!updated.ok) return updated;

  const drafts = buildProjectEvidence(project);

  if (drafts.length === 0) {
    revalidateProjects();
    return {
      ok: true,
      evidenceCount: 0,
      message:
        "Project marked complete. No skill links were recorded for this project type.",
    };
  }

  if (await hasProjectEvidenceRows(project.id)) {
    revalidateProjects();
    return {
      ok: true,
      evidenceCount: 0,
      message: "Project marked complete. Its evidence was already recorded.",
    };
  }

  const evidence = await insertProjectEvidence({
    projectId: project.id,
    entries: drafts.map((draft) => ({
      skillSlug: draft.skillSlug,
      score: draft.score,
      notes: draft.notes,
    })),
  });

  if (!evidence.ok) return evidence;

  revalidateProjects();
  return {
    ok: true,
    evidenceCount: evidence.count,
    message: `Project completed. Recorded ${evidence.count} unverified ${
      evidence.count === 1 ? "skill link" : "skill links"
    } from the work you submitted.`,
  };
}

export async function reopenProjectAction(
  projectIdInput: unknown,
): Promise<CompleteProjectResult> {
  const projectId = idSchema.safeParse(projectIdInput);

  if (!projectId.success) {
    return { ok: false, message: "That project update was not readable." };
  }

  const project = await getProjectRecordById(projectId.data);

  if (!project) {
    return { ok: false, message: "That project is not available on this account." };
  }

  if (project.status !== "completed") {
    return { ok: false, message: "Only a completed project can be reopened." };
  }

  const now = new Date().toISOString();
  const updated = await updateProjectRow(project.id, {
    status: "in_progress",
    completed_at: null,
    started_at: project.startedAt ?? now,
  });

  if (!updated.ok) return updated;

  const removed = await deleteProjectEvidenceRows(project.id);

  if (!removed.ok) {
    return {
      ok: false,
      message: `${removed.message} The project was reopened, so withdraw the evidence manually if it stays.`,
    };
  }

  revalidateProjects();
  return {
    ok: true,
    evidenceCount: 0,
    message:
      "Project reopened. Its skill evidence was withdrawn, since the work is no longer finished.",
  };
}

export async function setMilestoneStatusAction(
  input: SetMilestoneStatusInput,
): Promise<ProjectActionResult> {
  const parsedProjectId = idSchema.safeParse(input.projectId);
  const parsedMilestoneId = idSchema.safeParse(input.milestoneId);

  if (!parsedProjectId.success || !parsedMilestoneId.success) {
    return { ok: false, message: "That milestone update was not readable." };
  }

  if (typeof input.completed !== "boolean") {
    return { ok: false, message: "That milestone update was not readable." };
  }

  const project = await getProjectRecordById(parsedProjectId.data);

  if (!project) {
    return { ok: false, message: "That project is not available on this account." };
  }

  const milestone = project.milestones.find(
    (entry) => entry.id === parsedMilestoneId.data,
  );

  if (!milestone) {
    return { ok: false, message: "That milestone is not part of this project." };
  }

  if (project.status === "completed") {
    return {
      ok: false,
      message: "Reopen the project before changing its milestones.",
    };
  }

  if (input.completed) {
    const evidenceUrl = urlSchema.safeParse(
      typeof input.evidenceUrl === "string" ? input.evidenceUrl : "",
    );

    if (!evidenceUrl.success) {
      return {
        ok: false,
        message: firstIssue(
          evidenceUrl.error,
          "Add a valid link to the work you produced.",
        ),
      };
    }

    if (evidenceUrl.data.trim().length === 0) {
      return {
        ok: false,
        message:
          "Link the work you produced for this step — a commit, notebook, file, or page — before marking it complete. Milestones count as evidence only with submitted work.",
      };
    }

    const earlierOpen = project.milestones.filter(
      (entry) =>
        entry.orderIndex < milestone.orderIndex &&
        entry.status !== "completed",
    );

    if (earlierOpen.length > 0) {
      return {
        ok: false,
        message: `Finish ${earlierOpen
          .slice(0, 3)
          .map((entry) => entry.title)
          .join(", ")} first. Milestones are ordered.`,
      };
    }

    const result = await updateMilestoneRow({
      milestoneId: milestone.id,
      projectId: project.id,
      changes: {
        status: "completed",
        evidence_url: evidenceUrl.data.trim(),
        completed_at: new Date().toISOString(),
      },
    });

    if (!result.ok) return result;

    if (project.status === "planned") {
      await updateProjectRow(project.id, {
        status: "in_progress",
        started_at: project.startedAt ?? new Date().toISOString(),
      });
    }

    revalidateProjects();
    return { ok: true };
  }

  if (milestone.status !== "completed") {
    return { ok: false, message: "Only a completed milestone can be reopened." };
  }

  const dependents = project.milestones.filter(
    (entry) =>
      entry.orderIndex > milestone.orderIndex && entry.status === "completed",
  );

  if (dependents.length > 0) {
    return {
      ok: false,
      message: `Reopen ${dependents
        .slice(0, 3)
        .map((entry) => entry.title)
        .join(", ")} first. A later milestone depends on this one.`,
    };
  }

  const result = await updateMilestoneRow({
    milestoneId: milestone.id,
    projectId: project.id,
    changes: { status: "pending", evidence_url: null, completed_at: null },
  });

  if (!result.ok) return result;

  revalidateProjects();
  return { ok: true };
}

export async function setProjectLinksAction(
  input: SetProjectLinksInput,
): Promise<ProjectActionResult> {
  const parsedProjectId = idSchema.safeParse(input.projectId);

  if (!parsedProjectId.success) {
    return { ok: false, message: "That project update was not readable." };
  }

  const repoUrl = normaliseUrl(input.repoUrl);
  const deploymentUrl = normaliseUrl(input.deploymentUrl);

  const changes: Record<string, string | null> = {};

  for (const [key, value] of [
    ["repo_url", repoUrl],
    ["deployment_url", deploymentUrl],
  ] as const) {
    if (value === undefined) continue;

    const parsed = urlSchema.safeParse(value);

    if (!parsed.success) {
      return {
        ok: false,
        message: firstIssue(parsed.error, "Add a valid link."),
      };
    }

    changes[key] = parsed.data.trim().length === 0 ? null : parsed.data.trim();
  }

  if (Object.keys(changes).length === 0) {
    return { ok: false, message: "Nothing to update was provided." };
  }

  const project = await getProjectRecordById(parsedProjectId.data);

  if (!project) {
    return { ok: false, message: "That project is not available on this account." };
  }

  const result = await updateProjectRow(project.id, changes);

  if (!result.ok) return result;

  revalidateProjects();
  return { ok: true };
}

export async function saveProjectRubricAction(
  input: SaveProjectRubricInput,
): Promise<ProjectActionResult> {
  const parsedProjectId = idSchema.safeParse(input.projectId);

  if (!parsedProjectId.success) {
    return { ok: false, message: "That rubric was not readable." };
  }

  const parsedScores = rubricScoresSchema.safeParse(input.scores);

  if (!parsedScores.success) {
    return {
      ok: false,
      message: firstIssue(
        parsedScores.error,
        "Score every rubric entry between 0 and 3.",
      ),
    };
  }

  const reflection = z
    .string()
    .trim()
    .max(MAX_REFLECTION_LENGTH, "Keep the reflection under 4,000 characters.")
    .safeParse(
      typeof input.reflection === "string" ? input.reflection : "",
    );

  if (!reflection.success) {
    return {
      ok: false,
      message: firstIssue(reflection.error, "The reflection was not readable."),
    };
  }

  const project = await getProjectRecordById(parsedProjectId.data);

  if (!project) {
    return { ok: false, message: "That project is not available on this account." };
  }

  if (project.status !== "completed") {
    return {
      ok: false,
      message:
        "Score the rubric after the project is complete. Rubric results are self-assessment, not evidence of mastery.",
    };
  }

  const selfAssessment: ProjectSelfAssessment = {
    version: 1,
    scores: parsedScores.data,
    reflection: reflection.data,
    updatedAt: new Date().toISOString(),
  };

  const result = await updateProjectRow(project.id, {
    self_assessment: selfAssessment as unknown as Json,
  });

  if (!result.ok) return result;

  revalidateProjects();
  return {
    ok: true,
    message:
      "Rubric saved. These are your own judgements and are kept separate from assessed skill evidence.",
  };
}

export async function deleteProjectAction(
  projectIdInput: unknown,
): Promise<DeleteProjectResult> {
  const projectId = idSchema.safeParse(projectIdInput);

  if (!projectId.success) {
    return { ok: false, message: "That project could not be read." };
  }

  const project = await getProjectRecordById(projectId.data);

  if (!project) {
    return { ok: false, message: "That project is not available on this account." };
  }

  const evidence = await deleteProjectEvidenceRows(project.id);

  if (!evidence.ok) {
    return {
      ok: false,
      message: `${evidence.message} The project was not deleted.`,
    };
  }

  const removed = await deleteProjectRecord(project.id);

  if (!removed.ok) return removed;

  revalidateProjects();
  return {
    ok: true,
    message: `Deleted "${project.title}" and any skill evidence it created.`,
  };
}
