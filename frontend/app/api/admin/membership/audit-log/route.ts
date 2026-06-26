import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, supabaseAdmin } from "@/lib/dual-auth";

/**
 * GET /api/admin/membership/audit-log?limit=50
 * ──────────────────────────────────────────────
 * Dual_Auth required.
 * Returns last N audit log entries.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit    = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));

  const { data, error } = await supabaseAdmin
    .from("membership_audit_log")
    .select("id, action, performed_by, target_user_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}
