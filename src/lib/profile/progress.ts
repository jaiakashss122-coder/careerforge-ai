import type { ProfileInput } from "@/lib/profile/schema";

export type ProfileChecklistItem = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  required: boolean;
};

export type ProfileChecklist = {
  items: ProfileChecklistItem[];
  requiredComplete: number;
  requiredTotal: number;
  percent: number;
};

export function getProfileChecklist(profile: ProfileInput): ProfileChecklist {
  const items: ProfileChecklistItem[] = [
    {
      id: "name",
      label: "Your name",
      description: "Used across your dashboard and AI tutor prompts.",
      complete: profile.fullName.trim().length >= 2,
      required: true,
    },
    {
      id: "education",
      label: "Education details",
      description: "Degree, specialization, and current year.",
      complete:
        profile.degree.trim().length >= 2 &&
        profile.yearOfStudy.trim().length > 0,
      required: true,
    },
    {
      id: "direction",
      label: "Career direction",
      description: "Undecided is valid — it shapes the exploration plan.",
      complete: profile.careerStatus.trim().length > 0,
      required: true,
    },
    {
      id: "time",
      label: "Weekly availability",
      description: "The plan adapts to the time you actually have.",
      complete: profile.weeklyHours >= 1 && profile.weeklyHours <= 60,
      required: true,
    },
    {
      id: "preferences",
      label: "Learning preferences",
      description: "How you want each session explained and practised.",
      complete: profile.learningPreferences.length > 0,
      required: true,
    },
    {
      id: "tools",
      label: "Tools and environment",
      description: "What you can use for practice and projects.",
      complete: profile.tools.length > 0,
      required: true,
    },
    {
      id: "goal",
      label: "Primary goal",
      description: "The outcome you want this workspace to support.",
      complete: profile.primaryGoal.trim().length >= 10,
      required: true,
    },
    {
      id: "internship",
      label: "Internship target",
      description: "Optional timing helps the plan work backwards.",
      complete: Boolean(profile.internshipTargetMonth),
      required: false,
    },
    {
      id: "constraints",
      label: "Constraints",
      description: "Optional notes about internet, budget, or schedule.",
      complete: profile.constraints.trim().length > 0,
      required: false,
    },
  ];

  const requiredItems = items.filter((item) => item.required);
  const requiredComplete = requiredItems.filter((item) => item.complete).length;

  return {
    items,
    requiredComplete,
    requiredTotal: requiredItems.length,
    percent: Math.round((requiredComplete / requiredItems.length) * 100),
  };
}
