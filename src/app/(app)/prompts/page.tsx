import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  PromptStudio,
  type PromptStudioDefaults,
} from "@/components/prompts/prompt-studio";
import { getAiPublicStatus } from "@/lib/ai/config";
import { evaluateAiQuota, type AiQuotaCheck } from "@/lib/ai/quotas";
import { listAiUsageEvents, listSavedPrompts } from "@/lib/ai/repository";
import type { PublicAiStatus, SavedPromptRecord } from "@/lib/ai/types";
import { getViewer } from "@/lib/auth/viewer";
import { getCareerTrack } from "@/lib/career/tracks";
import {
  CAREER_STATUS_META,
  LEARNING_PREFERENCES,
  TOOLS,
} from "@/lib/profile/constants";
import { getCurrentProfile } from "@/lib/profile/repository";

export const metadata: Metadata = {
  title: "Prompt Studio",
};

const PREVIEW_STATUS: PublicAiStatus = {
  mode: "demo",
  provider: null,
  model: null,
  detail:
    "Preview mode generates prompts from curated templates and saves them in this browser. Live AI requires a signed-in Supabase account.",
};

export default async function PromptsPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  const preview = viewer.mode === "preview";
  const status = preview ? PREVIEW_STATUS : getAiPublicStatus();
  const profile = await getCurrentProfile();
  const track = getCareerTrack(profile?.targetCareerSlug);

  const defaults: PromptStudioDefaults = {
    goal: profile?.primaryGoal ?? "",
    targetRole: track?.name ?? "",
    careerStatus: profile
      ? CAREER_STATUS_META[profile.careerStatus].label
      : "not specified",
    weeklyHours: profile?.weeklyHours ?? 10,
    timeBudget: profile
      ? `${profile.preferredSessionMinutes}-minute sessions`
      : "",
    tools:
      profile?.tools
        .map((value) => TOOLS.find((tool) => tool.value === value)?.label ?? value)
        .join(", ") ?? "",
    teachingStyle:
      profile?.learningPreferences
        .map(
          (value) =>
            LEARNING_PREFERENCES.find((entry) => entry.value === value)?.label ??
            value,
        )
        .join(", ") ?? "",
    constraints: profile?.constraints ?? "",
  };

  let prompts: SavedPromptRecord[] = [];
  let quota: AiQuotaCheck | null = null;

  if (!preview) {
    prompts = await listSavedPrompts();
    try {
      quota = evaluateAiQuota(await listAiUsageEvents());
    } catch {
      quota = null;
    }
  }

  return (
    <PromptStudio
      mode={viewer.mode}
      status={status}
      initialPrompts={prompts}
      initialQuota={quota}
      defaults={defaults}
    />
  );
}
