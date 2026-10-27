"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldHint,
  Input,
  Label,
} from "@/components/ui/input";
import { signUpAction } from "@/lib/auth/actions";

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    undefined,
  );

  if (state?.status === "success") {
    return (
      <div className="space-y-5">
        <Alert variant="success" title="Confirm your email">
          {state.message} The link is sent to{" "}
          <span className="font-medium text-foreground">{state.email}</span>.
        </Alert>
        <p className="text-sm leading-6 text-muted">
          After confirming, sign in to complete your starting profile. Your
          assessment and roadmap are built from that profile.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border-strong bg-surface-raised px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const errors = state?.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state?.status === "error" ? (
        <Alert variant="danger" title="Could not create your account">
          {state.message}
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          name="fullName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={state?.values?.fullName ?? ""}
          aria-invalid={Boolean(errors?.fullName)}
          aria-describedby={errors?.fullName ? "signup-name-error" : undefined}
          placeholder="Your name"
        />
        <FieldError id="signup-name-error">{errors?.fullName?.[0]}</FieldError>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state?.values?.email ?? ""}
          aria-invalid={Boolean(errors?.email)}
          aria-describedby={errors?.email ? "signup-email-error" : undefined}
          placeholder="you@example.com"
        />
        <FieldError id="signup-email-error">{errors?.email?.[0]}</FieldError>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(errors?.password)}
          aria-describedby="signup-password-hint signup-password-error"
          placeholder="At least 8 characters"
        />
        <FieldHint id="signup-password-hint">
          At least 8 characters, including a letter and a number.
        </FieldHint>
        <FieldError id="signup-password-error">
          {errors?.password?.[0]}
        </FieldError>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <Input
          id="signup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors?.confirmPassword)}
          aria-describedby={
            errors?.confirmPassword ? "signup-confirm-error" : undefined
          }
          placeholder="Repeat your password"
        />
        <FieldError id="signup-confirm-error">
          {errors?.confirmPassword?.[0]}
        </FieldError>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-xs text-muted">
        <Link
          href={`/sign-in?next=${encodeURIComponent(next)}`}
          className="font-medium text-muted-strong underline-offset-4 hover:text-foreground hover:underline"
        >
          Already have an account? Sign in
        </Link>
      </p>
    </form>
  );
}
