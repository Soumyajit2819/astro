"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, CreditCard, Loader2, Tag, XCircle, Sparkles, AlertCircle
} from "lucide-react";
import Link from "next/link";
import {
  getSession,
  getUserProfile,
  getMembershipSettings,
  type UserProfile,
} from "@/lib/supabase-auth";

interface RazorpayOptions {
  key: string; amount: number; currency: string;
  name: string; description: string; order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

type CouponState = {
  code: string;
  coupon_id: number;
  discount_type: "percent" | "fixed";
  discount_value: number;
  discount_amount: number;
  final_price: number;
  message: string;
};

async function syncProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, string> }) {
  try {
    await fetch("/api/membership/sync-profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, email: user.email ?? "", full_name: user.user_metadata?.full_name ?? null, avatar_url: user.user_metadata?.avatar_url ?? null }),
    });
  } catch { /* non-fatal */ }
}

export default function MembershipPurchasePage() {
  const router = useRouter();
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [price, setPrice]         = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);
  const [step, setStep]           = useState<"pay" | "activating" | "done" | "error">("pay");
  const [paying, setPaying]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError]     = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponState | null>(null);

  const finalPrice = appliedCoupon ? appliedCoupon.final_price : (price ?? 0);

  useEffect(() => {
    if (!document.getElementById("rzp-script")) {
      const s = document.createElement("script");
      s.id = "rzp-script"; s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true;
      document.body.appendChild(s);
    }
    const init = async () => {
      const session = await getSession();
      if (!session?.user) { router.replace("/membership"); return; }
      await syncProfile(session.user);
      const [p, s] = await Promise.all([getUserProfile(session.user.id), getMembershipSettings()]);
      if (p?.premium) { router.replace("/membership/premium"); return; }
      setProfile(p); setPrice(s?.membership_price ?? null); setLoading(false);
    };
    void init();
  }, [router]);

  const applyCoupon = async () => {
    if (!couponCode.trim() || !profile || !price) return;
    setCouponLoading(true); setCouponError(null); setAppliedCoupon(null);
    try {
      const res = await fetch("/api/membership/validate-coupon", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), user_id: profile.id, base_price: price }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon(data as CouponState);
        setCouponError(null);
      } else {
        setCouponError(data.message ?? "Invalid coupon.");
      }
    } catch { setCouponError("Could not validate coupon. Try again."); }
    finally { setCouponLoading(false); }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(""); setCouponError(null); };

  const handleRazorpay = async () => {
    if (!profile || !price) return;
    setPaying(true); setError(null);
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalPrice, currency: "INR", receipt: `membership_${Date.now()}` }),
      });
      if (!orderRes.ok) throw new Error("Failed to create payment order.");
      const order = await orderRes.json();
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RzpClass = (window as any).Razorpay as new (o: RazorpayOptions) => { open: () => void };
      if (!keyId || !RzpClass) throw new Error("Razorpay not loaded. Please refresh.");

      await new Promise<void>((resolve, reject) => {
        const rzp = new RzpClass({
          key: keyId, amount: order.amount, currency: order.currency,
          name: "AstroGenZ", description: "Premium Membership",
          order_id: order.id,
          prefill: { name: profile.full_name ?? "", email: profile.email ?? "" },
          theme: { color: "#5a1e0a" },
          handler: async (response) => {
            try {
              setStep("activating");
              const activateRes = await fetch("/api/membership/activate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id:  response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  user_id:    profile.id,
                  amount_paid: finalPrice,
                  coupon_id:  appliedCoupon?.coupon_id ?? null,
                }),
              });
              const result = await activateRes.json();
              if (!activateRes.ok || result.error) throw new Error(result.error ?? "Activation failed.");
              setStep("done");
              resolve();
            } catch (e) { setStep("error"); setError(e instanceof Error ? e.message : "Activation failed."); reject(e); }
          },
          modal: { ondismiss: () => { setPaying(false); resolve(); } },
        });
        rzp.open();
      });
    } catch (e) {
      if (step !== "error") setError(e instanceof Error ? e.message : "Payment failed.");
    } finally { setPaying(false); }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-ivory">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage/20 border-t-sage" />
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory font-body text-sage">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Link href="/membership" className="text-sm text-sage/60 hover:text-sage">← Back</Link>

        <div className="mt-6 rounded-[2rem] border border-sage/10 bg-white/80 p-8 shadow-glow">

          {/* ── Activating ── */}
          {step === "activating" && (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-sage mb-4" />
              <p className="font-display text-xl text-sage">Activating your membership…</p>
              <p className="mt-2 text-sm text-sage/60">Please wait, do not close this page.</p>
            </div>
          )}

          {/* ── Success ── */}
          {step === "done" && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl text-sage">Membership Activated! 🎉</h2>
              <p className="mt-3 text-sm leading-6 text-sage/70">
                Your premium membership is now active. You have full access to the AstroGenZ Premium Video Library.
              </p>
              <p className="mt-2 text-sm font-medium text-sage">Welcome to the premium community! 🙏</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/membership/premium"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 text-sm font-semibold text-ivory transition hover:bg-sage/85">
                  <Sparkles className="h-4 w-4" /> Open Premium Library
                </Link>
                <Link href="/"
                  className="inline-flex items-center justify-center rounded-full border border-sage/20 bg-white px-6 py-3 text-sm font-semibold text-sage transition hover:bg-ivory">
                  Back to Home
                </Link>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="font-display text-xl text-sage">Something went wrong</h2>
              <p className="mt-2 text-sm text-sage/70">{error}</p>
              <p className="mt-2 text-sm text-sage/60">
                If money was deducted, contact us on WhatsApp — we will manually activate your membership.
              </p>
              <button onClick={() => { setStep("pay"); setError(null); setPaying(false); }}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-sage px-6 py-3 text-sm font-semibold text-ivory">
                Try Again
              </button>
            </div>
          )}

          {/* ── Payment form ── */}
          {step === "pay" && (
            <>
              <h1 className="font-display text-2xl text-sage">Complete Your Purchase</h1>
              <p className="mt-1 text-sm text-sage/65">Signed in as <strong>{profile?.email}</strong></p>

              {/* Price card */}
              <div className="mt-5 rounded-[1.5rem] border border-gold/20 bg-gold/8 px-6 py-5">
                <p className="text-xs uppercase tracking-[0.2em] text-gold font-medium">AstroGenZ Premium</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    {appliedCoupon ? (
                      <>
                        <p className="text-sm text-sage/50 line-through">Rs. {price?.toLocaleString("en-IN")}</p>
                        <p className="font-display text-3xl font-bold text-sage">
                          Rs. {finalPrice.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">
                          You save Rs. {appliedCoupon.discount_amount.toLocaleString("en-IN")}
                        </p>
                      </>
                    ) : (
                      <p className="font-display text-3xl font-bold text-sage">
                        Rs. {price?.toLocaleString("en-IN")}
                      </p>
                    )}
                    <p className="text-xs text-sage/55 mt-1">Lifetime access · No renewal · Instant activation</p>
                  </div>
                </div>
              </div>

              {/* Coupon input */}
              <div className="mt-5 rounded-[1.25rem] border border-sage/10 bg-white/80 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-sage">
                  <Tag className="h-4 w-4 text-gold" /> Have a coupon code?
                </p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">{appliedCoupon.code} — {appliedCoupon.message}</p>
                    </div>
                    <button type="button" onClick={removeCoupon}
                      className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-white px-3 py-1 text-xs font-medium text-ember">
                      <XCircle className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCoupon(); } }}
                      placeholder="Enter coupon code"
                      className="flex-1 rounded-2xl border border-sage/12 bg-white px-4 py-2 text-sm text-sage outline-none placeholder:text-sage/40 focus:border-gold" />
                    <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                      className="inline-flex items-center rounded-full bg-sage px-4 py-2 text-xs font-semibold text-ivory disabled:opacity-50">
                      {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </button>
                  </div>
                )}
                {couponError && <p className="mt-2 text-xs text-ember">{couponError}</p>}
              </div>

              {error && (
                <p className="mt-4 rounded-2xl border border-ember/20 bg-ember/5 px-4 py-3 text-sm text-ember">{error}</p>
              )}

              <button onClick={handleRazorpay} disabled={paying}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-4 text-base font-semibold text-ivory shadow-glow transition hover:bg-sage/85 disabled:opacity-60">
                {paying
                  ? <><Loader2 className="h-5 w-5 animate-spin" /> Opening Razorpay…</>
                  : <><CreditCard className="h-5 w-5" /> Pay Rs. {finalPrice.toLocaleString("en-IN")} via Razorpay</>
                }
              </button>
              <p className="mt-3 text-center text-xs text-sage/50">
                Secured by Razorpay · Membership activates instantly after payment
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
