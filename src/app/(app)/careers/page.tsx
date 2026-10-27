import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CareerExplorer } from "@/components/career/career-explorer";
import { getLatestAssessmentRecord } from "@/lib/assessment/repository";
import { getViewer } from "@/lib/auth/viewer";
import {
  getCareerPreferenceRecord,
  listCareerExperimentRecords,
} from "@/lib/career/repository";
import { getCurrentProfile } from "@/lib/profile/repository";
import { listProjectRecords } from "@/lib/projects/repository";

export const metadata: Metadata = {
  title: "Career Explorer",
};

export default async function CareersPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  if (viewer.mode === "preview") {
    return (
      <CareerExplorer
        mode="preview"
        initialSummary={null}
        initialExperiments={[]}
        initialProjects={[]}
        initialPreference={null}
        initialProfile={null}
        initialHasAssessment={false}
      />
    );
  }

  const profile = await getCurrentProfile();
  const [assessment, experiments, projects, preference] = await Promise.all([
    getLatestAssessmentRecord(),
    listCareerExperimentRecords(),
    listProjectRecords(),
    getCareerPreferenceRecord(),
  ]);

  return (
    <CareerExplorer
      mode={viewer.mode}
      initialSummary={assessment?.summary ?? null}
      initialExperiments={experiments}
      initialProjects={projects}
      initialPreference={preference}
      initialProfile={profile}
      initialHasAssessment={assessment !== null}
    />
  );
}
