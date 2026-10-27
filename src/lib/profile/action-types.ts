import type { ProfileFieldErrors } from "@/lib/profile/schema";

export type SaveProfileResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: ProfileFieldErrors };
