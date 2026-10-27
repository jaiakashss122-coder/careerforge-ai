import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TutorExperience } from "@/components/tutor/tutor-experience";
import { getAiPublicStatus } from "@/lib/ai/config";
import { evaluateAiQuota, type AiQuotaCheck } from "@/lib/ai/quotas";
import { listAiUsageEvents, listTutorConversations } from "@/lib/ai/repository";
import type { PublicAiStatus, TutorConversationSummary } from "@/lib/ai/types";
import { getViewer } from "@/lib/auth/viewer";
import { getActiveRoadmapRecord } from "@/lib/roadmap/repository";

export const metadata: Metadata = {
  title: "AI Tutor",
};

const PREVIEW_STATUS: PublicAiStatus = {
  mode: "demo",
  provider: null,
  model: null,
  detail:
    "Preview mode stores conversations in this browser and uses curated demo replies. Live AI requires a signed-in Supabase account.",
};

export default async function TutorPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  const preview = viewer.mode === "preview";
  const status = preview ? PREVIEW_STATUS : getAiPublicStatus();

  let conversations: TutorConversationSummary[] = [];
  let quota: AiQuotaCheck | null = null;
  let tasks: {
    id: string;
    weekNumber: number;
    title: string;
    status: string;
  }[] = [];

  if (!preview) {
    conversations = await listTutorConversations();
    const roadmap = await getActiveRoadmapRecord();
    tasks = (roadmap?.tasks ?? [])
      .filter((task) => task.status !== "skipped")
      .map((task) => ({
        id: task.id,
        weekNumber: task.weekNumber,
        title: task.title,
        status: task.status,
      }));

    try {
      quota = evaluateAiQuota(await listAiUsageEvents());
    } catch {
      quota = null;
    }
  }

  return (
    <TutorExperience
      mode={viewer.mode}
      status={status}
      initialConversations={conversations}
      initialQuota={quota}
      tasks={tasks}
    />
  );
}
