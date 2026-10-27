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
import { readJobDescription } from "@/lib/interview/description";
import {
  MOCK_INTERVIEW_MAX_QUESTIONS,
  MOCK_INTERVIEW_MIN_QUESTIONS,
  buildInterviewEvidence,
  chooseMockQuestions,
  summarizeInterview,
} from "@/lib/interview/mock";
import { getInterviewQuestion } from "@/lib/interview/questions";
import {
  ANSWER_RATING_META,
  APPLICATION_STATUS_META,
  MAX_ANSWER_LENGTH,
  MAX_APPLICATION_FIELD_LENGTH,
  MAX_JOB_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  MIN_JOB_DESCRIPTION_LENGTH,
  isAnswerRating,
  isApplicationSourceKind,
  isApplicationStatus,
  isInterviewTopic,
  type AnswerRating,
  type ApplicationSourceKind,
  type ApplicationStatus,
  type InterviewAttemptRecord,
  type InterviewTopic,
  type JobApplicationRecord,
  type MockInterviewRecord,
} from "@/lib/interview/types";
import {
  buildSkillProofs,
  draftFingerprint,
} from "@/lib/materials/backing";
import {
  MATERIAL_KIND_META,
  MAX_DRAFT_LENGTH,
  MIN_DRAFT_LENGTH,
  isDraftBuiltFrom,
  isMaterialKind,
  type MaterialDraftRecord,
  type MaterialKind,
} from "@/lib/materials/types";
import { loadPreviewProfile } from "@/lib/preview/profile-store";
import {
  evaluateProjectCompletion,
  evaluateProjectReadiness,
  buildReadinessContext,
  buildProjectEvidence,
} from "@/lib/projects/readiness";
import { getProjectTemplate } from "@/lib/projects/templates";
import { SKILLS } from "@/lib/skills/catalog";
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
    mockInterviews: Array.isArray(value.mockInterviews)
      ? value.mockInterviews.filter(isMockInterview)
      : [],
    interviewAttempts: Array.isArray(value.interviewAttempts)
      ? value.interviewAttempts.filter(isInterviewAttempt)
      : [],
    jobApplications: Array.isArray(value.jobApplications)
      ? value.jobApplications.filter(isJobApplication)
      : [],
    materials: Array.isArray(value.materials)
      ? value.materials.filter(isMaterialDraft).map(readableFingerprint)
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

type InterviewPreviewResult = CareerPreviewResult;

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

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.length <= 120)
  );
}

function isMockInterview(value: unknown): value is MockInterviewRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    Array.isArray(value.topics) &&
    value.topics.every(isInterviewTopic) &&
    isStringList(value.questionIds) &&
    value.questionIds.every((id) => getInterviewQuestion(id) !== null) &&
    typeof value.startedAt === "string" &&
    (value.completedAt === null || typeof value.completedAt === "string")
  );
}

function isInterviewAttempt(value: unknown): value is InterviewAttemptRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.questionId === "string" &&
    getInterviewQuestion(value.questionId) !== null &&
    typeof value.topic === "string" &&
    isInterviewTopic(value.topic) &&
    typeof value.prompt === "string" &&
    typeof value.answerText === "string" &&
    typeof value.rating === "string" &&
    isAnswerRating(value.rating) &&
    isStringList(value.skills) &&
    (value.interviewId === null || typeof value.interviewId === "string") &&
    typeof value.createdAt === "string"
  );
}

function isJobApplication(value: unknown): value is JobApplicationRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.company === "string" &&
    typeof value.roleTitle === "string" &&
    (value.jobUrl === null || typeof value.jobUrl === "string") &&
    (value.location === null || typeof value.location === "string") &&
    typeof value.sourceKind === "string" &&
    isApplicationSourceKind(value.sourceKind) &&
    typeof value.status === "string" &&
    isApplicationStatus(value.status) &&
    (value.appliedOn === null || typeof value.appliedOn === "string") &&
    (value.nextAction === null || typeof value.nextAction === "string") &&
    (value.nextActionOn === null || typeof value.nextActionOn === "string") &&
    isStringList(value.skills) &&
    typeof value.description === "string" &&
    typeof value.notes === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isMaterialDraft(value: unknown): value is MaterialDraftRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    isMaterialKind(value.kind) &&
    typeof value.content === "string" &&
    (value.targetRole === null || typeof value.targetRole === "string") &&
    (value.applicationId === null || typeof value.applicationId === "string") &&
    (value.builtFrom === null || isRecord(value.builtFrom)) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

