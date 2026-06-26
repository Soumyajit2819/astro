import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, writeAuditLog, supabaseAdmin } from "@/lib/dual-auth";

/**
 * GET  /api/admin/membership/live-events  — list all events
 * POST /api/admin/membership/live-events  — insert or update an event
 * Both require Dual_Auth.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from("live_events")
    .select("*")
    .order("event_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
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
    event_date:    string;
    youtube_link:  string;
    is_active?:    boolean;
  };

  if (!body.title || !body.event_date || !body.youtube_link) {
    return NextResponse.json(
      { error: "title, event_date, and youtube_link are required." },
      { status: 400 }
    );
  }

  const isUpdate = body.id !== undefined;
  const payload = {
    title:         body.title,
    description:   body.description   ?? null,
    thumbnail_url: body.thumbnail_url ?? null,
    event_date:    body.event_date,
    youtube_link:  body.youtube_link,
    is_active:     body.is_active     ?? true,
  };

  let eventData: Record<string, unknown> | null = null;

  if (isUpdate) {
    const { data, error } = await supabaseAdmin
      .from("live_events")
      .update(payload)
      .eq("id", body.id!)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    eventData = data as Record<string, unknown>;
  } else {
    const { data, error } = await supabaseAdmin
      .from("live_events")
      .insert(payload)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    eventData = data as Record<string, unknown>;

    await writeAuditLog({
      action:      "live_event_created",
      performedBy: auth.adminEmail,
      metadata:    { event_id: eventData?.id, title: body.title },
    });
  }

  return NextResponse.json({ ok: true, event: eventData });
}
