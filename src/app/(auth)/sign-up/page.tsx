import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { safeNextPath } from "@/lib/auth/routes";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const viewer = await getViewer();

  if (viewer.mode === "preview") {
    redirect("/dashboard");
  }

  if (viewer.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const next = safeNextPath(params.next, "/onboarding");

  return (
    <AuthShell
      eyebrow="Phase 1"
      title="Create your CareerForge account"
      description="Start with a real profile. Your first assessment, roadmap, and career evidence are built from it."
      footer={
        <p className="text-xs leading-5">
          No fabricated qualifications or achievements. Every skill claim stays
          separate from verified evidence.
        </p>
      }
    >
      <SignUpForm next={next} />
    </AuthShell>
  );
}