/**
 * A draft whose own text still reads correctly is kept even when the fingerprint
 * beside it does not: the wording belongs to the learner, and losing it because a
 * count field was damaged would be worse than losing the staleness check. The
 * fingerprint is then reported as missing, never filled in with guesses.
 */
function readableFingerprint(draft: MaterialDraftRecord): MaterialDraftRecord {
  return {
    ...draft,
    builtFrom: isDraftBuiltFrom(draft.builtFrom) ? draft.builtFrom : null,
  };
}

function tooLong(value: string, limit: number, label: string) {
  return value.length > limit
    ? { ok: false as const, message: `${label} is longer than ${limit} characters, which is what this field can hold.` }
    : null;
}

function isDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function startPreviewMockInterview({
  topics,
  track,
  count,
}: {
  topics: InterviewTopic[];
  track: CareerTrackSlug | null;
  count: number;
}): InterviewPreviewResult {
  if (topics.length === 0) {
    return { ok: false, message: "Pick at least one area to practise." };
  }

  if (!topics.every(isInterviewTopic)) {
    return {
      ok: false,
      message: "An area you picked is not one this app asks about.",
    };
  }

  if (
    !Number.isInteger(count) ||
    count < MOCK_INTERVIEW_MIN_QUESTIONS ||
    count > MOCK_INTERVIEW_MAX_QUESTIONS
  ) {
    return {
      ok: false,
      message: `Choose a whole number of questions between ${MOCK_INTERVIEW_MIN_QUESTIONS} and ${MOCK_INTERVIEW_MAX_QUESTIONS}.`,
    };
  }

  const workspace = loadPreviewWorkspace();
  const plan = chooseMockQuestions({
    topics,
    track,
    count,
    attempts: workspace.interviewAttempts,
  });

  if (plan.questionIds.length === 0) {
    return {
      ok: false,
      message: "This app has no questions for that combination, so there is nothing to run.",
    };
  }

  const now = new Date().toISOString();

  savePreviewWorkspace({
    ...workspace,
    mockInterviews: [
      {
        id: createId(),
        label: plan.label,
        topics: plan.topics,
        questionIds: plan.questionIds,
        startedAt: now,
        completedAt: null,
      },
      ...workspace.mockInterviews,
    ],
  });

  return {
    ok: true,
    message: `A ${plan.questionIds.length}-question practice interview is open. Nothing is written to your skill records until you finish it.`,
  };
}

