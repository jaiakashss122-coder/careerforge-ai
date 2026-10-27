import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Viewer =
  | { mode: "preview" }
  | { mode: "supabase"; user: User | null };

export const getViewer = cache(async (): Promise<Viewer> => {
  if (!isSupabaseConfigured()) {
    return { mode: "preview" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Supabase session lookup failed:", error.code ?? error.name);
  }

  return { mode: "supabase", user };
});
