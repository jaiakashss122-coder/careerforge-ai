"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  clearCareerExperimentAction,
  clearCareerOverrideAction,
  completeCareerExperimentAction,
  saveCareerOverrideAction,
  startCareerExperimentAction,
} from "@/lib/career/actions";
import type { CareerTrackSlug } from "@/lib/career/tracks";
import type { CareerExperimentReflection } from "@/lib/career/types";
import {
  clearPreviewCareerExperiment,
  clearPreviewCareerOverride,
  completePreviewCareerExperiment,
  savePreviewCareerOverride,
  startPreviewCareerExperiment,
} from "@/lib/preview/workspace-store";

type Outcome = { ok: boolean; message?: string };

export type CareerActions = {
  busyId: string | null;
  error: string | null;
  notice: string | null;
  clearMessages: () => void;
  startExperiment: (careerSlug: CareerTrackSlug) => Promise<boolean>;
  markTested: (input: {
    careerSlug: CareerTrackSlug;
    reflection: CareerExperimentReflection;
    reflectionText: string;
    outputUrl: string;
  }) => Promise<boolean>;
  clearExperiment: (careerSlug: CareerTrackSlug) => Promise<boolean>;
  saveChoice: (input: {
    specialization: CareerTrackSlug;
    alternative: CareerTrackSlug;
    reason: string;
  }) => Promise<boolean>;
  removeChoice: () => Promise<boolean>;
};

export function useCareerActions({
  previewMode,
}: {
  previewMode: boolean;
}): CareerActions {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async (
      key: string,
      action: () => Outcome | Promise<Outcome>,
    ): Promise<boolean> => {
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
          "The career record could not be updated. Reload the page and try again.",
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

  const startExperiment = useCallback(
    (careerSlug: CareerTrackSlug) =>
      run(`start:${careerSlug}`, () =>
        previewMode
          ? startPreviewCareerExperiment(careerSlug)
          : startCareerExperimentAction({ careerSlug }),
      ),
    [previewMode, run],
  );

  const markTested = useCallback(
    (input: {
      careerSlug: CareerTrackSlug;
      reflection: CareerExperimentReflection;
      reflectionText: string;
      outputUrl: string;
    }) =>
      run(`tested:${input.careerSlug}`, () =>
        previewMode
          ? completePreviewCareerExperiment(input)
          : completeCareerExperimentAction(input),
      ),
    [previewMode, run],
  );

  const clearExperiment = useCallback(
    (careerSlug: CareerTrackSlug) =>
      run(`clear:${careerSlug}`, () =>
        previewMode
          ? clearPreviewCareerExperiment(careerSlug)
          : clearCareerExperimentAction({ careerSlug }),
      ),
    [previewMode, run],
  );

  const saveChoice = useCallback(
    (input: {
      specialization: CareerTrackSlug;
      alternative: CareerTrackSlug;
      reason: string;
    }) =>
      run("choice:save", () =>
        previewMode
          ? savePreviewCareerOverride(input)
          : saveCareerOverrideAction({
              specialization: input.specialization,
              alternative: input.alternative,
              reason: input.reason,
            }),
      ),
    [previewMode, run],
  );

  const removeChoice = useCallback(
    () =>
      run("choice:remove", () =>
        previewMode
          ? clearPreviewCareerOverride()
          : clearCareerOverrideAction(),
      ),
    [previewMode, run],
  );

  return {
    busyId,
    error,
    notice,
    clearMessages,
    startExperiment,
    markTested,
    clearExperiment,
    saveChoice,
    removeChoice,
  };
}
