import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, writeAuditLog, supabaseAdmin } from "@/lib/dual-auth";

/**
 * POST /api/admin/membership/members/extend
 * ───────────────────────────────────────────
 * Dual_Auth required.
 * Extends a member's expiry by 30 days using MAX(expiry_date, now()) + 30 days.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json() as { user_id?: string };
  if (!body.user_id) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const { user_id } = body;

  // Fetch current profile
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select("expiry_date, email")
    .eq("id", user_id)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Compute new expiry: MAX(expiry_date, now()) + 30 days
  const existingExpiry = profile.expiry_date ? new Date(profile.expiry_date) : null;
  const base = existingExpiry && existingExpiry > new Date() ? existingExpiry : new Date();
  const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Update profile
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      expiry_date:       newExpiry.toISOString(),
      membership_status: "active",
      premium:           true,
    })
    .eq("id", user_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Insert a renewal purchase row (amount_paid = 0 for admin grant)
  await supabaseAdmin.from("membership_purchases").insert({
    user_id,
    amount_paid:   0,
    purchase_type: "renewal",
    purchase_date: new Date().toISOString(),
    expiry_date:   newExpiry.toISOString(),
    status:        "approved",
    approved_by:   auth.adminEmail,
    approved_at:   new Date().toISOString(),
  });

  await writeAuditLog({
    action:       "membership_extended",
    performedBy:  auth.adminEmail,
    targetUserId: user_id,
    metadata:     {
      extended_by_days: 30,
      new_expiry:       newExpiry.toISOString(),
    },
  });

  return NextResponse.json({ ok: true, new_expiry_date: newExpiry.toISOString() });
}
