import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * GET /api/membership/live-link?eventId=X
 * ─────────────────────────────────────────
 * Verifies JWT + membership_status='active', then returns youtube_link.
 * NEVER returns youtube_link without auth check.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!jwt) {
    return NextResponse.json({ error: "Active membership required." }, { status: 403 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Active membership required." }, { status: 403 });
  }

  // Verify active membership
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("membership_status, expiry_date")
    .eq("id", userData.user.id)
    .single();

  const isActive =
    profile?.membership_status === "active" &&
    profile?.expiry_date != null &&
    new Date(profile.expiry_date) > new Date();

  if (!isActive) {
    return NextResponse.json({ error: "Active membership required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId || isNaN(Number(eventId))) {
    return NextResponse.json({ error: "eventId query parameter is required." }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("live_events")
    .select("youtube_link, is_active")
    .eq("id", Number(eventId))
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found or inactive." }, { status: 404 });
  }

  if (!event.is_active) {
    return NextResponse.json({ error: "Event not found or inactive." }, { status: 404 });
  }

  return NextResponse.json({ youtube_link: event.youtube_link });
}
