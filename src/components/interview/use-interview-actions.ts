"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  finishMockInterviewAction,
  recordInterviewAnswerAction,
  removeInterviewAttemptAction,
  removeJobApplicationAction,
  removeMockInterviewAction,
  saveJobApplicationAction,
  startMockInterviewAction,
  updateApplicationProgressAction,
} from "@/lib/interview/actions";
import type {
  AnswerRating,
  ApplicationSourceKind,
  ApplicationStatus,
  InterviewTopic,
} from "@/lib/interview/types";
import type { CareerTrackSlug } from "@/lib/career/tracks";
import {
  finishPreviewMockInterview,
  recordPreviewInterviewAnswer,
  removePreviewInterviewAttempt,
  removePreviewJobApplication,
  removePreviewMockInterview,
  savePreviewJobApplication,
  startPreviewMockInterview,
  updatePreviewApplicationProgress,
} from "@/lib/preview/workspace-store";

type Outcome = { ok: boolean; message?: string };

export type ApplicationDraft = {
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
};

export type ProgressDraft = {
  applicationId: string;
  status: ApplicationStatus;
  appliedOn: string;
  nextAction: string;
  nextActionOn: string;
  notes: string;
  description: string;
};

export type InterviewActions = {
  busyId: string | null;
  error: string | null;
  notice: string | null;
  clearMessages: () => void;
  startInterview: (input: {
    topics: InterviewTopic[];
    track: CareerTrackSlug | null;
    count: number;
  }) => Promise<boolean>;
  recordAnswer: (input: {
    interviewId: string | null;
    questionId: string;
    answerText: string;
    rating: AnswerRating;
  }) => Promise<boolean>;
  removeAnswer: (attemptId: string) => Promise<boolean>;
  finishInterview: (interviewId: string) => Promise<boolean>;
  removeInterview: (interviewId: string) => Promise<boolean>;
  saveApplication: (draft: ApplicationDraft) => Promise<boolean>;
  updateProgress: (draft: ProgressDraft) => Promise<boolean>;
  removeApplication: (applicationId: string) => Promise<boolean>;
};

export function useInterviewActions({
  previewMode,
}: {
  previewMode: boolean;
}): InterviewActions {
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
          "The interview record could not be updated. Reload the page and try again.",
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

  const startInterview = useCallback(
    (input: {
      topics: InterviewTopic[];
      track: CareerTrackSlug | null;
      count: number;
    }) =>
      run("interview:start", () =>
        previewMode
          ? startPreviewMockInterview(input)
          : startMockInterviewAction(input),
      ),
    [previewMode, run],
  );

  const recordAnswer = useCallback(
    (input: {
      interviewId: string | null;
      questionId: string;
      answerText: string;
      rating: AnswerRating;
    }) =>
      run(`answer:${input.questionId}`, () =>
        previewMode
          ? recordPreviewInterviewAnswer(input)
          : recordInterviewAnswerAction({
              interviewId: input.interviewId ?? "",
              questionId: input.questionId,
              answerText: input.answerText,
              rating: input.rating,
            }),
      ),
    [previewMode, run],
  );

  const removeAnswer = useCallback(
    (attemptId: string) =>
      run(`answer:remove:${attemptId}`, () =>
        previewMode
          ? removePreviewInterviewAttempt(attemptId)
          : removeInterviewAttemptAction({ attemptId }),
      ),
    [previewMode, run],
  );

  const finishInterview = useCallback(
    (interviewId: string) =>
      run(`interview:finish:${interviewId}`, () =>
        previewMode
          ? finishPreviewMockInterview(interviewId)
          : finishMockInterviewAction({ interviewId }),
      ),
    [previewMode, run],
  );

  const removeInterview = useCallback(
    (interviewId: string) =>
      run(`interview:remove:${interviewId}`, () =>
        previewMode
          ? removePreviewMockInterview(interviewId)
          : removeMockInterviewAction({ interviewId }),
      ),
    [previewMode, run],
  );

  const saveApplication = useCallback(
    (draft: ApplicationDraft) =>
      run("application:save", () =>
        previewMode
          ? savePreviewJobApplication(draft)
          : saveJobApplicationAction(draft),
      ),
    [previewMode, run],
  );

  const updateProgress = useCallback(
    (draft: ProgressDraft) =>
      run(`progress:${draft.applicationId}`, () =>
        previewMode
          ? updatePreviewApplicationProgress(draft)
          : updateApplicationProgressAction(draft),
      ),
    [previewMode, run],
  );

  const removeApplication = useCallback(
    (applicationId: string) =>
      run(`application:remove:${applicationId}`, () =>
        previewMode
          ? removePreviewJobApplication(applicationId)
          : removeJobApplicationAction({ applicationId }),
      ),
    [previewMode, run],
  );

  return {
    busyId,
    error,
    notice,
    clearMessages,
    startInterview,
    recordAnswer,
    removeAnswer,
    finishInterview,
    removeInterview,
    saveApplication,
    updateProgress,
    removeApplication,
  };
}
