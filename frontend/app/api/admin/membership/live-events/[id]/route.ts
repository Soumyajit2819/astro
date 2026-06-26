import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, writeAuditLog, supabaseAdmin } from "@/lib/dual-auth";

/**
 * DELETE /api/admin/membership/live-events/[id]
 * ───────────────────────────────────────────────
 * Dual_Auth required.
 * Deletes a live event and writes audit log.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const eventId = parseInt(id, 10);

  if (isNaN(eventId)) {
    return NextResponse.json({ error: "Invalid event id." }, { status: 400 });
  }

  // Fetch title for audit log before deleting
  const { data: event } = await supabaseAdmin
    .from("live_events")
    .select("title")
    .eq("id", eventId)
    .single();

  const { error } = await supabaseAdmin
    .from("live_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    action:      "live_event_deleted",
    performedBy: auth.adminEmail,
    metadata:    { event_id: eventId, title: event?.title ?? null },
  });

  return NextResponse.json({ ok: true });
}
