import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * GET /api/membership/status
 * ───────────────────────────
 * Verifies Supabase JWT from Authorization header.
 * Returns membership_status, expiry_date, days_remaining, premium.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!jwt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("membership_status, expiry_date, premium")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    // Profile may not exist yet — treat as none
    return NextResponse.json({
      membership_status: "none",
      expiry_date:       null,
      days_remaining:    null,
      premium:           false,
    });
  }

  const membershipStatus: string = profile.membership_status ?? "none";
  const expiryDate: string | null = profile.expiry_date ?? null;
  const premium: boolean = profile.premium ?? false;

  // Server-side inline expiry check — if expiry_date has passed, treat as expired
  let effectiveStatus = membershipStatus;
  if (membershipStatus === "active" && expiryDate && new Date(expiryDate) < new Date()) {
    effectiveStatus = "expired";
    // Async fire-and-forget to sync DB (non-blocking)
    void supabaseAdmin
      .from("profiles")
      .update({ membership_status: "expired", premium: false })
      .eq("id", userData.user.id);
  }

  let daysRemaining: number | null = null;
  if (effectiveStatus === "active" && expiryDate) {
    const msRemaining = new Date(expiryDate).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  }

  return NextResponse.json({
    membership_status: effectiveStatus,
    expiry_date:       expiryDate,
    days_remaining:    daysRemaining,
    premium:           effectiveStatus === "active" ? true : false,
  });
}
