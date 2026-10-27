export type InterviewActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export type StartMockInterviewInput = {
  topics: unknown;
  track: unknown;
  count: unknown;
};

export type RecordInterviewAnswerInput = {
  interviewId: unknown;
  questionId: unknown;
  answerText: unknown;
  rating: unknown;
};

export type FinishMockInterviewInput = {
  interviewId: unknown;
};

export type RemoveMockInterviewInput = {
  interviewId: unknown;
};

export type RemoveInterviewAttemptInput = {
  attemptId: unknown;
};

export type SaveJobApplicationInput = {
  company: unknown;
  roleTitle: unknown;
  jobUrl: unknown;
  location: unknown;
  sourceKind: unknown;
  status: unknown;
  appliedOn: unknown;
  nextAction: unknown;
  nextActionOn: unknown;
  notes: unknown;
  description: unknown;
};

export type UpdateApplicationProgressInput = {
  applicationId: unknown;
  status: unknown;
  appliedOn: unknown;
  nextAction: unknown;
  nextActionOn: unknown;
  notes: unknown;
  description: unknown;
};

export type RemoveJobApplicationInput = {
  applicationId: unknown;
};
