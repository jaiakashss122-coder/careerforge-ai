"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  completeProjectAction,
  deleteProjectAction,
  reopenProjectAction,
  saveProjectRubricAction,
  setMilestoneStatusAction,
  setProjectLinksAction,
  setProjectStatusAction,
  startProjectAction,
} from "@/lib/projects/actions";
import { getProjectTemplate } from "@/lib/projects/templates";
import type {
  ProjectSelfAssessment,
  ProjectStatus,
} from "@/lib/projects/types";
import {
  deletePreviewProject,
  savePreviewProjectRubric,
  setPreviewMilestoneStatus,
  setPreviewProjectLinks,
  setPreviewProjectStatus,
  startPreviewProject,
} from "@/lib/preview/workspace-store";

type Outcome = { ok: boolean; message?: string };

export type ProjectFeedback = {
  busyId: string | null;
  error: string | null;
  notice: string | null;
  clearMessages: () => void;
  start: (templateSlug: string) => Promise<boolean>;
  setStatus: (projectId: string, status: ProjectStatus) => Promise<boolean>;
  complete: (projectId: string) => Promise<boolean>;
  reopen: (projectId: string) => Promise<boolean>;
  submitMilestone: (input: {
    projectId: string;
    milestoneId: string;
    evidenceUrl: string;
  }) => Promise<boolean>;
  reopenMilestone: (input: {
    projectId: string;
    milestoneId: string;
  }) => Promise<boolean>;
  saveLinks: (input: {
    projectId: string;
    repoUrl?: string;
    deploymentUrl?: string;
  }) => Promise<boolean>;
  saveRubric: (input: {
    projectId: string;
    scores: ProjectSelfAssessment["scores"];
    reflection: string;
  }) => Promise<boolean>;
  remove: (projectId: string) => Promise<boolean>;
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: "planned",
  in_progress: "in progress",
  completed: "completed",
  paused: "paused",
};

