import { NextRequest, NextResponse } from "next/server";
import { verifyDualAuth, supabaseAdmin } from "@/lib/dual-auth";

/**
 * GET /api/admin/membership/members?page=1&pageSize=50
 * ──────────────────────────────────────────────────────
 * Dual_Auth required.
 * Returns paginated member list with latest purchase info.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyDualAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1",  10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));
  const offset   = (page - 1) * pageSize;

  // Get total count
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Get profiles page
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, membership_status, expiry_date, premium")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get latest purchase for each profile
  const userIds = (profiles ?? []).map((p) => p.id as string);
  let purchaseMap: Record<string, { amount_paid: number | null; purchase_date: string | null; purchase_type: string }> = {};

  if (userIds.length > 0) {
    const { data: purchases } = await supabaseAdmin
      .from("membership_purchases")
      .select("user_id, amount_paid, purchase_date, purchase_type")
      .in("user_id", userIds)
      .eq("status", "approved")
      .order("purchase_date", { ascending: false });

    if (purchases) {
      for (const p of purchases) {
        const uid = p.user_id as string;
        if (!purchaseMap[uid]) {
          purchaseMap[uid] = {
            amount_paid:   p.amount_paid   ?? null,
            purchase_date: p.purchase_date ?? null,
            purchase_type: p.purchase_type ?? "new",
          };
        }
      }
    }
  }

  const members = (profiles ?? []).map((p) => ({
    id:                p.id,
    email:             p.email             ?? null,
    full_name:         p.full_name         ?? null,
    membership_status: p.membership_status ?? "none",
    expiry_date:       p.expiry_date       ?? null,
    premium:           p.premium           ?? false,
    latest_purchase:   purchaseMap[p.id as string] ?? null,
  }));

  return NextResponse.json({ members, total: count ?? 0 });
}
