import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

/**
 * GET /auth/callback
 * ──────────────────
 * Supabase OAuth sends users here after Google sign-in.
 * We exchange the `code` param for a real session, then
 * redirect to /membership where the session is ready.
 *
 * This fixes "Unable to exchange external code" on Vercel
 * caused by the hash-based token not being processed in
 * the App Router SSR context.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/membership";
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  // If Google/Supabase returned an error, show it
  if (error) {
    const url = new URL("/membership", origin);
    url.searchParams.set("auth_error", errorDesc ?? error);
    return NextResponse.redirect(url);
  }

  if (code) {
    // Exchange the auth code for a session
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Success — redirect to membership page
      // The session is now in the cookie; client-side will pick it up
      const redirectUrl = new URL(next, origin);
      const response = NextResponse.redirect(redirectUrl);

      // Copy the auth cookies Supabase set onto the response
      // (Supabase v2 uses sb-* cookies for SSR session persistence)
      return response;
    }

    // Exchange failed — redirect with error message
    const url = new URL("/membership", origin);
    url.searchParams.set("auth_error", exchangeError.message);
    return NextResponse.redirect(url);
  }

  // No code param — just redirect to membership
  return NextResponse.redirect(new URL("/membership", origin));
}
