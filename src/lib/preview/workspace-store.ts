"use client";

import type { AssessmentRecord } from "@/lib/assessment/types";
import {
  CAREER_EXPERIMENT_KIND_META,
  getCareerExperimentForTrack,
} from "@/lib/career/experiments";
import {
  MAX_OVERRIDE_REASON_LENGTH,
  MAX_REFLECTION_TEXT_LENGTH,
  MIN_OVERRIDE_REASON_LENGTH,
} from "@/lib/career/action-types";
import {
  getCareerTrack,
  isCareerTrackSlug,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import {
  isCareerExperimentStatus,
  isReflectionRating,
  type CareerExperimentRecord,
  type CareerExperimentReflection,
  type CareerPreferenceRecord,
} from "@/lib/career/types";
import {
  isEvidenceLevel,
  isEvidenceSourceType,
  type SkillEvidenceRecord,
} from "@/lib/evidence/types";
import {
  evaluateProjectCompletion,
  evaluateProjectReadiness,
  buildReadinessContext,
  buildProjectEvidence,
} from "@/lib/projects/readiness";
import { getProjectTemplate } from "@/lib/projects/templates";
import {
  isMilestoneStatus,
  isProjectStatus,
  type ProjectMilestoneRecord,
  type ProjectRecord,
  type ProjectSelfAssessment,
  type ProjectStatus,
} from "@/lib/projects/types";
import {
  isSessionPreset,
  type LearningSessionRecord,
  type SessionMode,
} from "@/lib/sessions/types";
import type { LearningRoadmap } from "@/lib/roadmap/types";
import { createId } from "@/lib/id";
import {
  getActiveRoadmap,
  getLatestAssessment,
  getRoadmapOverallPercent,
  getTaskLockState,
} from "@/lib/workspace/progress";
import {
  createEmptyWorkspace,
  type WorkspaceSnapshot,
} from "@/lib/workspace/types";

const STORAGE_KEY = "careerforge:workspace:v1";

export const PREVIEW_WORKSPACE_UPDATED = "careerforge:preview-workspace-updated";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAssessment(value: unknown): value is AssessmentRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.overallScore === "number" &&
    typeof value.maxScore === "number" &&
    isRecord(value.summary) &&
    Array.isArray(value.answers) &&
    typeof value.completedAt === "string"
  );
}

function isRoadmap(value: unknown): value is LearningRoadmap {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.focusTracks) &&
    isRecord(value.summary) &&
    typeof value.startDate === "string"
  );
}

function isSession(value: unknown): value is LearningSessionRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.mode === "string" &&
    typeof value.status === "string" &&
    typeof value.startedAt === "string"
  );
}

function isMilestone(value: unknown): value is ProjectMilestoneRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.orderIndex === "number" &&
    typeof value.status === "string" &&
    isMilestoneStatus(value.status)
  );
}

function isProject(value: unknown): value is ProjectRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.status === "string" &&
    isProjectStatus(value.status) &&
    Array.isArray(value.milestones) &&
    value.milestones.every(isMilestone)
  );
}

function isEvidence(value: unknown): value is SkillEvidenceRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.skillSlug === "string" &&
    typeof value.sourceType === "string" &&
    isEvidenceSourceType(value.sourceType) &&
    typeof value.evidenceLevel === "string" &&
    isEvidenceLevel(value.evidenceLevel) &&
    typeof value.verified === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function isReflectionSet(value: unknown): value is CareerExperimentReflection {
  return (
    isRecord(value) &&
    isReflectionRating(value.interest) &&
    isReflectionRating(value.difficulty) &&
    isReflectionRating(value.enjoyment) &&
    isReflectionRating(value.willingness)
  );
}

function isCareerExperiment(value: unknown): value is CareerExperimentRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.careerSlug === "string" &&
    isCareerTrackSlug(value.careerSlug) &&
    typeof value.title === "string" &&
    typeof value.status === "string" &&
    isCareerExperimentStatus(value.status) &&
    (value.reflection === null || isReflectionSet(value.reflection)) &&
    typeof value.reflectionText === "string" &&
    typeof value.createdAt === "string"
  );
}

