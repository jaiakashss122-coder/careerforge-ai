"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/viewer";
import type { SaveProfileResult } from "@/lib/profile/action-types";
import { profileInputToUpdate } from "@/lib/profile/repository";
import { parseProfileFormData } from "@/lib/profile/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveProfileAction(
  formData: FormData,
): Promise<SaveProfileResult> {
  const viewer = await getViewer();

  if (viewer.mode === "preview") {
    return {
      ok: false,
      message:
        "Preview mode stores profiles in this browser. The server save path requires Supabase.",
    };
  }

  if (!viewer.user) {
    return {
      ok: false,
      message: "Your session has expired. Sign in again to save changes.",
    };
  }

  const parsed = parseProfileFormData(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.message,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: viewer.user.id,
      email: viewer.user.email ?? "",
      ...profileInputToUpdate(parsed.data),
      onboarding_completed: true,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Profile save failed:", error.code ?? error.message);
    return {
      ok: false,
      message:
        "Your changes could not be saved right now. Nothing was lost locally — please retry.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/onboarding");
  revalidatePath("/roadmap");

  return { ok: true, message: "Profile saved." };
}
