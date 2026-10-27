import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProgressAnalyticsView } from "@/components/progress/progress-analytics";
import { getViewer } from "@/lib/auth/viewer";
import { loadServerWorkspace } from "@/lib/workspace/load";
import { createEmptyWorkspace } from "@/lib/workspace/types";

export const metadata: Metadata = {
  title: "Progress",
};

export default async function ProgressPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  if (viewer.mode === "preview") {
    return (
      <ProgressAnalyticsView
        mode={viewer.mode}
        initialWorkspace={createEmptyWorkspace()}
      />
    );
  }

  const workspace = await loadServerWorkspace({
    includeAssessmentAnswers: true,
  });

  return (
    <ProgressAnalyticsView mode={viewer.mode} initialWorkspace={workspace} />
  );
}