function isCareerPreference(value: unknown): value is CareerPreferenceRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.specializationChoice === null ||
      (typeof value.specializationChoice === "string" &&
        isCareerTrackSlug(value.specializationChoice))) &&
    (value.alternativeChoice === null ||
      (typeof value.alternativeChoice === "string" &&
        isCareerTrackSlug(value.alternativeChoice))) &&
    typeof value.overrideReason === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function getPreviewWorkspaceSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function subscribeToPreviewWorkspace(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(PREVIEW_WORKSPACE_UPDATED, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(PREVIEW_WORKSPACE_UPDATED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parsePreviewWorkspace(raw: string | null): WorkspaceSnapshot {
  if (!raw) return createEmptyWorkspace();

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return createEmptyWorkspace();
  }

  if (!isRecord(value)) return createEmptyWorkspace();

  return {
    assessments: Array.isArray(value.assessments)
      ? value.assessments.filter(isAssessment)
      : [],
    roadmaps: Array.isArray(value.roadmaps)
      ? value.roadmaps.filter(isRoadmap)
      : [],
    sessions: Array.isArray(value.sessions)
      ? value.sessions.filter(isSession)
      : [],
    projects: Array.isArray(value.projects)
      ? value.projects.filter(isProject)
      : [],
    evidence: Array.isArray(value.evidence)
      ? value.evidence.filter(isEvidence)
      : [],
    careerExperiments: Array.isArray(value.careerExperiments)
      ? value.careerExperiments.filter(isCareerExperiment)
      : [],
    careerPreferences: Array.isArray(value.careerPreferences)
      ? value.careerPreferences.filter(isCareerPreference).slice(0, 1)
      : [],
  };
}

export function loadPreviewWorkspace(): WorkspaceSnapshot {
  return parsePreviewWorkspace(getPreviewWorkspaceSnapshot());
}

export function savePreviewWorkspace(workspace: WorkspaceSnapshot) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, ...workspace }),
  );
  window.dispatchEvent(new Event(PREVIEW_WORKSPACE_UPDATED));
}

export function clearPreviewWorkspace() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(PREVIEW_WORKSPACE_UPDATED));
}

export function savePreviewAssessment(record: AssessmentRecord) {
  const workspace = loadPreviewWorkspace();
  savePreviewWorkspace({
    ...workspace,
    assessments: [
      record,
      ...workspace.assessments.filter(
        (assessment) => assessment.id !== record.id,
      ),
    ],
  });
}

export function savePreviewRoadmap(
  roadmap: LearningRoadmap,
  replaceExisting: boolean,
): { ok: true } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const active = getActiveRoadmap(workspace.roadmaps);

  if (active && !replaceExisting) {
    return {
      ok: false,
      message:
        "You already have an active roadmap. Confirm that you want to replace it before generating another plan.",
    };
  }

  const now = new Date().toISOString();
  const existingRoadmaps = active
    ? workspace.roadmaps.map((entry) =>
        entry.status === "active"
          ? { ...entry, status: "archived" as const, updatedAt: now }
          : entry,
      )
    : workspace.roadmaps;

  savePreviewWorkspace({
    ...workspace,
    roadmaps: [...existingRoadmaps, roadmap],
  });

  return { ok: true };
}

function updateRoadmap(
  workspace: WorkspaceSnapshot,
  taskId: string,
  update: (roadmap: LearningRoadmap) => LearningRoadmap,
) {
  let updatedRoadmap: LearningRoadmap | null = null;

  const roadmaps = workspace.roadmaps.map((roadmap) => {
    if (!roadmap.tasks.some((task) => task.id === taskId)) return roadmap;
    if (updatedRoadmap) return roadmap;
    updatedRoadmap = update(roadmap);
    return updatedRoadmap;
  });

  return { updatedRoadmap, roadmaps };
}

