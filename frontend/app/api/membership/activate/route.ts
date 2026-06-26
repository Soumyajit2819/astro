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

async function writeAuditLog(params: {
  action:        string;
  performedBy:   string;
  targetUserId?: string | null;
  metadata?:     Record<string, unknown> | null;
}): Promise<void> {
  try {
    await supabaseFetch("membership_audit_log", "POST", {
      action:         params.action,
      performed_by:   params.performedBy,
      target_user_id: params.targetUserId ?? null,
      metadata:       params.metadata    ?? null,
    });
  } catch {
    // Non-fatal
  }
}

/**
 * POST /api/membership/activate
 * ──────────────────────────────
 * 1. Verify Razorpay HMAC signature (cannot be faked)
 * 2. Idempotency check via payment_id
 * 3. Detect purchase_type (new vs renewal) and compute expiry
 * 4. Update profiles: premium=true, membership_status='active', expiry_date
 * 5. Insert membership_purchases with expiry and purchase_type
 * 6. (Optional) record coupon usage
 * 7. Write audit log
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
      razorpay_order_id:   string;
      razorpay_payment_id: string;
      razorpay_signature:  string;
      user_id:             string;
      amount_paid:         number;
      coupon_id?:          number;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !user_id) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // ── 1. Verify Razorpay signature ──────────────────────────
    const hmacBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac("sha256", rzpSecret).update(hmacBody).digest("hex");
    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    // ── 2. Idempotency: check if payment_id already processed ─
    const existingRes = await supabaseFetch(
      `membership_purchases?payment_id=eq.${encodeURIComponent(razorpay_payment_id)}&select=id&limit=1`,
      "GET"
    );
    const existing = await existingRes.json() as { id: number }[];
    if (existing?.length > 0) {
      return NextResponse.json({ ok: true, already_processed: true });
    }

    // ── 3. Fetch current profile for expiry/purchase_type ────
    const profileRes = await supabaseFetch(
      `profiles?id=eq.${user_id}&select=premium,expiry_date,membership_status`,
      "GET"
    );
    const profiles = await profileRes.json() as { premium: boolean; expiry_date: string | null; membership_status: string }[];
    const currentProfile = profiles?.[0] ?? null;

    // Determine purchase_type
    const purchaseType = currentProfile?.expiry_date ? "renewal" : "new";

    // Compute new expiry: MAX(expiry_date, now()) + 30 days
    const existingExpiry = currentProfile?.expiry_date ? new Date(currentProfile.expiry_date) : null;
    const base = existingExpiry && existingExpiry > new Date() ? existingExpiry : new Date();
    const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ── 4. Update profile atomically ─────────────────────────
    const updateRes = await supabaseFetch(
      `profiles?id=eq.${user_id}`,
      "PATCH",
      {
        premium:           true,
        membership_status: "active",
        expiry_date:       newExpiry.toISOString(),
      }
    );
    if (!updateRes.ok) {
      const err = await updateRes.text();
      return NextResponse.json({ error: `Failed to activate: ${err}` }, { status: 500 });
    }

    // ── 5. Insert purchase record ─────────────────────────────
    await supabaseFetch("membership_purchases", "POST", {
      user_id,
      amount_paid,
      payment_id:    razorpay_payment_id,
      purchase_type: purchaseType,
      purchase_date: new Date().toISOString(),
      expiry_date:   newExpiry.toISOString(),
      status:        "approved",
      approved_by:   "razorpay_auto",
      approved_at:   new Date().toISOString(),
    });

    // ── 6. Record coupon usage (if coupon was used) ───────────
    if (coupon_id) {
      await supabaseFetch("membership_coupon_uses", "POST", { coupon_id, user_id });
      const couponRes = await supabaseFetch(
        `membership_coupons?id=eq.${coupon_id}&select=used_count`,
        "GET"
      );
      const coupons = await couponRes.json() as { used_count: number }[];
      if (coupons?.[0] !== undefined) {
        await supabaseFetch(
          `membership_coupons?id=eq.${coupon_id}`,
          "PATCH",
          { used_count: (coupons[0].used_count ?? 0) + 1 }
        );
      }
    }

    // ── 7. Write audit log ────────────────────────────────────
    const auditAction = purchaseType === "renewal" ? "membership_renewed" : "membership_activated";
    await writeAuditLog({
      action:       auditAction,
      performedBy:  "razorpay_auto",
      targetUserId: user_id,
      metadata:     {
        purchase_type:  purchaseType,
        expiry_date:    newExpiry.toISOString(),
        amount_paid,
        payment_id:     razorpay_payment_id,
      },
    });

    return NextResponse.json({
      ok:            true,
      expiry_date:   newExpiry.toISOString(),
      purchase_type: purchaseType,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Activation failed." },
      { status: 500 }
    );
  }
}
