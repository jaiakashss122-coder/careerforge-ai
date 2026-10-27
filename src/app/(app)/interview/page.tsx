import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InterviewPrep } from "@/components/interview/interview-prep";
import { getViewer } from "@/lib/auth/viewer";
import { loadServerWorkspace } from "@/lib/workspace/load";
import { createEmptyWorkspace } from "@/lib/workspace/types";

export const metadata: Metadata = {
  title: "Interview Preparation",
};

export default async function InterviewPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  if (viewer.mode === "preview") {
    return (
      <InterviewPrep mode="preview" initialWorkspace={createEmptyWorkspace()} />
    );
  }

  const workspace = await loadServerWorkspace();

  return <InterviewPrep mode={viewer.mode} initialWorkspace={workspace} />;
}
