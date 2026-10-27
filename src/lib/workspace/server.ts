import type { SupabaseClient } from "@supabase/supabase-js";
import { getViewer } from "@/lib/auth/viewer";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  email: string;
};

export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const viewer = await getViewer();

  if (viewer.mode !== "supabase" || !viewer.user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  return {
    supabase,
    userId: viewer.user.id,
    email: viewer.user.email ?? "",
  };
}
