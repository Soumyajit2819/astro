import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

// Public read — use anon key (admin_settings has public SELECT policy)
const supabasePublic = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: false },
});

/**
 * GET /api/membership/whatsapp-number
 * ─────────────────────────────────────
 * Public endpoint — no auth required.
 * Reads admin_settings where key='whatsapp_number'.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await supabasePublic
      .from("admin_settings")
      .select("value")
      .eq("key", "whatsapp_number")
      .single();

    if (error || !data) {
      return NextResponse.json({ whatsapp_number: null });
    }

    const number = data.value && data.value.trim() !== "" ? data.value.trim() : null;
    return NextResponse.json({ whatsapp_number: number });
  } catch {
    return NextResponse.json({ whatsapp_number: null });
  }
}