export function useProjectFeedback({
  previewMode,
  weeklyHours,
}: {
  previewMode: boolean;
  weeklyHours: number;
}): ProjectFeedback {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, action: () => Outcome | Promise<Outcome>): Promise<boolean> => {
      setBusyId(key);
      setError(null);
      setNotice(null);

      try {
        const result = await action();

        if (!result.ok) {
          setError(result.message ?? "That change could not be saved.");
          return false;
        }

        setNotice(result.message ?? null);
        if (!previewMode) router.refresh();
        return true;
      } catch {
        setError(
          "The project could not be updated. Reload the page and try again.",
        );
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [previewMode, router],
  );

  const clearMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const start = useCallback(
    (templateSlug: string) =>
      run(`start:${templateSlug}`, () => {
        const title = getProjectTemplate(templateSlug)?.title ?? "Project";
        const successMessage = `“${title}” is in your lab. Milestones are ordered, and each one needs a link to the work before it counts.`;

        if (previewMode) {
          const result = startPreviewProject({ templateSlug, weeklyHours });

          return result.ok ? { ok: true as const, message: successMessage } : result;
        }

        return startProjectAction({ templateSlug }).then((result) =>
          result.ok ? { ok: true as const, message: successMessage } : result,
        );
      }),
    [previewMode, run, weeklyHours],
  );

  const setStatus = useCallback(
    (projectId: string, status: ProjectStatus) =>
      run(`${projectId}:status`, () =>
        previewMode
          ? setPreviewProjectStatus(projectId, status)
          : setProjectStatusAction({ projectId, status }).then((result) =>
              result.ok
                ? {
                    ok: true as const,
                    message: `Project marked ${STATUS_LABEL[status]}. Your milestones and evidence were not changed.`,
                  }
                : result,
            ),
      ),
    [previewMode, run],
  );

  const complete = useCallback(
    (projectId: string) =>
      run(`${projectId}:complete`, async () => {
        if (previewMode) {
          const result = setPreviewProjectStatus(projectId, "completed");

          if (!result.ok) return result;

          return {
            ok: true as const,
            message:
              result.evidenceCount > 0
                ? `Project completed. ${result.evidenceCount} unverified skill ${
                    result.evidenceCount === 1 ? "link" : "links"
                  } recorded from the work you submitted.`
                : "Project completed. No new evidence was recorded because it was already on file.",
          };
        }

        return completeProjectAction(projectId);
      }),
    [previewMode, run],
  );

  const reopen = useCallback(
    (projectId: string) =>
      run(`${projectId}:reopen`, async () => {
        if (previewMode) {
          const result = setPreviewProjectStatus(projectId, "in_progress");

          if (!result.ok) return result;

          return {
            ok: true as const,
            message:
              "Project reopened. Its skill evidence was withdrawn, since the work is no longer finished.",
          };
        }

        return reopenProjectAction(projectId);
      }),
    [previewMode, run],
  );

  const submitMilestone = useCallback(
    (input: { projectId: string; milestoneId: string; evidenceUrl: string }) =>
      run(`${input.milestoneId}:complete`, () =>
        previewMode
          ? setPreviewMilestoneStatus({
              projectId: input.projectId,
              milestoneId: input.milestoneId,
              completed: true,
              evidenceUrl: input.evidenceUrl,
            })
          : setMilestoneStatusAction({
              projectId: input.projectId,
              milestoneId: input.milestoneId,
              completed: true,
              evidenceUrl: input.evidenceUrl,
            }),
      ),
    [previewMode, run],
  );

  const reopenMilestone = useCallback(
    (input: { projectId: string; milestoneId: string }) =>
      run(`${input.milestoneId}:reopen`, () =>
        previewMode
          ? setPreviewMilestoneStatus({
              projectId: input.projectId,
              milestoneId: input.milestoneId,
              completed: false,
            })
          : setMilestoneStatusAction({
              projectId: input.projectId,
              milestoneId: input.milestoneId,
              completed: false,
              evidenceUrl: "",
            }),
      ),
    [previewMode, run],
  );

  const saveLinks = useCallback(
    (input: {
      projectId: string;
      repoUrl?: string;
      deploymentUrl?: string;
    }) =>
      run(`${input.projectId}:links`, async () => {
        if (previewMode) {
          const result = setPreviewProjectLinks(input);

          if (!result.ok) return result;

          return { ok: true as const, message: "Project links saved." };
        }

        const result = await setProjectLinksAction({
          projectId: input.projectId,
          repoUrl: input.repoUrl ?? "",
          deploymentUrl: input.deploymentUrl ?? "",
        });

        if (!result.ok) return result;

        return { ok: true as const, message: "Project links saved." };
      }),
    [previewMode, run],
  );

  const saveRubric = useCallback(
    (input: {
      projectId: string;
      scores: ProjectSelfAssessment["scores"];
      reflection: string;
    }) =>
      run(`${input.projectId}:rubric`, () =>
        previewMode
          ? savePreviewProjectRubric(input)
          : saveProjectRubricAction(input).then((result) =>
              result.ok
                ? {
                    ok: true as const,
                    message:
                      "Rubric saved as your own assessment. It is not counted as verified skill evidence.",
                  }
                : result,
            ),
      ),
    [previewMode, run],
  );

  const remove = useCallback(
    (projectId: string) =>
      run(`${projectId}:delete`, async () => {
        if (previewMode) {
          const result = deletePreviewProject(projectId);

          if (!result.ok) return result;

          return {
            ok: true as const,
            message:
              "Project deleted, along with any skill evidence that came from it.",
          };
        }

        return deleteProjectAction(projectId);
      }),
    [previewMode, run],
  );

  return {
    busyId,
    error,
    notice,
    clearMessages,
    start,
    setStatus,
    complete,
    reopen,
    submitMilestone,
    reopenMilestone,
    saveLinks,
    saveRubric,
    remove,
  };
}