export function setPreviewTaskCompletion(
  taskId: string,
  completed: boolean,
): { ok: true } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const now = new Date().toISOString();
  let failure: string | null = null;

  const { roadmaps } = updateRoadmap(workspace, taskId, (roadmap) => {
    const task = roadmap.tasks.find((entry) => entry.id === taskId);
    if (!task) {
      failure = "That task no longer exists in this roadmap.";
      return roadmap;
    }

    if (completed) {
      const lock = getTaskLockState(task, roadmap);
      if (lock.locked) {
        failure = lock.unmetPrerequisites.length
          ? `Finish ${lock.unmetPrerequisites
              .map((entry) => entry.title)
              .join(", ")} before completing this task.`
          : "A prerequisite is missing, so this task cannot be completed yet.";
        return roadmap;
      }
    } else {
      if (task.status !== "completed") {
        failure = "Only completed tasks can be reopened.";
        return roadmap;
      }
      const dependents = roadmap.tasks.filter(
        (entry) =>
          entry.status === "completed" &&
          entry.prerequisiteIds.includes(taskId),
      );
      if (dependents.length > 0) {
        failure = `Reopen ${dependents
          .map((entry) => entry.title)
          .join(", ")} first. A later completed task depends on this one.`;
        return roadmap;
      }
    }

    const tasks = roadmap.tasks.map((entry) =>
      entry.id === taskId
        ? {
            ...entry,
            status: completed ? ("completed" as const) : ("pending" as const),
            completedAt: completed ? now : null,
          }
        : entry,
    );
    const updated = {
      ...roadmap,
      tasks,
      summary: {
        ...roadmap.summary,
        overallPercent: getRoadmapOverallPercent({ ...roadmap, tasks }),
      },
      updatedAt: now,
    };
    return updated;
  });

  if (failure) return { ok: false, message: failure };
  savePreviewWorkspace({ ...workspace, roadmaps });
  return { ok: true };
}

export function reschedulePreviewTask(
  taskId: string,
  weekNumber: number,
): { ok: true } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const now = new Date().toISOString();
  let failure: string | null = null;
  const targetWeek = Math.min(13, Math.max(1, Math.round(weekNumber)));

  const { roadmaps } = updateRoadmap(workspace, taskId, (roadmap) => {
    const task = roadmap.tasks.find((entry) => entry.id === taskId);
    if (!task) {
      failure = "That task no longer exists in this roadmap.";
      return roadmap;
    }
    if (task.status === "completed") {
      failure = "Completed tasks cannot be rescheduled.";
      return roadmap;
    }

    return {
      ...roadmap,
      tasks: roadmap.tasks.map((entry) =>
        entry.id === taskId
          ? { ...entry, weekNumber: targetWeek, status: "pending" as const }
          : entry,
      ),
      updatedAt: now,
    };
  });

  if (failure) return { ok: false, message: failure };
  savePreviewWorkspace({ ...workspace, roadmaps });
  return { ok: true };
}

function newSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `preview-session-${Date.now()}`;
}

export function startPreviewSession({
  taskId,
  mode,
  plannedMinutes,
}: {
  taskId: string;
  mode: SessionMode;
  plannedMinutes: number;
}): { ok: true; session: LearningSessionRecord } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();

  if (workspace.sessions.some((session) => session.status === "active")) {
    return {
      ok: false,
      message:
        "A study session is already active. Finish or abandon it before starting another.",
    };
  }

  if (!isSessionPreset(mode, plannedMinutes)) {
    return { ok: false, message: "Choose a supported session length." };
  }

  const activeRoadmap = getActiveRoadmap(workspace.roadmaps);
  if (!activeRoadmap) {
    return { ok: false, message: "There is no active roadmap to study from." };
  }

  const task = activeRoadmap.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return { ok: false, message: "That task is not part of your active roadmap." };
  }
  if (task.status === "completed") {
    return { ok: false, message: "That task is already completed." };
  }
  if (getTaskLockState(task, activeRoadmap).locked) {
    return {
      ok: false,
      message: "Finish this task's prerequisites before starting a session.",
    };
  }

  const now = new Date().toISOString();
  const session: LearningSessionRecord = {
    id: newSessionId(),
    taskId,
    mode,
    status: "active",
    plannedMinutes,
    actualMinutes: null,
    startedAt: now,
    endedAt: null,
    notes: "",
    createdAt: now,
  };
  const roadmaps = workspace.roadmaps.map((roadmap) => {
    if (roadmap.id !== activeRoadmap.id) return roadmap;
    return {
      ...roadmap,
      tasks: roadmap.tasks.map((entry) =>
        entry.id === taskId && entry.status === "pending"
          ? { ...entry, status: "in_progress" as const }
          : entry,
      ),
      updatedAt: now,
    };
  });

  savePreviewWorkspace({
    ...workspace,
    roadmaps,
    sessions: [session, ...workspace.sessions],
  });

  return { ok: true, session };
}

