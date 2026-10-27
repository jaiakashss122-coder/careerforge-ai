"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

let browserClient: SupabaseClient<Database> | null = null;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured. Use preview mode instead.");
  }

  browserClient ??= createBrowserClient<Database>(config.url, config.key);
  return browserClient;
}
