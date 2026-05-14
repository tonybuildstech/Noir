import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  if (!code) return NextResponse.redirect(new URL("/prijava", origin));

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/prijava?error=oauth", origin));
  }

  // After OAuth, always route to /onboarding. The page itself checks
  // `onboarding_completed` and redirects returning users to / — so this
  // works for both first-time signups and repeat logins.
  return NextResponse.redirect(new URL("/onboarding", origin));
}