export function endPreviewSession({
  sessionId,
  outcome,
  notes = "",
}: {
  sessionId: string;
  outcome: "completed" | "abandoned";
  notes?: string;
}): { ok: true } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const session = workspace.sessions.find(
    (entry) => entry.id === sessionId,
  );

  if (!session) return { ok: false, message: "That session was not found." };
  if (session.status !== "active") {
    return { ok: false, message: "That session is already finished." };
  }

  const endedAt = new Date().toISOString();
  const elapsed = Math.max(
    0,
    Math.round(
      (new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) /
        60000,
    ),
  );

  savePreviewWorkspace({
    ...workspace,
    sessions: workspace.sessions.map((entry) =>
      entry.id === sessionId
        ? {
            ...entry,
            status: outcome,
            actualMinutes: elapsed,
            endedAt,
            notes: notes.trim(),
          }
        : entry,
    ),
  });

  return { ok: true };
}

function projectReadinessContext(workspace: WorkspaceSnapshot, weeklyHours: number) {
  return buildReadinessContext({
    assessment: getLatestAssessment(workspace.assessments)?.summary ?? null,
    roadmap: getActiveRoadmap(workspace.roadmaps),
    projects: workspace.projects,
    weeklyHours,
  });
}

export function startPreviewProject({
  templateSlug,
  weeklyHours,
}: {
  templateSlug: string;
  weeklyHours: number;
}): { ok: true; project: ProjectRecord } | { ok: false; message: string } {
  const template = getProjectTemplate(templateSlug);

  if (!template) {
    return { ok: false, message: "That project template no longer exists." };
  }

  const workspace = loadPreviewWorkspace();

  if (workspace.projects.some((project) => project.templateSlug === templateSlug)) {
    return {
      ok: false,
      message: "You already have this project. Continue it instead of starting another copy.",
    };
  }

  const readiness = evaluateProjectReadiness(
    template,
    projectReadinessContext(workspace, weeklyHours),
  );

  if (readiness.locked) {
    return {
      ok: false,
      message: `${readiness.lockReasons.join(" ")} Unlock it by finishing the matching roadmap tasks or the earlier projects in this library.`,
    };
  }

  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: createId(),
    templateSlug: template.slug,
    title: template.title,
    problemStatement: template.problemStatement,
    status: "planned",
    repoUrl: null,
    deploymentUrl: null,
    selfAssessment: null,
    milestones: template.milestones.map((milestone, index) => ({
      id: `${template.slug}-${milestone.key}`,
      templateKey: milestone.key,
      title: milestone.title,
      description: milestone.description,
      orderIndex: index,
      status: "pending" as const,
      evidenceUrl: null,
      completedAt: null,
      createdAt: now,
    })),
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  savePreviewWorkspace({ ...workspace, projects: [project, ...workspace.projects] });

  return { ok: true, project };
}

function replaceProject(
  workspace: WorkspaceSnapshot,
  projectId: string,
  update: (project: ProjectRecord) => ProjectRecord | null,
): { projects: ProjectRecord[]; failure: string | null; updated: ProjectRecord | null } {
  let failure: string | null = null;
  let updated: ProjectRecord | null = null;

  const projects = workspace.projects.map((project) => {
    if (project.id !== projectId) return project;

    const result = update(project);

    if (!result) return project;

    updated = result;
    return result;
  });

  if (!updated && !failure) {
    failure = "That project no longer exists.";
  }

  return { projects, failure, updated };
}