export function recordPreviewInterviewAnswer({
  interviewId,
  questionId,
  answerText,
  rating,
}: {
  interviewId: string | null;
  questionId: string;
  answerText: string;
  rating: AnswerRating;
}): InterviewPreviewResult {
  const question = getInterviewQuestion(questionId);

  if (!question) {
    return { ok: false, message: "That question is not one this app asks." };
  }

  if (!isAnswerRating(rating)) {
    return {
      ok: false,
      message: "Choose one of the three answers about how it went.",
    };
  }

  const text = answerText.trim();
  const tooLongNotice = tooLong(text, MAX_ANSWER_LENGTH, "That written answer");

  if (tooLongNotice) return tooLongNotice;

  const workspace = loadPreviewWorkspace();
  const interview = interviewId
    ? workspace.mockInterviews.find((entry) => entry.id === interviewId)
    : null;

  if (interviewId && !interview) {
    return { ok: false, message: "That interview is not open in this browser." };
  }

  if (interview?.completedAt) {
    return {
      ok: false,
      message:
        "That interview is already finished, so its answers are closed. Start another one to practise again.",
    };
  }

  if (interview && !interview.questionIds.includes(question.id)) {
    return { ok: false, message: "That question is not part of this interview." };
  }

  if (
    workspace.interviewAttempts.some(
      (attempt) =>
        attempt.questionId === question.id &&
        (interviewId === null || attempt.interviewId === interviewId),
    )
  ) {
    return {
      ok: false,
      message:
        "You have already rated that question in this interview. Remove the answer first if you want to change it.",
    };
  }

  savePreviewWorkspace({
    ...workspace,
    interviewAttempts: [
      {
        id: createId(),
        questionId: question.id,
        topic: question.topic,
        // Copied at the moment of answering, so a later edit to the bank
        // cannot change what this learner was asked.
        prompt: question.prompt,
        answerText: text,
        rating,
        skills: question.skills,
        interviewId,
        createdAt: new Date().toISOString(),
      },
      ...workspace.interviewAttempts,
    ],
  });

  return {
    ok: true,
    message: `Recorded as “${ANSWER_RATING_META[rating].label}”. No skill record is written yet; a finished interview is what writes those.`,
  };
}

export function removePreviewInterviewAttempt(
  attemptId: string,
): InterviewPreviewResult {
  const workspace = loadPreviewWorkspace();
  const attempt = workspace.interviewAttempts.find(
    (entry) => entry.id === attemptId,
  );

  if (!attempt) {
    return { ok: false, message: "That answer no longer exists." };
  }

  const interview = workspace.mockInterviews.find(
    (entry) => entry.id === attempt.interviewId,
  );

  if (interview?.completedAt) {
    return {
      ok: false,
      message:
        "That answer belongs to a finished interview. Remove the interview itself to clear everything it wrote.",
    };
  }

  savePreviewWorkspace({
    ...workspace,
    interviewAttempts: workspace.interviewAttempts.filter(
      (entry) => entry.id !== attemptId,
    ),
  });

  return {
    ok: true,
    message: "That answer was removed. It counts toward nothing now.",
  };
}

export function finishPreviewMockInterview(
  interviewId: string,
): InterviewPreviewResult {
  const workspace = loadPreviewWorkspace();
  const interview = workspace.mockInterviews.find(
    (entry) => entry.id === interviewId,
  );

  if (!interview) {
    return { ok: false, message: "That interview is not in this browser." };
  }

  if (interview.completedAt) {
    return { ok: false, message: "That interview is already finished." };
  }

  const outcome = summarizeInterview({
    questionIds: interview.questionIds,
    attempts: workspace.interviewAttempts,
  });

  if (!outcome.ready) {
    return {
      ok: false,
      message: outcome.notReadyMessage ?? "Rate every question first.",
    };
  }

  const completedAt = new Date().toISOString();
  const completed = { ...interview, completedAt };
  const drafts = buildInterviewEvidence({
    interview: completed,
    attempts: workspace.interviewAttempts,
    outcome,
  });

  const existingIds = new Set(
    workspace.evidence
      .filter(
        (record) =>
          record.sourceType === "interview" && record.sourceId === interviewId,
      )
      .map((record) => record.skillSlug),
  );
  const newEvidence = drafts
    .filter((draft) => !existingIds.has(draft.skillSlug))
    .map((draft) => ({
      id: createId(),
      skillSlug: draft.skillSlug,
      sourceType: "interview" as const,
      sourceId: interviewId,
      evidenceLevel: "interview_evidence" as const,
      score: null,
      verified: false,
      notes: draft.notes,
      createdAt: completedAt,
    }));

  savePreviewWorkspace({
    ...workspace,
    mockInterviews: workspace.mockInterviews.map((entry) =>
      entry.id === interviewId ? completed : entry,
    ),
    evidence: [...newEvidence, ...workspace.evidence],
  });

  const evidenceLine =
    newEvidence.length === 0
      ? "No skill record was written, because no question in it was rated “I answered it”."
      : `Written ${newEvidence.length} unverified ${
          newEvidence.length === 1 ? "skill record" : "skill records"
        } at the interview level, one for each skill you rated as answered.`;

  return {
    ok: true,
    message: `Interview finished: ${outcome.covered} of ${outcome.total} questions rated as answered, ${outcome.partial} part-answered, ${outcome.missed} you could not answer. ${evidenceLine}`,
  };
}

