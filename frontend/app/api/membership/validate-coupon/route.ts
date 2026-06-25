import { NextRequest, NextResponse } from "next/server";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

type CouponRow = {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
};

/**
 * POST /api/membership/validate-coupon
 * Body: { code, user_id, base_price }
 * Returns: { valid, coupon_id, discount_type, discount_value, final_price, message }
 */
export async function POST(req: NextRequest) {
  try {
    const { code, user_id, base_price } = await req.json() as {
      code: string;
      user_id: string;
      base_price: number;
    };

    if (!code || !user_id || !base_price) {
      return NextResponse.json({ valid: false, message: "Missing fields." });
    }

    const upperCode = code.trim().toUpperCase();

    // Fetch coupon
    const res = await fetch(
      `${supabaseUrl}/rest/v1/membership_coupons?code=eq.${encodeURIComponent(upperCode)}&select=*`,
      { headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` } }
    );
    const coupons = await res.json() as CouponRow[];

    if (!coupons || coupons.length === 0) {
      return NextResponse.json({ valid: false, message: "Coupon code not found." });
    }

    const coupon = coupons[0];

    if (!coupon.is_active) {
      return NextResponse.json({ valid: false, message: "This coupon is no longer active." });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, message: "This coupon has expired." });
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, message: "This coupon has reached its usage limit." });
    }

    // Check if this user already used this coupon
    const useRes = await fetch(
      `${supabaseUrl}/rest/v1/membership_coupon_uses?coupon_id=eq.${coupon.id}&user_id=eq.${user_id}`,
      { headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` } }
    );
    const uses = await useRes.json() as unknown[];
    if (uses && uses.length > 0) {
      return NextResponse.json({ valid: false, message: "You have already used this coupon." });
    }

    // Calculate final price
    let discount = 0;
    if (coupon.discount_type === "percent") {
      discount = Math.round(base_price * (coupon.discount_value / 100));
    } else {
      discount = Math.min(coupon.discount_value, base_price - 1); // min Rs.1
    }
    const final_price = Math.max(1, base_price - discount);

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discount,
      final_price,
      message: coupon.discount_type === "percent"
        ? `${coupon.discount_value}% off applied!`
        : `Rs. ${coupon.discount_value} off applied!`,
    });
  } catch (err) {
    return NextResponse.json({ valid: false, message: err instanceof Error ? err.message : "Validation failed." });
  }
}