export function setPreviewProjectStatus(
  projectId: string,
  status: ProjectStatus,
): { ok: true; evidenceCount: number } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const now = new Date().toISOString();
  let failure: string | null = null;
  let evidenceCount = 0;
  let withdrawn = false;
  const newEvidence: SkillEvidenceRecord[] = [];

  const { projects } = replaceProject(
    workspace,
    projectId,
    (project) => {
      if (status === "completed") {
        const check = evaluateProjectCompletion(project);

        if (!check.eligible) {
          failure = `${check.blockers.join(" ")} Evidence is only recorded once the work itself is submitted.`;
          return null;
        }

        const alreadyRecorded = workspace.evidence.some(
          (entry) =>
            entry.sourceType === "project" && entry.sourceId === project.id,
        );

        if (!alreadyRecorded) {
          const drafts = buildProjectEvidence(project);
          evidenceCount = drafts.length;
          newEvidence.push(
            ...drafts.map((draft) => ({
              id: createId(),
              skillSlug: draft.skillSlug,
              sourceType: draft.sourceType,
              sourceId: project.id,
              evidenceLevel: draft.evidenceLevel,
              score: draft.score,
              verified: draft.verified,
              notes: draft.notes,
              createdAt: now,
            })),
          );
        }

        return {
          ...project,
          status,
          completedAt: project.completedAt ?? now,
          startedAt: project.startedAt ?? now,
          updatedAt: now,
        };
      }

      if (status === "in_progress" && !project.startedAt) {
        return { ...project, status, startedAt: now, updatedAt: now };
      }

      if (project.status === "completed") {
        withdrawn = true;
      }

      return { ...project, status, updatedAt: now };
    },
  );

  if (failure) return { ok: false, message: failure };

  savePreviewWorkspace({
    ...workspace,
    projects,
    evidence: withdrawn
      ? workspace.evidence.filter(
          (entry) =>
            !(entry.sourceType === "project" && entry.sourceId === projectId),
        )
      : [...newEvidence, ...workspace.evidence],
  });

  return { ok: true, evidenceCount };
}

export function setPreviewMilestoneStatus({
  projectId,
  milestoneId,
  completed,
  evidenceUrl = null,
}: {
  projectId: string;
  milestoneId: string;
  completed: boolean;
  evidenceUrl?: string | null;
}): { ok: true } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const now = new Date().toISOString();
  let failure: string | null = null;

  const trimmedUrl = evidenceUrl?.trim() ?? "";

  const { projects } = replaceProject(workspace, projectId, (project) => {
    if (project.status === "completed") {
      failure = "Reopen the project before changing its milestones.";
      return null;
    }

    const milestone = project.milestones.find((entry) => entry.id === milestoneId);

    if (!milestone) {
      failure = "That milestone no longer exists in this project.";
      return null;
    }

    if (completed && trimmedUrl.length === 0) {
      failure =
        "Link the work you produced for this step — a commit, notebook, file, or page — before marking it complete. Milestones count as evidence only with submitted work.";
      return null;
    }

    const orderIndex = milestone.orderIndex;
    const earlierOpen = project.milestones.filter(
      (entry) => entry.orderIndex < orderIndex && entry.status !== "completed",
    );

    if (completed && earlierOpen.length > 0) {
      failure = `Finish ${earlierOpen.map((entry) => entry.title).join(", ")} first. Milestones are ordered.`;
      return null;
    }

    if (!completed && project.status === "in_progress") {
      const dependents = project.milestones.filter(
        (entry) => entry.orderIndex > orderIndex && entry.status === "completed",
      );

      if (dependents.length > 0) {
        failure = `Reopen ${dependents.map((entry) => entry.title).join(", ")} first.`;
        return null;
      }
    }

    const milestones = project.milestones.map((entry) =>
      entry.id === milestoneId
        ? {
            ...entry,
            status: completed ? ("completed" as const) : ("pending" as const),
            evidenceUrl: completed ? trimmedUrl : null,
            completedAt: completed ? now : null,
          }
        : entry,
    );

    const started = project.status === "planned" || project.status === "paused";

    return {
      ...project,
      milestones,
      status: completed && started ? "in_progress" : project.status,
      startedAt: project.startedAt ?? (completed ? now : null),
      updatedAt: now,
    };
  });

  if (failure) return { ok: false, message: failure };

  savePreviewWorkspace({ ...workspace, projects });
  return { ok: true };
}