export function removePreviewMockInterview(
  interviewId: string,
): InterviewPreviewResult {
  const workspace = loadPreviewWorkspace();
  const interview = workspace.mockInterviews.find(
    (entry) => entry.id === interviewId,
  );

  if (!interview) {
    return { ok: false, message: "That practice interview no longer exists." };
  }

  savePreviewWorkspace({
    ...workspace,
    mockInterviews: workspace.mockInterviews.filter(
      (entry) => entry.id !== interviewId,
    ),
    interviewAttempts: workspace.interviewAttempts.filter(
      (entry) => entry.interviewId !== interviewId,
    ),
    evidence: workspace.evidence.filter(
      (record) =>
        !(record.sourceType === "interview" && record.sourceId === interviewId),
    ),
  });

  return {
    ok: true,
    message:
      "That practice interview, its answers, and the skill records it wrote were removed. Nothing about it stays in your progress.",
  };
}

export function savePreviewJobApplication(input: {
  company: string;
  roleTitle: string;
  jobUrl: string;
  location: string;
  sourceKind: ApplicationSourceKind;
  status: ApplicationStatus;
  appliedOn: string;
  nextAction: string;
  nextActionOn: string;
  notes: string;
  description: string;
}): InterviewPreviewResult {
  const company = input.company.trim();
  const roleTitle = input.roleTitle.trim();
  const jobUrl = input.jobUrl.trim();
  const location = input.location.trim();
  const nextAction = input.nextAction.trim();
  const notes = input.notes.trim();
  const description = input.description.trim();
  const appliedOn = input.appliedOn.trim();
  const nextActionOn = input.nextActionOn.trim();

  if (company === "") {
    return { ok: false, message: "Write the organisation this role is at." };
  }

  if (roleTitle === "") {
    return { ok: false, message: "Write the role title as the posting words it." };
  }

  for (const [value, label] of [
    [company, "The organisation name"],
    [roleTitle, "The role title"],
    [location, "The location"],
    [nextAction, "The next action"],
  ] as const) {
    const notice = tooLong(value, MAX_APPLICATION_FIELD_LENGTH, label);

    if (notice) return notice;
  }

  if (jobUrl !== "" && !isWorkLink(jobUrl)) {
    return {
      ok: false,
      message: "The link must start with http:// or https://, or be left empty.",
    };
  }

  if (jobUrl.length > 500) {
    return { ok: false, message: "That link is too long to save." };
  }

  for (const [value, label] of [
    [appliedOn, "The date you applied"],
    [nextActionOn, "The date of the next action"],
  ] as const) {
    if (value !== "" && !isDay(value)) {
      return { ok: false, message: `${label} needs the date form 2026-10-27.` };
    }
  }

  if (description !== "" && description.length < MIN_JOB_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      message: `A posting has to be at least ${MIN_JOB_DESCRIPTION_LENGTH} characters before anything useful can be read out of it. Paste the responsibilities and requirements, not the title.`,
    };
  }

  const tooLongNotice = tooLong(description, MAX_JOB_DESCRIPTION_LENGTH, "That posting");

  if (tooLongNotice) return tooLongNotice;

  if (notes.length > MAX_NOTES_LENGTH) {
    return { ok: false, message: "Those notes are longer than this field can hold." };
  }

  if (!isApplicationSourceKind(input.sourceKind)) {
    return {
      ok: false,
      message: "Say whether this is an opening you found or a written example.",
    };
  }

  if (!isApplicationStatus(input.status)) {
    return { ok: false, message: "That status is not one this app records." };
  }

  if (input.status === "applied" && appliedOn === "") {
    return {
      ok: false,
      message:
        "Marking this as applied needs the date you sent it, so the record stays checkable.",
    };
  }

  const now = new Date().toISOString();
  const workspace = loadPreviewWorkspace();

  savePreviewWorkspace({
    ...workspace,
    jobApplications: [
      {
        id: createId(),
        company,
        roleTitle,
        jobUrl: jobUrl === "" ? null : jobUrl,
        location: location === "" ? null : location,
        sourceKind: input.sourceKind,
        status: input.status,
        appliedOn: appliedOn === "" ? null : appliedOn,
        nextAction: nextAction === "" ? null : nextAction,
        nextActionOn: nextActionOn === "" ? null : nextActionOn,
        skills: readJobDescription(description).skills.map((skill) => skill.slug),
        description,
        notes,
        createdAt: now,
        updatedAt: now,
      },
      ...workspace.jobApplications,
    ],
  });

  return {
    ok: true,
    message:
      description === ""
        ? "Saved. Without the posting text there is nothing to read a skill out of, so no comparison is shown."
        : `Saved. The comparison below reads the text you pasted against the ${SKILLS.length} skills this app knows.`,
  };
}

