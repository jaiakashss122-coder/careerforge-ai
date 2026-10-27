import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IntelligenceBoard } from "@/components/intelligence/intelligence-board";
import { getLatestAssessmentRecord } from "@/lib/assessment/repository";
import { getViewer } from "@/lib/auth/viewer";
import {
  getCareerPreferenceRecord,
  listCareerExperimentRecords,
} from "@/lib/career/repository";
import { getCurrentProfile } from "@/lib/profile/repository";

export const metadata: Metadata = {
  title: "Industry Intelligence",
};

export default async function IntelligencePage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  if (viewer.mode === "preview") {
    return (
      <IntelligenceBoard
        mode="preview"
        initialSummary={null}
        initialExperiments={[]}
        initialPreference={null}
        initialProfile={null}
      />
    );
  }

  const profile = await getCurrentProfile();
  const [assessment, experiments, preference] = await Promise.all([
    getLatestAssessmentRecord(),
    listCareerExperimentRecords(),
    getCareerPreferenceRecord(),
  ]);

  return (
    <IntelligenceBoard
      mode={viewer.mode}
      initialSummary={assessment?.summary ?? null}
      initialExperiments={experiments}
      initialPreference={preference}
      initialProfile={profile}
    />
  );
}
