import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoadmapExperience } from "@/components/roadmap/roadmap-experience";
import { getLatestAssessmentRecord } from "@/lib/assessment/repository";
import { getViewer } from "@/lib/auth/viewer";
import { getActiveRoadmapRecord } from "@/lib/roadmap/repository";
import { listSessionRecords } from "@/lib/sessions/repository";

export const metadata: Metadata = {
  title: "Learning Roadmap",
};

export default async function RoadmapPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  if (viewer.mode === "supabase") {
    const [roadmap, sessions, assessment] = await Promise.all([
      getActiveRoadmapRecord(),
      listSessionRecords(),
      getLatestAssessmentRecord(),
    ]);

    return (
      <RoadmapExperience
        mode={viewer.mode}
        initialRoadmap={roadmap}
        initialSessions={sessions}
        initialHasAssessment={assessment !== null}
      />
    );
  }

  return (
    <RoadmapExperience
      mode={viewer.mode}
      initialRoadmap={null}
      initialSessions={[]}
      initialHasAssessment={false}
    />
  );
}
