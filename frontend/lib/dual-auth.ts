/**
 * dual-auth.ts
 * ─────────────
 * Two-layer admin authentication helper.
 * Layer 1: astro_admin_session cookie = "authorized" (set by /api/admin-auth)
 * Layer 2: Supabase JWT resolves to a user with profiles.is_admin = true
 *
 * Usage in every admin API route:
 *   const auth = await verifyDualAuth(request);
 *   if (!auth.ok) {
 *     return NextResponse.json({ error: auth.error }, { status: auth.status });
 *   }
 *   // auth.adminEmail is available for audit log entries
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_COOKIE = "astro_admin_session";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

// Service-role client — never exposed to the browser
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type DualAuthResult =
  | { ok: true;  adminEmail: string; adminUserId: string }
  | { ok: false; error: string; status: 401 | 403 };

export async function verifyDualAuth(request: NextRequest): Promise<DualAuthResult> {
  // ── Layer 1: cookie check ──────────────────────────────────────────────────
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE)?.value;

  if (sessionCookie !== "authorized") {
    return { ok: false, error: "Admin session required.", status: 401 };
  }

  // ── Layer 2: Supabase JWT + is_admin check ─────────────────────────────────
  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!jwt) {
    return { ok: false, error: "Missing Authorization header.", status: 401 };
  }

  // Verify the JWT and get the user
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
  if (userError || !userData.user) {
    return { ok: false, error: "Invalid or expired JWT.", status: 401 };
  }

  const userId     = userData.user.id;
  const adminEmail = userData.user.email ?? "unknown";

  // Check is_admin flag in profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "User profile not found.", status: 403 };
  }

  if (!profile.is_admin) {
    return { ok: false, error: "Admin privilege required.", status: 403 };
  }

  return { ok: true, adminEmail, adminUserId: userId };
}

// ── Audit log helper ────────────────────────────────────────────────────────
export async function writeAuditLog(params: {
  action:        string;
  performedBy:   string;
  targetUserId?: string | null;
  metadata?:     Record<string, unknown> | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from("membership_audit_log").insert({
      action:         params.action,
      performed_by:   params.performedBy,
      target_user_id: params.targetUserId ?? null,
      metadata:       params.metadata    ?? null,
    });
  } catch {
    // Audit log failures are non-fatal — silently swallow
  }
}

// ── Re-export supabaseAdmin for use in route files ──────────────────────────
export { supabaseAdmin };
