"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  MAX_OVERRIDE_REASON_LENGTH,
  MAX_REFLECTION_TEXT_LENGTH,
  MIN_OVERRIDE_REASON_LENGTH,
  type CareerActionResult,
  type ClearCareerExperimentInput,
  type CompleteCareerExperimentInput,
  type SaveCareerOverrideInput,
  type StartCareerExperimentInput,
} from "@/lib/career/action-types";
import {
  CAREER_EXPERIMENT_KIND_META,
  getCareerExperimentForTrack,
} from "@/lib/career/experiments";
import {
  completeCareerExperimentRow,
  deleteCareerExperimentRow,
  deleteCareerPreferenceRow,
  insertCareerExperimentRow,
  listCareerExperimentRecords,
  saveCareerPreferenceRow,
} from "@/lib/career/repository";
import {
  getCareerTrack,
  isCareerTrackSlug,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import { MAX_REFLECTION_RATING, MIN_REFLECTION_RATING } from "@/lib/career/types";

const REVALIDATED_PATHS = ["/careers", "/dashboard", "/settings"];

function revalidateCareer() {
  for (const path of REVALIDATED_PATHS) {
    revalidatePath(path);
  }
}

function firstIssue(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

const careerSlugSchema = z
  .unknown()
  .refine(
    (value): value is CareerTrackSlug =>
      typeof value === "string" && isCareerTrackSlug(value),
    "That career role is not one this app knows about.",
  );

const ratingSchema = z
  .number()
  .int()
  .min(MIN_REFLECTION_RATING, "Rate every question from 1 to 5.")
  .max(MAX_REFLECTION_RATING, "Ratings stop at 5.");

const reflectionSchema = z
  .object({
    interest: ratingSchema,
    difficulty: ratingSchema,
    enjoyment: ratingSchema,
    willingness: ratingSchema,
  })
  .strict();

const outputUrlSchema = z
  .string()
  .trim()
  .min(1, "Add the link to the work you produced before marking this tested.")
  .max(500, "That link is too long to save.")
  .refine(
    (value) => /^https?:\/\/\S+$/i.test(value),
    "The link must start with http:// or https://.",
  );

const reflectionTextSchema = z
  .string()
  .trim()
  .max(MAX_REFLECTION_TEXT_LENGTH, "That reflection is longer than this field can hold.");

const overrideReasonSchema = z
  .string()
  .trim()
  .min(
    MIN_OVERRIDE_REASON_LENGTH,
    `Write at least ${MIN_OVERRIDE_REASON_LENGTH} characters so your reasoning stays readable later.`,
  )
  .max(MAX_OVERRIDE_REASON_LENGTH, "That reason is longer than this field can hold.");

export async function startCareerExperimentAction(
  input: StartCareerExperimentInput,
): Promise<CareerActionResult> {
  const parsedSlug = careerSlugSchema.safeParse(input.careerSlug);

  if (!parsedSlug.success) {
    return { ok: false, message: firstIssue(parsedSlug.error, "Choose a role to test.") };
  }

  const definition = getCareerExperimentForTrack(parsedSlug.data);

  if (!definition) {
    return { ok: false, message: "That experiment no longer exists." };
  }

  const existing = await listCareerExperimentRecords();

  if (existing.some((record) => record.careerSlug === parsedSlug.data)) {
    return {
      ok: false,
      message: "You already have this experiment. Finish it, or clear the result and start again.",
    };
  }

  const result = await insertCareerExperimentRow({
    definition,
    kind: definition.kind,
  });

  if (!result.ok) {
    return result;
  }

  revalidateCareer();

  return {
    ok: true,
    message: `${definition.title} is now listed as tried. Your start date is recorded; nothing is counted as study time until you run a session.`,
  };
}

export async function completeCareerExperimentAction(
  input: CompleteCareerExperimentInput,
): Promise<CareerActionResult> {
  const parsedSlug = careerSlugSchema.safeParse(input.careerSlug);

  if (!parsedSlug.success) {
    return { ok: false, message: firstIssue(parsedSlug.error, "Choose a role to test.") };
  }

  const definition = getCareerExperimentForTrack(parsedSlug.data);

  if (!definition) {
    return { ok: false, message: "That experiment no longer exists." };
  }

  const parsedReflection = reflectionSchema.safeParse(input.reflection);

  if (!parsedReflection.success) {
    return {
      ok: false,
      message: firstIssue(
        parsedReflection.error,
        "Answer all four reflection questions with a whole number from 1 to 5.",
      ),
    };
  }

  const parsedOutputUrl = outputUrlSchema.safeParse(input.outputUrl);

  if (!parsedOutputUrl.success) {
    return { ok: false, message: firstIssue(parsedOutputUrl.error, "Add a working link.") };
  }

  const parsedText = reflectionTextSchema.safeParse(input.reflectionText ?? "");

  if (!parsedText.success) {
    return { ok: false, message: firstIssue(parsedText.error, "Shorten the reflection.") };
  }

  const existing = await listCareerExperimentRecords();
  const record = existing.find(
    (item) => item.careerSlug === parsedSlug.data,
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
      message: "This experiment is already recorded as tested. Clear the result if you want to redo it.",
    };
  }

  const result = await completeCareerExperimentRow({
    careerSlug: parsedSlug.data,
    kind: definition.kind,
    reflection: parsedReflection.data,
    reflectionText: parsedText.data,
    outputUrl: parsedOutputUrl.data,
  });

  if (!result.ok) {
    return result;
  }

  revalidateCareer();

  const kindLabel = CAREER_EXPERIMENT_KIND_META[definition.kind].label;
  const trackName = getCareerTrack(parsedSlug.data)?.name ?? parsedSlug.data;

  return {
    ok: true,
    message: `${trackName} is recorded as tested through a ${kindLabel} experiment, with the work you linked. The ranking below now uses your reflection.`,
  };
}

export async function clearCareerExperimentAction(
  input: ClearCareerExperimentInput,
): Promise<CareerActionResult> {
  const parsedSlug = careerSlugSchema.safeParse(input.careerSlug);

  if (!parsedSlug.success) {
    return { ok: false, message: firstIssue(parsedSlug.error, "Choose a role.") };
  }

  const result = await deleteCareerExperimentRow(parsedSlug.data);

  if (!result.ok) {
    return result;
  }

  revalidateCareer();

  return {
    ok: true,
    message: "That experiment result was removed, so it no longer affects your ranking. The role is untested again.",
  };
}

export async function saveCareerOverrideAction(
  input: SaveCareerOverrideInput,
): Promise<CareerActionResult> {
  const parsedSpecialization = careerSlugSchema.safeParse(input.specialization);

  if (!parsedSpecialization.success) {
    return {
      ok: false,
      message: firstIssue(parsedSpecialization.error, "Choose the role you want to work toward."),
    };
  }

  const parsedAlternative = careerSlugSchema.safeParse(input.alternative);

  if (!parsedAlternative.success) {
    return {
      ok: false,
      message: firstIssue(parsedAlternative.error, "Choose a second role to keep in view."),
    };
  }

  if (parsedSpecialization.data === parsedAlternative.data) {
    return {
      ok: false,
      message: "Pick two different roles, so the comparison stays meaningful.",
    };
  }

  const parsedReason = overrideReasonSchema.safeParse(input.reason);

  if (!parsedReason.success) {
    return { ok: false, message: firstIssue(parsedReason.error, "Write why you chose it.") };
  }

  const result = await saveCareerPreferenceRow({
    specialization: parsedSpecialization.data,
    alternative: parsedAlternative.data,
    reason: parsedReason.data,
  });

  if (!result.ok) {
    return result;
  }

  revalidateCareer();

  return {
    ok: true,
    message: "Your choice and your reason are saved and shown above the ranking. The ranking itself is unchanged.",
  };
}

export async function clearCareerOverrideAction(): Promise<CareerActionResult> {
  const result = await deleteCareerPreferenceRow();

  if (!result.ok) {
    return result;
  }

  revalidateCareer();

  return {
    ok: true,
    message: "Your recorded choice was removed. The ranking still stands on its own.",
  };
}