export function setPreviewProjectLinks({
  projectId,
  repoUrl,
  deploymentUrl,
}: {
  projectId: string;
  repoUrl?: string;
  deploymentUrl?: string;
}): { ok: true } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const now = new Date().toISOString();
  let failure: string | null = null;

  const normalise = (value: string | undefined) => {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      failure = "Links must start with http:// or https://.";
      return undefined;
    }

    return trimmed;
  };

  const { projects } = replaceProject(workspace, projectId, (project) => {
    const nextRepo = normalise(repoUrl);
    const nextDeployment = normalise(deploymentUrl);

    if (failure) return null;

    return {
      ...project,
      repoUrl: nextRepo === undefined ? project.repoUrl : nextRepo,
      deploymentUrl:
        nextDeployment === undefined ? project.deploymentUrl : nextDeployment,
      updatedAt: now,
    };
  });

  if (failure) return { ok: false, message: failure };

  savePreviewWorkspace({ ...workspace, projects });
  return { ok: true };
}

export function savePreviewProjectRubric({
  projectId,
  scores,
  reflection,
}: {
  projectId: string;
  scores: ProjectSelfAssessment["scores"];
  reflection: string;
}): { ok: true } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const now = new Date().toISOString();
  let failure: string | null = null;

  const { projects } = replaceProject(workspace, projectId, (project) => {
    if (project.status !== "completed") {
      failure =
        "Score the rubric after the project is complete. Rubric results are self-assessment, not evidence of mastery.";
      return null;
    }

    const selfAssessment: ProjectSelfAssessment = {
      version: 1,
      scores,
      reflection: reflection.trim(),
      updatedAt: now,
    };

    return { ...project, selfAssessment, updatedAt: now };
  });

  if (failure) return { ok: false, message: failure };

  savePreviewWorkspace({ ...workspace, projects });
  return { ok: true };
}

export function deletePreviewProject(
  projectId: string,
): { ok: true } | { ok: false; message: string } {
  const workspace = loadPreviewWorkspace();
  const project = workspace.projects.find((entry) => entry.id === projectId);

  if (!project) return { ok: false, message: "That project no longer exists." };

  savePreviewWorkspace({
    ...workspace,
    projects: workspace.projects.filter((entry) => entry.id !== projectId),
    evidence: workspace.evidence.filter(
      (entry) => !(entry.sourceType === "project" && entry.sourceId === projectId),
    ),
  });

  return { ok: true };
}

type CareerPreviewResult = { ok: true; message: string } | { ok: false; message: string };

