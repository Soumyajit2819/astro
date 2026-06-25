import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? supabaseAnon;
const rzpSecret    = process.env.RAZORPAY_KEY_SECRET!.trim();

function supabaseFetch(path: string, method: string, body?: object) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey:          supabaseAnon,
      Authorization:   `Bearer ${serviceKey}`,
      "Content-Type":  "application/json",
      Prefer:          "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * POST /api/membership/activate
 * ──────────────────────────────
 * 1. Verify Razorpay HMAC signature (cannot be faked)
 * 2. Set profiles.premium = true
 * 3. Insert membership_purchases with status = approved
 * 4. (Optional) record coupon usage
 */
export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      user_id,
      amount_paid,
      coupon_id,
    } = await req.json() as {
      razorpay_order_id:  string;
      razorpay_payment_id: string;
      razorpay_signature:  string;
      user_id:            string;
      amount_paid:        number;
      coupon_id?:         number;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !user_id) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // ── 1. Verify Razorpay signature ──────────────────────────
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", rzpSecret).update(body).digest("hex");
    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    // ── 2. Check if already premium (idempotent) ──────────────
    const profileRes = await supabaseFetch(`profiles?id=eq.${user_id}&select=premium`, "GET");
    const profiles = await profileRes.json() as { premium: boolean }[];
    if (profiles?.[0]?.premium) {
      return NextResponse.json({ ok: true, already_premium: true });
    }

    // ── 3. Activate premium ───────────────────────────────────
    const updateRes = await supabaseFetch(
      `profiles?id=eq.${user_id}`,
      "PATCH",
      { premium: true }
    );
    if (!updateRes.ok) {
      const err = await updateRes.text();
      return NextResponse.json({ error: `Failed to activate: ${err}` }, { status: 500 });
    }

    // ── 4. Record purchase as approved ────────────────────────
    await supabaseFetch("membership_purchases", "POST", {
      user_id,
      amount_paid,
      payment_id:  razorpay_payment_id,
      status:      "approved",
      approved_by: "razorpay_auto",
      approved_at: new Date().toISOString(),
    });

    // ── 5. Record coupon usage (if coupon was used) ───────────
    if (coupon_id) {
      // Insert usage record
      await supabaseFetch("membership_coupon_uses", "POST", {
        coupon_id,
        user_id,
      });
      // Increment used_count
      await supabaseFetch(
        `membership_coupons?id=eq.${coupon_id}`,
        "PATCH",
        { used_count: undefined } // handled by DB trigger below, or use RPC
      );
      // Simpler: just call a raw increment via RPC or re-fetch and increment
      const couponRes = await supabaseFetch(`membership_coupons?id=eq.${coupon_id}&select=used_count`, "GET");
      const coupons = await couponRes.json() as { used_count: number }[];
      if (coupons?.[0] !== undefined) {
        await supabaseFetch(
          `membership_coupons?id=eq.${coupon_id}`,
          "PATCH",
          { used_count: (coupons[0].used_count ?? 0) + 1 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Activation failed." },
      { status: 500 }
    );
  }
}
