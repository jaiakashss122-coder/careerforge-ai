import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountClosureControls } from "@/components/settings/account-closure";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Close your account",
};

/**
 * This screen lives outside the signed-in shell on purpose. Deleting the profile
 * row makes the shell send a signed-in account to onboarding, and a learner who
 * has just closed their account would be redirected away from the instructions
 * they need before they sign out. Here the only requirement is a session.
 */
export default async function AccountClosurePage() {
  if (!isSupabaseConfigured()) {
    redirect("/settings");
  }

  const viewer = await getViewer();

  if (viewer.mode !== "supabase" || !viewer.user) {
    redirect("/sign-in?next=/account/close");
  }

  return (
    <div className="relative min-h-dvh">
      <div
        aria-hidden="true"
        className="grid-backdrop pointer-events-none absolute inset-x-0 top-0 h-96 opacity-50"
      />

      <header className="relative mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Logo href="/settings" />
        <Badge variant="danger">Irreversible</Badge>
      </header>

      <main
        id="main-content"
        className="relative mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6"
      >
        <div className="space-y-6">
          <div className="space-y-2.5">
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Close the account behind{" "}
              <span className="break-all">{viewer.user.email ?? "this sign-in"}</span>
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              This screen is separate from Settings so that the result stays
              readable after your profile row is gone. Nothing is deleted until
              you type the confirmation phrase below.
            </p>
          </div>

          <Alert variant="warning" title="What this cannot do">
            This application holds no key that can reach Supabase&apos;s
            authentication service. It can delete every record that names you;
            it cannot delete the sign-in itself, and it will not pretend to. The
            screen tells you the remaining step when it is done.
          </Alert>

          <Card>
            <CardContent className="space-y-4">
              <AccountClosureControls />
            </CardContent>
          </Card>

          <a
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back to Settings without deleting anything
          </a>
        </div>
      </main>
    </div>
  );
}
