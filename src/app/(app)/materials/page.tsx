import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MaterialsWorkspace } from "@/components/materials/materials-workspace";
import { getViewer } from "@/lib/auth/viewer";
import { getCurrentProfile } from "@/lib/profile/repository";
import { loadServerWorkspace } from "@/lib/workspace/load";
import { createEmptyWorkspace } from "@/lib/workspace/types";

export const metadata: Metadata = {
  title: "Application Materials",
};

export default async function MaterialsPage() {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  if (viewer.mode === "preview") {
    return (
      <MaterialsWorkspace
        mode="preview"
        initialWorkspace={createEmptyWorkspace()}
        initialProfile={null}
      />
    );
  }

  const [workspace, profile] = await Promise.all([
    loadServerWorkspace(),
    getCurrentProfile(),
  ]);

  return (
    <MaterialsWorkspace
      mode={viewer.mode}
      initialWorkspace={workspace}
      initialProfile={profile}
    />
  );
}
