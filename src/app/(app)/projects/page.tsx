import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectLab } from "@/components/projects/project-lab";
import { getLatestAssessmentRecord } from "@/lib/assessment/repository";
import { getViewer } from "@/lib/auth/viewer";
import { listSkillEvidenceRecords } from "@/lib/evidence/repository";
import { getCurrentProfile } from "@/lib/profile/repository";
import { buildReadinessContext } from "@/lib/projects/readiness";
import { listProjectRecords } from "@/lib/projects/repository";
import { getActiveRoadmapRecord } from "@/lib/roadmap/repository";

export const metadata: Metadata = {
  title: "Project Lab",
};

export default async function ProjectsPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  if (viewer.mode === "preview") {
    return (
      <ProjectLab
        mode="preview"
        initialProjects={[]}
        initialEvidence={[]}
        initialReadinessContext={null}
        initialProfile={null}
        initialHasAssessment={false}
      />
    );
  }

  const profile = await getCurrentProfile();
  const [assessment, roadmap, projects, evidence] = await Promise.all([
    getLatestAssessmentRecord(),
    getActiveRoadmapRecord(),
    listProjectRecords(),
    listSkillEvidenceRecords(),
  ]);

  return (
    <ProjectLab
      mode={viewer.mode}
      initialProjects={projects}
      initialEvidence={evidence}
      initialReadinessContext={buildReadinessContext({
        assessment: assessment?.summary ?? null,
        roadmap,
        projects,
        weeklyHours: profile?.weeklyHours ?? 10,
      })}
      initialProfile={profile}
      initialHasAssessment={assessment !== null}
    />
  );
}