export function updatePreviewApplicationProgress(input: {
  applicationId: string;
  status: ApplicationStatus;
  appliedOn: string;
  nextAction: string;
  nextActionOn: string;
  notes: string;
  description: string;
}): InterviewPreviewResult {
  const workspace = loadPreviewWorkspace();
  const application = workspace.jobApplications.find(
    (entry) => entry.id === input.applicationId,
  );

  if (!application) {
    return { ok: false, message: "That saved role is not in this browser." };
  }

  if (!isApplicationStatus(input.status)) {
    return { ok: false, message: "That status is not one this app records." };
  }

  const appliedOn = input.appliedOn.trim();
  const nextActionOn = input.nextActionOn.trim();
  const nextAction = input.nextAction.trim();
  const notes = input.notes.trim();
  const description = input.description.trim();

  if (description !== "" && description.length < MIN_JOB_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      message: `A posting has to be at least ${MIN_JOB_DESCRIPTION_LENGTH} characters before anything useful can be read out of it. Paste the responsibilities and requirements, not the title, or clear the field to store no text at all.`,
    };
  }

  const descriptionNotice = tooLong(
    description,
    MAX_JOB_DESCRIPTION_LENGTH,
    "That posting",
  );

  if (descriptionNotice) return descriptionNotice;

  if (input.status === "applied" && appliedOn === "") {
    return {
      ok: false,
      message:
        "Marking this as applied needs the date you sent it, so the record stays checkable.",
    };
  }

  for (const [value, label] of [
    [appliedOn, "The date you applied"],
    [nextActionOn, "The date of the next action"],
  ] as const) {
    if (value !== "" && !isDay(value)) {
      return { ok: false, message: `${label} needs the date form 2026-10-27.` };
    }
  }

  const actionNotice = tooLong(nextAction, MAX_APPLICATION_FIELD_LENGTH, "The next action");

  if (actionNotice) return actionNotice;

  if (notes.length > MAX_NOTES_LENGTH) {
    return { ok: false, message: "Those notes are longer than this field can hold." };
  }

  const skills = readJobDescription(description).skills.map(
    (skill) => skill.slug,
  );

  savePreviewWorkspace({
    ...workspace,
    jobApplications: workspace.jobApplications.map((entry) =>
      entry.id === input.applicationId
        ? {
            ...entry,
            status: input.status,
            appliedOn: appliedOn === "" ? null : appliedOn,
            nextAction: nextAction === "" ? null : nextAction,
            nextActionOn: nextActionOn === "" ? null : nextActionOn,
            notes,
            description,
            skills,
            updatedAt: new Date().toISOString(),
          }
        : entry,
    ),
  });

  const descriptionLine =
    description === ""
      ? " The posting text was cleared, so no comparison is shown for this role."
      : ` The posting text was saved, and ${skills.length} of the ${SKILLS.length} skills this app knows were found in it.`;

  return {
    ok: true,
    message: `That role now reads “${APPLICATION_STATUS_META[input.status].label}”: ${APPLICATION_STATUS_META[input.status].meaning}${descriptionLine}`,
  };
}

