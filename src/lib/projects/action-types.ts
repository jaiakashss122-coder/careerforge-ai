import type { ProjectRecord } from "@/lib/projects/types";

export type ProjectActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export type StartProjectResult =
  | { ok: true; project: ProjectRecord }
  | {
      ok: false;
      message: string;
      lockReasons?: string[];
    };

export type CompleteProjectResult =
  | {
      ok: true;
      evidenceCount: number;
      message: string;
    }
  | { ok: false; message: string; blockers?: string[] };

export type DeleteProjectResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type StartProjectInput = {
  templateSlug: unknown;
};

export type SetProjectStatusInput = {
  projectId: unknown;
  status: unknown;
};

export type SetMilestoneStatusInput = {
  projectId: unknown;
  milestoneId: unknown;
  completed: unknown;
  evidenceUrl: unknown;
};

export type SetProjectLinksInput = {
  projectId: unknown;
  repoUrl: unknown;
  deploymentUrl: unknown;
};

export type SaveProjectRubricInput = {
  projectId: unknown;
  scores: unknown;
  reflection: unknown;
};
