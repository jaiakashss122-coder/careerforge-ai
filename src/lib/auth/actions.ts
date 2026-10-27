"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/routes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState =
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
      values?: { email?: string; fullName?: string };
    }
  | { status: "success"; message: string; email: string }
  | undefined;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Keep your name under 80 characters."),
    email: emailSchema,
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use 72 characters or fewer.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

function authErrorMessage(code: string | undefined) {
  switch (code) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "email_not_confirmed":
      return "Confirm your email address before signing in. Check your inbox for the link.";
    case "user_already_exists":
    case "email_exists":
      return "An account already exists for this email. Sign in instead.";
    case "weak_password":
      return "Supabase rejected that password. Use a longer, less common password.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a few minutes before trying again.";
    case "signup_disabled":
      return "New sign-ups are currently disabled for this project.";
    case "email_address_invalid":
      return "That email address was rejected. Use a different address.";
    default:
      return "Authentication could not be completed. Please try again.";
  }
}

async function getSiteOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (host) {
    const forwardedProto = requestHeaders.get("x-forwarded-proto");
    const isLocal = host.startsWith("localhost") || host.startsWith("127.");
    const protocol = forwardedProto ?? (isLocal ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Supabase is not configured. This workspace is running in local preview mode.",
    };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check your email and password.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: "error",
      message: authErrorMessage(error.code),
      values: { email: parsed.data.email },
    };
  }

  redirect(safeNextPath(formData.get("next"), "/dashboard"));
}

const resendSchema = z.object({ email: emailSchema });

export async function resendConfirmationAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Supabase is not configured. This workspace is running in local preview mode.",
    };
  }

  const parsed = resendSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter the email address you signed up with.",
    };
  }

  const origin = await getSiteOrigin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=%2Fonboarding`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: authErrorMessage(error.code),
      values: { email: parsed.data.email },
    };
  }

  return {
    status: "success",
    email: parsed.data.email,
    message:
      "If that address is waiting for confirmation, a new confirmation email is on its way.",
  };
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Supabase is not configured. This workspace is running in local preview mode.",
    };
  }

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Some details need attention before you can create an account.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: {
        email: String(formData.get("email") ?? ""),
        fullName: String(formData.get("fullName") ?? ""),
      },
    };
  }

  const next = safeNextPath(formData.get("next"), "/onboarding");
  const origin = await getSiteOrigin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: authErrorMessage(error.code),
      values: { email: parsed.data.email, fullName: parsed.data.fullName },
    };
  }

  if (data.session) {
    redirect(next);
  }

  return {
    status: "success",
    email: parsed.data.email,
    message:
      "Account created. Check your inbox and confirm your email address, then sign in to continue.",
  };
}

export async function signOutAction() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
