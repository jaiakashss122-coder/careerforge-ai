import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AssessmentResults } from "@/components/assessment/assessment-results";
import { getAssessmentRecordById } from "@/lib/assessment/repository";
import { getViewer } from "@/lib/auth/viewer";
import { getActiveRoadmapRecord } from "@/lib/roadmap/repository";

export const metadata: Metadata = {
  title: "Assessment Results",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AssessmentResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  if (viewer.mode === "supabase") {
    if (!UUID_PATTERN.test(id)) notFound();

    const record = await getAssessmentRecordById(id);
    if (!record) notFound();

    const roadmap = await getActiveRoadmapRecord();

    return (
      <AssessmentResults
        mode={viewer.mode}
        assessmentId={id}
        initialRecord={record}
        initialRoadmap={roadmap}
      />
    );
  }

  return (
    <AssessmentResults
      mode={viewer.mode}
      assessmentId={id}
      initialRecord={null}
      initialRoadmap={null}
    />
  );
}
