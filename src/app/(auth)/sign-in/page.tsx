import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Alert } from "@/components/ui/alert";
import { safeNextPath } from "@/lib/auth/routes";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const viewer = await getViewer();

  if (viewer.mode === "preview") {
    redirect("/dashboard");
  }

  if (viewer.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const next = safeNextPath(params.next, "/dashboard");
  const linkError =
    params.error === "confirmation-link"
      ? "That confirmation link is invalid or has expired. Request a new one below."
      : null;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description="Continue your profile, evidence, and career exploration without starting over."
      footer={
        <p className="text-xs leading-5">
          Your profile is private to your account and protected by database
          row-level security.
        </p>
      }
    >
      <div className="space-y-5">
        {linkError ? (
          <Alert variant="warning" title="Email link problem">
            {linkError}
          </Alert>
        ) : null}
        <SignInForm next={next} />
        <div className="border-t border-border/70 pt-4">
          <ResendConfirmation />
        </div>
      </div>
    </AuthShell>
  );
}
