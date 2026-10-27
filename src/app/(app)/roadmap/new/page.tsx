import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoadmapBuilder } from "@/components/roadmap/roadmap-builder";
import {
  getAssessmentRecordById,
  getLatestAssessmentRecord,
} from "@/lib/assessment/repository";
import { getViewer } from "@/lib/auth/viewer";
import { getActiveRoadmapRecord } from "@/lib/roadmap/repository";

export const metadata: Metadata = {
  title: "New Roadmap",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ assessment?: string }>;
}) {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const preferredAssessmentId =
    typeof params.assessment === "string" ? params.assessment : null;

  if (viewer.mode === "preview") {
    return (
      <RoadmapBuilder
        mode={viewer.mode}
        initialAssessment={null}
        initialRoadmap={null}
        preferredAssessmentId={preferredAssessmentId}
      />
    );
  }

  const assessment =
    preferredAssessmentId && UUID_PATTERN.test(preferredAssessmentId)
      ? await getAssessmentRecordById(preferredAssessmentId)
      : null;
  const latest = assessment ? null : await getLatestAssessmentRecord();
  const roadmap = await getActiveRoadmapRecord();

  return (
    <RoadmapBuilder
      mode={viewer.mode}
      initialAssessment={assessment ?? latest}
      initialRoadmap={roadmap}
      preferredAssessmentId={preferredAssessmentId}
    />
  );
}
