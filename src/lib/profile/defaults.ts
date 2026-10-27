import type { Profile, ProfileInput } from "@/lib/profile/schema";

/**
 * Mirrors the profile declared in the project brief. Values are editable and
 * self-reported — they are never treated as verified skill evidence.
 */
export function defaultProfileInput(
  overrides: Partial<ProfileInput> = {},
): ProfileInput {
  return {
    fullName: "",
    degree: "B.Tech CSE",
    degreeSpecialization: "Data Science",
    yearOfStudy: "Second year",
    graduationYear: null,
    pythonLevel: "basic",
    sqlLevel: "beginner",
    webLevel: "foundational",
    statisticsLevel: "unassessed",
    machineLearningLevel: "unassessed",
    gitLevel: "unassessed",
    careerStatus: "undecided",
    targetCareerSlug: null,
    careerNote: "",
    weeklyHours: 10,
    preferredSessionMinutes: 45,
    learningPreferences: [
      "practical-projects",
      "clear-explanations",
      "hands-on-exercises",
      "personalized-guidance",
    ],
    tools: ["vscode", "ai-coding-agent"],
    primaryGoal:
      "Become internship-ready and build long-term data and future-tech career skills.",
    internshipTargetMonth: null,
    constraints: "",
    ...overrides,
  };
}

export function createUnsavedProfile(input: {
  id: string;
  email: string;
  fullName?: string;
}): Profile {
  const now = new Date().toISOString();

  return {
    id: input.id,
    email: input.email,
    ...defaultProfileInput({ fullName: input.fullName ?? "" }),
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
}
