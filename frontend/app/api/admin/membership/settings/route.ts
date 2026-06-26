import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, writeAuditLog, supabaseAdmin } from "@/lib/dual-auth";

/**
 * POST /api/admin/membership/settings
 * ─────────────────────────────────────
 * Dual_Auth required.
 * Updates membership_settings and/or admin_settings (whatsapp_number).
 * Writes audit log on price change.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json() as {
    membership_price?:   number;
    membership_enabled?: boolean;
    whatsapp_number?:    string;
  };

  // Update membership_settings if price or enabled provided
  if (body.membership_price !== undefined || body.membership_enabled !== undefined) {
    // Fetch current settings for audit
    const { data: current } = await supabaseAdmin
      .from("membership_settings")
      .select("id, membership_price")
      .limit(1)
      .single();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.membership_price !== undefined)   updates.membership_price   = body.membership_price;
    if (body.membership_enabled !== undefined) updates.membership_enabled = body.membership_enabled;

    const { error } = await supabaseAdmin
      .from("membership_settings")
      .update(updates)
      .eq("id", current?.id ?? 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write audit log for price change
    if (body.membership_price !== undefined && current?.membership_price !== body.membership_price) {
      await writeAuditLog({
        action:      "price_changed",
        performedBy: auth.adminEmail,
        metadata:    {
          old_price: current?.membership_price ?? null,
          new_price: body.membership_price,
        },
      });
    }
  }

  // Update WhatsApp number in admin_settings
  if (body.whatsapp_number !== undefined) {
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert(
        { key: "whatsapp_number", value: body.whatsapp_number, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
