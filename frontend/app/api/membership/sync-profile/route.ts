import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

/**
 * POST /api/membership/sync-profile
 * Called after Google OAuth to ensure a profiles row exists.
 * Uses service role key if available, falls back to anon key.
 * Body: { id, email, full_name, avatar_url }
 */
export async function POST(req: NextRequest) {
  try {
    const { id, email, full_name, avatar_url } = await req.json() as {
      id: string;
      email: string;
      full_name?: string;
      avatar_url?: string;
    };

    if (!id || !email) {
      return NextResponse.json({ error: "id and email required" }, { status: 400 });
    }

    const authKey = supabaseServiceKey ?? supabaseAnonKey;

    const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${authKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        id,
        email,
        full_name: full_name ?? null,
        avatar_url: avatar_url ?? null,
        premium: false,
      }),
    });

    if (!res.ok && res.status !== 409) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync profile" },
      { status: 500 }
    );
  }
}
