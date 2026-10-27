"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  Input,
  Label,
} from "@/components/ui/input";
import { signInAction } from "@/lib/auth/actions";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    undefined,
  );
  const errors = state?.status === "error" ? state.fieldErrors : undefined;
  const values = state?.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state?.status === "error" ? (
        <Alert variant="danger" title="Could not sign in">
          {state.message}
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={values?.email ?? ""}
          aria-invalid={Boolean(errors?.email)}
          aria-describedby={errors?.email ? "signin-email-error" : undefined}
          placeholder="you@example.com"
        />
        <FieldError id="signin-email-error">{errors?.email?.[0]}</FieldError>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors?.password)}
          aria-describedby={
            errors?.password ? "signin-password-error" : undefined
          }
          placeholder="Your password"
        />
        <FieldError id="signin-password-error">
          {errors?.password?.[0]}
        </FieldError>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-xs text-muted">
        <Link
          href="/sign-up"
          className="font-medium text-muted-strong underline-offset-4 hover:text-foreground hover:underline"
        >
          Need an account? Create one
        </Link>
      </p>
    </form>
  );
}
