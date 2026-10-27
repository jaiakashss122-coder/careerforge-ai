"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { resendConfirmationAction } from "@/lib/auth/actions";

export function ResendConfirmation() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    resendConfirmationAction,
    undefined,
  );

  const values = state?.status === "error" ? state.values : undefined;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Need a new confirmation email?
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-border bg-surface-raised/50 p-4"
    >
      <div className="space-y-1">
        <Label htmlFor="resend-email">Resend confirmation</Label>
        <p className="text-xs leading-5 text-muted">
          Enter the address you signed up with.
        </p>
      </div>

      {state?.status === "error" ? (
        <Alert variant="danger">{state.message}</Alert>
      ) : null}
      {state?.status === "success" ? (
        <Alert variant="success">{state.message}</Alert>
      ) : null}

      <Input
        id="resend-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={values?.email ?? ""}
        placeholder="you@example.com"
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send link"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
