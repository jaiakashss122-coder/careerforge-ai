import { z } from "zod";
import { CAREER_TRACK_SLUGS } from "@/lib/career/tracks";
import {
  CAREER_STATUSES,
  LEARNING_PREFERENCE_VALUES,
  SESSION_LENGTH_VALUES,
  SKILL_LEVELS,
  TOOL_VALUES,
  YEAR_OF_STUDY,
} from "@/lib/profile/constants";

const skillLevelSchema = z.enum(SKILL_LEVELS);

export const profileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your name so the workspace can address you.")
      .max(80, "Keep your name under 80 characters."),
    degree: z
      .string()
      .trim()
      .min(2, "Add your degree or programme.")
      .max(100, "Keep this under 100 characters."),
    degreeSpecialization: z
      .string()
      .trim()
      .max(100, "Keep this under 100 characters."),
    yearOfStudy: z.enum(YEAR_OF_STUDY),
    graduationYear: z
      .number()
      .int()
      .min(2024, "Enter a four-digit graduation year.")
      .max(2040, "Enter a four-digit graduation year.")
      .nullable(),
    pythonLevel: skillLevelSchema,
    sqlLevel: skillLevelSchema,
    webLevel: skillLevelSchema,
    statisticsLevel: skillLevelSchema,
    machineLearningLevel: skillLevelSchema,
    gitLevel: skillLevelSchema,
    careerStatus: z.enum(CAREER_STATUSES),
    targetCareerSlug: z.enum(CAREER_TRACK_SLUGS).nullable(),
    careerNote: z.string().trim().max(500, "Keep this under 500 characters."),
    weeklyHours: z
      .number()
      .int()
      .min(1, "Choose at least 1 hour per week.")
      .max(60, "Keep your weekly target realistic (60 hours or fewer)."),
    preferredSessionMinutes: z.union([
      z.literal(SESSION_LENGTH_VALUES[0]),
      z.literal(SESSION_LENGTH_VALUES[1]),
      z.literal(SESSION_LENGTH_VALUES[2]),
    ]),
    learningPreferences: z
      .array(z.enum(LEARNING_PREFERENCE_VALUES))
      .min(1, "Pick at least one way you like to learn."),
    tools: z.array(z.enum(TOOL_VALUES)).min(
      1,
      "Select at least one tool you can use.",
    ),
    primaryGoal: z
      .string()
      .trim()
      .min(10, "Describe the outcome you want in a sentence or two.")
      .max(500, "Keep this under 500 characters."),
    internshipTargetMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a YYYY-MM value.")
      .nullable(),
    constraints: z.string().trim().max(1000, "Keep this under 1000 characters."),
  })
  .superRefine((value, context) => {
    if (value.careerStatus === "decided" && !value.targetCareerSlug) {
      context.addIssue({
        code: "custom",
        path: ["targetCareerSlug"],
        message: "Choose a target role or switch your status to exploring.",
      });
    }
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, string[]>>;

export type Profile = ProfileInput & {
  id: string;
  email: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileParseResult =
  | { success: true; data: ProfileInput }
  | { success: false; fieldErrors: ProfileFieldErrors; message: string };

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readOptionalText(formData: FormData, name: string) {
  const value = readText(formData, name);
  return value.length > 0 ? value : null;
}

function readNumber(formData: FormData, name: string) {
  const value = readText(formData, name);
  return value.length > 0 ? Number(value) : Number.NaN;
}

export function profileInputFromFormData(formData: FormData) {
  return {
    fullName: readText(formData, "fullName"),
    degree: readText(formData, "degree"),
    degreeSpecialization: readText(formData, "degreeSpecialization"),
    yearOfStudy: readText(formData, "yearOfStudy"),
    graduationYear: readOptionalText(formData, "graduationYear")
      ? readNumber(formData, "graduationYear")
      : null,
    pythonLevel: readText(formData, "pythonLevel"),
    sqlLevel: readText(formData, "sqlLevel"),
    webLevel: readText(formData, "webLevel"),
    statisticsLevel: readText(formData, "statisticsLevel"),
    machineLearningLevel: readText(formData, "machineLearningLevel"),
    gitLevel: readText(formData, "gitLevel"),
    careerStatus: readText(formData, "careerStatus"),
    targetCareerSlug: readOptionalText(formData, "targetCareerSlug"),
    careerNote: readText(formData, "careerNote"),
    weeklyHours: readNumber(formData, "weeklyHours"),
    preferredSessionMinutes: readNumber(formData, "preferredSessionMinutes"),
    learningPreferences: formData.getAll("learningPreferences").map(String),
    tools: formData.getAll("tools").map(String),
    primaryGoal: readText(formData, "primaryGoal"),
    internshipTargetMonth: readOptionalText(formData, "internshipTargetMonth"),
    constraints: readText(formData, "constraints"),
  };
}

export function parseProfileFormData(formData: FormData): ProfileParseResult {
  const parsed = profileSchema.safeParse(profileInputFromFormData(formData));

  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);
    return {
      success: false,
      fieldErrors: flattened.fieldErrors as ProfileFieldErrors,
      message: "Some details need attention before this can be saved.",
    };
  }

  return { success: true, data: parsed.data };
}