function isWorkLink(value: string) {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function startPreviewCareerExperiment(
  careerSlug: CareerTrackSlug,
): CareerPreviewResult {
  const definition = getCareerExperimentForTrack(careerSlug);

  if (!definition) {
    return { ok: false, message: "That experiment no longer exists." };
  }

  const workspace = loadPreviewWorkspace();

  if (
    workspace.careerExperiments.some(
      (experiment) => experiment.careerSlug === careerSlug,
    )
  ) {
    return {
      ok: false,
      message:
        "You already have this experiment. Finish it, or clear the result and start again.",
    };
  }

  const now = new Date().toISOString();

  savePreviewWorkspace({
    ...workspace,
    careerExperiments: [
      {
        id: createId(),
        careerSlug,
        title: definition.title,
        brief: definition.brief,
        status: "in_progress",
        reflection: null,
        reflectionText: "",
        outputUrl: null,
        startedAt: now,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      ...workspace.careerExperiments,
    ],
  });

  return {
    ok: true,
    message: `${definition.title} is now listed as tried. Your start date is recorded; nothing is counted as study time until you run a session.`,
  };
}

export function completePreviewCareerExperiment({
  careerSlug,
  reflection,
  reflectionText,
  outputUrl,
}: {
  careerSlug: CareerTrackSlug;
  reflection: CareerExperimentReflection;
  reflectionText: string;
  outputUrl: string;
}): CareerPreviewResult {
  const definition = getCareerExperimentForTrack(careerSlug);

  if (!definition) {
    return { ok: false, message: "That experiment no longer exists." };
  }

  const ratings = [
    reflection.interest,
    reflection.difficulty,
    reflection.enjoyment,
    reflection.willingness,
  ];

  if (!ratings.every(isReflectionRating)) {
    return {
      ok: false,
      message: "Answer all four reflection questions with a whole number from 1 to 5.",
    };
  }

  const link = outputUrl.trim();

  if (!isWorkLink(link)) {
    return {
      ok: false,
      message:
        "Add the link to the work you produced before marking this tested. It must start with http:// or https://.",
    };
  }

  if (reflectionText.trim().length > MAX_REFLECTION_TEXT_LENGTH) {
    return {
      ok: false,
      message: "That reflection is longer than this field can hold.",
    };
  }

  const workspace = loadPreviewWorkspace();
  const record = workspace.careerExperiments.find(
    (entry) => entry.careerSlug === careerSlug,
  );

  if (!record) {
    return {
      ok: false,
      message: "Start the experiment first, so the date you began it stays honest.",
    };
  }

  if (record.status === "completed") {
    return {
      ok: false,
      message:
        "This experiment is already recorded as tested. Clear the result if you want to redo it.",
    };
  }

  const now = new Date().toISOString();

  savePreviewWorkspace({
    ...workspace,
    careerExperiments: workspace.careerExperiments.map((entry) =>
      entry.id === record.id
        ? {
            ...entry,
            status: "completed" as const,
            reflection,
            reflectionText: reflectionText.trim(),
            outputUrl: link,
            completedAt: now,
            updatedAt: now,
          }
        : entry,
    ),
  });

  const trackName = getCareerTrack(careerSlug)?.name ?? careerSlug;
  const kindLabel = CAREER_EXPERIMENT_KIND_META[definition.kind].label;

  return {
    ok: true,
    message: `${trackName} is recorded as tested through a ${kindLabel} experiment, with the work you linked. The ranking below now uses your reflection.`,
  };
}

export function clearPreviewCareerExperiment(
  careerSlug: CareerTrackSlug,
): CareerPreviewResult {
  const workspace = loadPreviewWorkspace();
  const record = workspace.careerExperiments.find(
    (entry) => entry.careerSlug === careerSlug,
  );

  if (!record) {
    return { ok: false, message: "That experiment result no longer exists." };
  }

  savePreviewWorkspace({
    ...workspace,
    careerExperiments: workspace.careerExperiments.filter(
      (entry) => entry.careerSlug !== careerSlug,
    ),
  });

  return {
    ok: true,
    message:
      "That experiment result was removed, so it no longer affects your ranking. The role is untested again.",
  };
}

export function savePreviewCareerOverride({
  specialization,
  alternative,
  reason,
}: {
  specialization: CareerTrackSlug;
  alternative: CareerTrackSlug;
  reason: string;
}): CareerPreviewResult {
  if (specialization === alternative) {
    return {
      ok: false,
      message: "Pick two different roles, so the comparison stays meaningful.",
    };
  }

  const trimmed = reason.trim();

  if (trimmed.length < MIN_OVERRIDE_REASON_LENGTH) {
    return {
      ok: false,
      message: `Write at least ${MIN_OVERRIDE_REASON_LENGTH} characters so your reasoning stays readable later.`,
    };
  }

  if (trimmed.length > MAX_OVERRIDE_REASON_LENGTH) {
    return { ok: false, message: "That reason is longer than this field can hold." };
  }

  const workspace = loadPreviewWorkspace();
  const now = new Date().toISOString();
  const existing = workspace.careerPreferences[0];

  savePreviewWorkspace({
    ...workspace,
    careerPreferences: [
      {
        id: existing?.id ?? createId(),
        specializationChoice: specialization,
        alternativeChoice: alternative,
        overrideReason: trimmed,
        updatedAt: now,
      },
    ],
  });

  return {
    ok: true,
    message:
      "Your choice and your reason are saved and shown above the ranking. The ranking itself is unchanged.",
  };
}

export function clearPreviewCareerOverride(): CareerPreviewResult {
  const workspace = loadPreviewWorkspace();

  if (workspace.careerPreferences.length === 0) {
    return { ok: false, message: "No recorded choice to remove." };
  }

  savePreviewWorkspace({ ...workspace, careerPreferences: [] });

  return {
    ok: true,
    message: "Your recorded choice was removed. The ranking still stands on its own.",
  };
}
