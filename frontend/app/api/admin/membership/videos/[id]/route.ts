import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, writeAuditLog, supabaseAdmin } from "@/lib/dual-auth";

/**
 * DELETE /api/admin/membership/videos/[id]
 * ──────────────────────────────────────────
 * Dual_Auth required.
 * Deletes a video and writes audit log.
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
  const videoId = parseInt(id, 10);

  if (isNaN(videoId)) {
    return NextResponse.json({ error: "Invalid video id." }, { status: 400 });
  }

  // Fetch title for audit log before deleting
  const { data: video } = await supabaseAdmin
    .from("premium_videos")
    .select("title")
    .eq("id", videoId)
    .single();

  const { error } = await supabaseAdmin
    .from("premium_videos")
    .delete()
    .eq("id", videoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    action:      "premium_video_deleted",
    performedBy: auth.adminEmail,
    metadata:    { video_id: videoId, title: video?.title ?? null },
  });

  return NextResponse.json({ ok: true });
}
