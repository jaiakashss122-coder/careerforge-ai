import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getLatestAssessmentRecord } from "@/lib/assessment/repository";
import { getViewer } from "@/lib/auth/viewer";
import { getCurrentProfile } from "@/lib/profile/repository";
import { getActiveRoadmapRecord } from "@/lib/roadmap/repository";
import { listSessionRecords } from "@/lib/sessions/repository";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const requestedTaskId =
    typeof params.task === "string" && params.task.length <= 120
      ? params.task
      : null;

  if (viewer.mode === "preview") {
    return (
      <DashboardOverview
        mode={viewer.mode}
        initialProfile={null}
        initialAssessment={null}
        initialRoadmap={null}
        initialSessions={[]}
        requestedTaskId={null}
      />
    );
  }

  const profile = await getCurrentProfile();
  const [assessment, roadmap, sessions] = await Promise.all([
    getLatestAssessmentRecord(),
    getActiveRoadmapRecord(),
    listSessionRecords(),
  ]);

  if (!assessment) {
    redirect("/assessment");
  }

  return (
    <DashboardOverview
      mode={viewer.mode}
      initialProfile={profile}
      initialAssessment={assessment}
      initialRoadmap={roadmap}
      initialSessions={sessions}
      requestedTaskId={requestedTaskId}
    />
  );
}
