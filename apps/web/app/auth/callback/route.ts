import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Use the Host header to determine the correct origin, falling back to request.url
  const host = request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const publicOrigin = `${proto}://${host}`;

  if (!code) return NextResponse.redirect(new URL("/prijava", publicOrigin));

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/prijava?error=oauth", publicOrigin));
  }

  // After OAuth, always route to /onboarding. The page itself checks
  // `onboarding_completed` and redirects returning users to / — so this
  // works for both first-time signups and repeat logins.
  return NextResponse.redirect(new URL("/onboarding", publicOrigin));
}