export function removePreviewJobApplication(
  applicationId: string,
): InterviewPreviewResult {
  const workspace = loadPreviewWorkspace();
  const application = workspace.jobApplications.find(
    (entry) => entry.id === applicationId,
  );

  if (!application) {
    return { ok: false, message: "That saved role no longer exists." };
  }

  const removedAt = new Date().toISOString();

  savePreviewWorkspace({
    ...workspace,
    jobApplications: workspace.jobApplications.filter(
      (entry) => entry.id !== applicationId,
    ),
    // Mirrors the `on delete set null` the stored table has: the wording the
    // learner wrote survives, only the pointer to the role goes.
    materials: workspace.materials.map((draft) =>
      draft.applicationId === applicationId
        ? { ...draft, applicationId: null, updatedAt: removedAt }
        : draft,
    ),
  });

  return {
    ok: true,
    message: "That saved role and the text you pasted with it were removed.",
  };
}

/**
 * Saves the learner's own wording for one document, kept beside the generated
 * lines rather than replacing them. One draft per document, so the screen never
 * holds two versions of the same résumé and has to guess which one gets sent.
 * The fingerprint of today's records is taken here, not passed in, so a draft
 * cannot be saved claiming data the workspace does not hold.
 */
export function savePreviewMaterialDraft({
  kind,
  content,
  targetRole,
  applicationId,
}: {
  kind: MaterialKind;
  content: string;
  targetRole: string | null;
  applicationId: string | null;
}): InterviewPreviewResult {
  const workspace = loadPreviewWorkspace();
  const label = MATERIAL_KIND_META[kind].label;
  const text = content.trim();

  if (text.length < MIN_DRAFT_LENGTH) {
    return {
      ok: false,
      message: `That draft is ${text.length} characters, under the ${MIN_DRAFT_LENGTH} this app needs before it calls something a document rather than a title.`,
    };
  }

  const long = tooLong(text, MAX_DRAFT_LENGTH, `That ${label} draft`);
  if (long) return long;

  if (
    applicationId &&
    !workspace.jobApplications.some((entry) => entry.id === applicationId)
  ) {
    return {
      ok: false,
      message: "The role you picked is not saved in this browser.",
    };
  }

  const savedAt = new Date().toISOString();
  const builtFrom = draftFingerprint({
    workspace,
    proofs: buildSkillProofs({ workspace, profile: loadPreviewProfile() }),
    savedAt,
  });
  const existing = workspace.materials.find((draft) => draft.kind === kind);

  const record: MaterialDraftRecord = {
    id: existing?.id ?? createId(),
    kind,
    content: text,
    targetRole,
    applicationId,
    builtFrom,
    createdAt: existing?.createdAt ?? savedAt,
    updatedAt: savedAt,
  };

  savePreviewWorkspace({
    ...workspace,
    materials: [
      record,
      ...workspace.materials.filter((draft) => draft.kind !== kind),
    ],
  });

  return {
    ok: true,
    message: existing
      ? `Your ${label} wording was replaced. This browser keeps one draft per document, so the version you saved before it is gone.`
      : `Your ${label} wording was saved, together with a count of what your records held today so this screen can tell you when they move on.`,
  };
}

export function removePreviewMaterialDraft(
  kind: MaterialKind,
): InterviewPreviewResult {
  const workspace = loadPreviewWorkspace();
  const draft = workspace.materials.find((entry) => entry.kind === kind);

  if (!draft) {
    return {
      ok: false,
      message: `You have no saved ${MATERIAL_KIND_META[kind].label} draft in this browser.`,
    };
  }

  savePreviewWorkspace({
    ...workspace,
    materials: workspace.materials.filter((entry) => entry.kind !== kind),
  });

  return {
    ok: true,
    message: `Your saved ${MATERIAL_KIND_META[kind].label} wording was removed. The lines this app generated are still on screen, because they are read from your records every time.`,
  };
}
