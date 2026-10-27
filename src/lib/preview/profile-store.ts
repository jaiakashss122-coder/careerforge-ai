"use client";

import { createUnsavedProfile } from "@/lib/profile/defaults";
import { profileSchema, type Profile, type ProfileInput } from "@/lib/profile/schema";

const STORAGE_KEY = "careerforge:profile:v1";

export const PREVIEW_PROFILE_UPDATED = "careerforge:preview-profile-updated";
export const PREVIEW_PROFILE_ID = "preview-user";
export const PREVIEW_EMAIL = "preview@careerforge.local";

export function createDefaultPreviewProfile(): Profile {
  return createUnsavedProfile({
    id: PREVIEW_PROFILE_ID,
    email: PREVIEW_EMAIL,
  });
}

export function getPreviewProfileSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function subscribeToPreviewProfile(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(PREVIEW_PROFILE_UPDATED, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(PREVIEW_PROFILE_UPDATED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function parsePreviewProfile(raw: string | null): Profile | null {
  if (!raw) return null;

  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const input = profileSchema.safeParse({
    fullName: record.fullName,
    degree: record.degree,
    degreeSpecialization: record.degreeSpecialization,
    yearOfStudy: record.yearOfStudy,
    graduationYear: record.graduationYear,
    pythonLevel: record.pythonLevel,
    sqlLevel: record.sqlLevel,
    webLevel: record.webLevel,
    statisticsLevel: record.statisticsLevel,
    machineLearningLevel: record.machineLearningLevel,
    gitLevel: record.gitLevel,
    careerStatus: record.careerStatus,
    targetCareerSlug: record.targetCareerSlug,
    careerNote: record.careerNote,
    weeklyHours: record.weeklyHours,
    preferredSessionMinutes: record.preferredSessionMinutes,
    learningPreferences: record.learningPreferences,
    tools: record.tools,
    primaryGoal: record.primaryGoal,
    internshipTargetMonth: record.internshipTargetMonth,
    constraints: record.constraints,
  });

  if (!input.success) {
    return null;
  }

  const createdAt =
    typeof record.createdAt === "string"
      ? record.createdAt
      : new Date().toISOString();

  return {
    id: PREVIEW_PROFILE_ID,
    email: PREVIEW_EMAIL,
    ...input.data,
    onboardingCompleted: record.onboardingCompleted === true,
    createdAt,
    updatedAt:
      typeof record.updatedAt === "string" ? record.updatedAt : createdAt,
  };
}

export function loadPreviewProfile(): Profile | null {
  return parsePreviewProfile(getPreviewProfileSnapshot());
}

export function savePreviewProfile(
  input: ProfileInput,
  existing: Profile | null,
): Profile {
  const now = new Date().toISOString();
  const profile: Profile = {
    id: PREVIEW_PROFILE_ID,
    email: PREVIEW_EMAIL,
    ...input,
    onboardingCompleted: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(PREVIEW_PROFILE_UPDATED));
  return profile;
}

export function clearPreviewProfile() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(PREVIEW_PROFILE_UPDATED));
}
