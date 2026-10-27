import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/routes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), "/onboarding");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/dashboard", url.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    console.error("Auth callback exchange failed:", error.code ?? error.name);
  }

  return NextResponse.redirect(
    new URL("/sign-in?error=confirmation-link", url.origin),
  );
}
