import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getViewer } from "@/lib/auth/viewer";
import { getCurrentProfile } from "@/lib/profile/repository";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  if (viewer.mode === "supabase" && !viewer.user) {
    redirect("/sign-in");
  }

  const profile = await getCurrentProfile();

  if (viewer.mode === "supabase" && !profile?.onboardingCompleted) {
    redirect("/onboarding");
  }

  const email = viewer.mode === "supabase" ? (viewer.user?.email ?? "") : "";

  return (
    <AppShell mode={viewer.mode} email={email} initialProfile={profile}>
      {children}
    </AppShell>
  );
}
