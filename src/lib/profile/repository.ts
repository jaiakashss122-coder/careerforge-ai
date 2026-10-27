import { cache } from "react";
import { getViewer } from "@/lib/auth/viewer";
import { isCareerTrackSlug, type CareerTrackSlug } from "@/lib/career/tracks";
import {
  CAREER_STATUSES,
  LEARNING_PREFERENCE_VALUES,
  SESSION_LENGTH_VALUES,
  SKILL_LEVELS,
  TOOL_VALUES,
  YEAR_OF_STUDY,
  type CareerStatus,
  type LearningPreference,
  type SessionLength,
  type SkillLevel,
  type ToolId,
  type YearOfStudy,
} from "@/lib/profile/constants";
import type { Profile, ProfileInput } from "@/lib/profile/schema";
import type {
  ProfileRow,
  ProfileUpdate,
} from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asSkillLevel(value: string): SkillLevel {
  return SKILL_LEVELS.includes(value as SkillLevel)
    ? (value as SkillLevel)
    : "unassessed";
}

function asCareerStatus(value: string): CareerStatus {
  return CAREER_STATUSES.includes(value as CareerStatus)
    ? (value as CareerStatus)
    : "undecided";
}

function asYearOfStudy(value: string): YearOfStudy {
  return YEAR_OF_STUDY.includes(value as YearOfStudy)
    ? (value as YearOfStudy)
    : "Other";
}

function asTargetCareer(value: string | null): CareerTrackSlug | null {
  return value && isCareerTrackSlug(value) ? value : null;
}

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    degree: row.degree,
    degreeSpecialization: row.degree_specialization,
    yearOfStudy: asYearOfStudy(row.year_of_study),
    graduationYear: row.graduation_year,
    pythonLevel: asSkillLevel(row.self_reported_python),
    sqlLevel: asSkillLevel(row.self_reported_sql),
    webLevel: asSkillLevel(row.self_reported_web),
    statisticsLevel: asSkillLevel(row.self_reported_statistics),
    machineLearningLevel: asSkillLevel(row.self_reported_ml),
    gitLevel: asSkillLevel(row.self_reported_git),
    careerStatus: asCareerStatus(row.career_status),
    targetCareerSlug: asTargetCareer(row.target_career_slug),
    careerNote: row.career_note,
    weeklyHours: row.weekly_hours,
    preferredSessionMinutes: SESSION_LENGTH_VALUES.includes(
      row.preferred_session_minutes as SessionLength,
    )
      ? (row.preferred_session_minutes as SessionLength)
      : 45,
    learningPreferences: row.learning_preferences.filter((value) =>
      LEARNING_PREFERENCE_VALUES.includes(value as LearningPreference),
    ) as LearningPreference[],
    tools: row.tools.filter((value) =>
      TOOL_VALUES.includes(value as ToolId),
    ) as ToolId[],
    primaryGoal: row.primary_goal,
    internshipTargetMonth: row.internship_target_month,
    constraints: row.constraints_note,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function profileInputToUpdate(profile: ProfileInput): ProfileUpdate {
  return {
    full_name: profile.fullName,
    degree: profile.degree,
    degree_specialization: profile.degreeSpecialization,
    year_of_study: profile.yearOfStudy,
    graduation_year: profile.graduationYear,
    self_reported_python: profile.pythonLevel,
    self_reported_sql: profile.sqlLevel,
    self_reported_web: profile.webLevel,
    self_reported_statistics: profile.statisticsLevel,
    self_reported_ml: profile.machineLearningLevel,
    self_reported_git: profile.gitLevel,
    career_status: profile.careerStatus,
    target_career_slug: profile.targetCareerSlug,
    career_note: profile.careerNote,
    weekly_hours: profile.weeklyHours,
    preferred_session_minutes: profile.preferredSessionMinutes,
    learning_preferences: profile.learningPreferences,
    tools: profile.tools,
    primary_goal: profile.primaryGoal,
    internship_target_month: profile.internshipTargetMonth,
    constraints_note: profile.constraints,
  };
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const viewer = await getViewer();

  if (viewer.mode !== "supabase" || !viewer.user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", viewer.user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile lookup failed:", error.code ?? error.message);
    throw new Error("Your profile could not be loaded.");
  }

  return data ? rowToProfile(data) : null;
});
