import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, writeAuditLog, supabaseAdmin } from "@/lib/dual-auth";

/**
 * POST /api/admin/membership/members/disable
 * ────────────────────────────────────────────
 * Dual_Auth required.
 * Sets membership_status='expired', premium=false.
 * Writes audit log.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Verify both auth layers
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 2. Parse and validate body
  const { user_id } = (await request.json()) as { user_id?: string };
  if (!user_id) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  // 3. Execute business logic
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ membership_status: "expired", premium: false })
    .eq("id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4. Write audit log (non-fatal)
  await writeAuditLog({
    action:       "membership_disabled",
    performedBy:  auth.adminEmail,
    targetUserId: user_id,
  });

  return NextResponse.json({ ok: true });
}
