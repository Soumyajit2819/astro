import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, writeAuditLog, supabaseAdmin } from "@/lib/dual-auth";

/**
 * GET  /api/admin/membership/videos  — list all videos
 * POST /api/admin/membership/videos  — insert or update a video (id present = update)
 * Both require Dual_Auth.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from("premium_videos")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json() as {
    id?:           number;
    title:         string;
    description?:  string;
    thumbnail_url?: string;
    video_url:     string;
    category?:     string;
    status:        "published" | "draft";
    sort_order?:   number;
  };

  if (!body.title || !body.video_url) {
    return NextResponse.json({ error: "title and video_url are required." }, { status: 400 });
  }

  const isUpdate = body.id !== undefined;
  const payload = {
    title:         body.title,
    description:   body.description   ?? null,
    thumbnail_url: body.thumbnail_url ?? null,
    video_url:     body.video_url,
    category:      body.category      ?? "General",
    status:        body.status,
    is_active:     body.status === "published",
    sort_order:    body.sort_order    ?? 0,
    updated_at:    new Date().toISOString(),
  };

  let videoData: Record<string, unknown> | null = null;

  if (isUpdate) {
    const { data, error } = await supabaseAdmin
      .from("premium_videos")
      .update(payload)
      .eq("id", body.id!)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    videoData = data as Record<string, unknown>;
  } else {
    const { data, error } = await supabaseAdmin
      .from("premium_videos")
      .insert(payload)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    videoData = data as Record<string, unknown>;

    await writeAuditLog({
      action:      "premium_video_added",
      performedBy: auth.adminEmail,
      metadata:    { video_id: videoData?.id, title: body.title },
    });
  }

  return NextResponse.json({ ok: true, video: videoData });
}
