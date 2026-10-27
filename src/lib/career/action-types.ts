export type CareerActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export type StartCareerExperimentInput = {
  careerSlug: unknown;
};

export type ClearCareerExperimentInput = {
  careerSlug: unknown;
};

export type CompleteCareerExperimentInput = {
  careerSlug: unknown;
  reflection: unknown;
  reflectionText: unknown;
  outputUrl: unknown;
};

export type SaveCareerOverrideInput = {
  specialization: unknown;
  alternative: unknown;
  reason: unknown;
};

export const MIN_OVERRIDE_REASON_LENGTH = 20;
export const MAX_OVERRIDE_REASON_LENGTH = 1200;
export const MAX_REFLECTION_TEXT_LENGTH = 4000;
