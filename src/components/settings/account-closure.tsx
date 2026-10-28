"use client";

import { LogOut, ShieldOff } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signOutAction } from "@/lib/auth/actions";
import {
  ACCOUNT_CLOSURE_CONFIRM_WORD,
  ACCOUNT_DATA_TABLES,
  CASCADE_ONLY_TABLES,
} from "@/lib/workspace/tables";
import { deleteAccountAction } from "@/lib/workspace/actions";

/**
 * Closing an account deletes every row this app can reach and then says what it
 * could not reach. The sign-in lives in the authentication service, and the
 * only key that could delete it is the service-role key this project refuses to
 * hold, so the remaining step is handed over with the learner's own id filled
 * in rather than hidden behind a button that would not work.
 *
 * Reached only from /account/close, which is outside the signed-in shell: after
 * the profile row is gone the shell would redirect to onboarding and the
 * instructions on the other half of this screen would never be seen.
 */
export function AccountClosureControls() {
  const [confirming, setConfirming] = useState(false);
  const [word, setWord] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState<{ userId: string; message: string } | null>(
    null,
  );

  async function handleClose() {
    setPending(true);
    setError(null);

    try {
      const result = await deleteAccountAction(word);
      if (result.ok) {
        setClosed({ userId: result.userId, message: result.message });
        setConfirming(false);
        setWord("");
      } else {
        setError(result.message);
      }
    } catch {
      setError(
        "The request did not reach the server, so nothing was deleted. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (closed) {
    return (
      <div className="space-y-3">
        <Alert variant="success" title="Every record this app holds for you is deleted">
          {closed.message}
        </Alert>
        <Alert variant="warning" title="One thing remains, and this app cannot remove it">
          Your sign-in — the email address and the password hash — is stored by
          Supabase&apos;s authentication service, not in any table this
          application can write. Deleting it needs a key this project never
          holds. Do it yourself, in the Supabase dashboard under
          <strong> Authentication → Users </strong>, or in the SQL editor:
          <code className="mt-2 block rounded-lg bg-surface/70 px-3 py-2 text-[11px] leading-5 break-all">
            {`delete from auth.users where id = '${closed.userId}';`}
          </code>
          Your records are already gone, so nothing is left to lose. Until you
          do it, this account can still sign in — and because your profile row is
          deleted, signing back in restarts onboarding rather than showing your
          old workspace.
        </Alert>
        <form action={signOutAction}>
          <Button type="submit" variant="danger" size="sm">
            <LogOut aria-hidden="true" className="size-4" />
            Sign out now
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-muted">
        {`This deletes all ${ACCOUNT_DATA_TABLES.length} tables this account owns — the profile row, every assessment with its answers, roadmaps with their tasks, study sessions, projects with their milestones, skill evidence, career experiments with your reflections, your specialization choice, practice interviews with every written answer, saved roles with their posting text, the wording you saved for each application document, tutor conversations with their messages, saved prompts and the AI usage counters — plus ${CASCADE_ONLY_TABLES.length} child tables that leave through their parent. Nothing is kept, and it cannot be undone. Export a copy first if you need one.`}
      </p>

      {!confirming ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setConfirming(true);
            setError(null);
          }}
        >
          <ShieldOff aria-hidden="true" className="size-4" />
          Close this account
        </Button>
      ) : null}

      {confirming ? (
        <div className="space-y-3 rounded-xl border border-danger/30 bg-danger/8 p-4">
          <Alert variant="danger" title="This deletes the workspace and the profile">
            Deleting your records leaves the sign-in standing, because this app
            has no permission to remove it and will not pretend otherwise. After
            the deletion you will still be signed in to an account whose records
            are gone, and the screen will tell you the one step left to take.
          </Alert>

          <div className="space-y-1.5">
            <Label htmlFor="account-closure-confirmation">
              Type {ACCOUNT_CLOSURE_CONFIRM_WORD} to confirm
            </Label>
            <Input
              id="account-closure-confirmation"
              value={word}
              onChange={(event) => setWord(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="max-w-56"
            />
          </div>

          {error ? (
            <Alert variant="warning" title="Nothing was deleted">
              {error}
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleClose}
              disabled={pending || word !== ACCOUNT_CLOSURE_CONFIRM_WORD}
            >
              <ShieldOff aria-hidden="true" className="size-4" />
              {pending
                ? "Deleting…"
                : `Delete all ${ACCOUNT_DATA_TABLES.length} record sets`}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setConfirming(false);
                setWord("");
                setError(null);
              }}
            >
              Keep my account
            </Button>
            <a
              href="/settings/export"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Export first
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
