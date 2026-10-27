import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssessmentExperience } from "@/components/assessment/assessment-experience";
import { getLatestAssessmentRecord } from "@/lib/assessment/repository";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = {
  title: "Skills Assessment",
};

export default async function AssessmentPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  const latest =
    viewer.mode === "supabase" ? await getLatestAssessmentRecord() : null;

  return <AssessmentExperience mode={viewer.mode} initialLatest={latest} />;
}
