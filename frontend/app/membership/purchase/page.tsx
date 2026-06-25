"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import {
  getSession,
  getUserProfile,
  getMembershipSettings,
  submitMembershipPurchase,
  supabaseAuth,
  type UserProfile,
} from "@/lib/supabase-auth";

interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string;
  description: string; order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any

export default function MembershipPurchasePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"pay" | "proof" | "done">("pay");
  const [paying, setPaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load Razorpay script
    if (!document.getElementById("rzp-script")) {
      const s = document.createElement("script");
      s.id = "rzp-script"; s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true;
      document.body.appendChild(s);
    }

    const init = async () => {
      const session = await getSession();
      if (!session?.user) { router.replace("/membership"); return; }
      const [p, s] = await Promise.all([
        getUserProfile(session.user.id),
        getMembershipSettings(),
      ]);
      if (p?.premium) { router.replace("/membership/premium"); return; }
      setProfile(p);
      setPrice(s?.membership_price ?? null);
      setLoading(false);
    };
    void init();
  }, [router]);

  const handleRazorpay = async () => {
    if (!profile || !price) return;
    setPaying(true); setError(null);

    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price, currency: "INR", receipt: `membership_${Date.now()}` }),
      });
      if (!orderRes.ok) throw new Error("Failed to create order.");
      const order = await orderRes.json();

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RzpClass = (window as any).Razorpay as new (o: RazorpayOptions) => { open: () => void };
      if (!keyId || !RzpClass)
        throw new Error("Razorpay not loaded. Please refresh.");

      await new Promise<void>((resolve, reject) => {
        const rzp = new RzpClass({
          key: keyId, amount: order.amount, currency: order.currency,
          name: "AstroGenZ", description: "Premium Membership",
          order_id: order.id,
          prefill: { name: profile.full_name ?? "", email: profile.email ?? "" },
          theme: { color: "#5a1e0a" },
          handler: async (response) => {
            try {
              const vr = await fetch("/api/payments/verify", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
              const verified = await vr.json();
              if (!verified.verified) throw new Error("Payment verification failed.");
              setPaymentId(response.razorpay_payment_id);
              setStep("proof");
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => { setPaying(false); resolve(); } },
        });
        rzp.open();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  };

  const handleProofUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !profile) return;
    setUploading(true); setError(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `membership-proofs/${Date.now()}-${profile.id}.${ext}`;

      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/astrologer-images/${path}`, {
        method: "POST",
        headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}`, "x-upsert": "true" },
        body: file,
      });
      const proofUrl = uploadRes.ok
        ? `${supabaseUrl}/storage/v1/object/public/astrologer-images/${path}`
        : undefined;

      await submitMembershipPurchase({
        userId: profile.id,
        amountPaid: price!,
        paymentId,
        paymentProofUrl: proofUrl,
      });

      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-ivory">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage/20 border-t-sage" />
    </div>
  );

  const inputClass = "mt-2 w-full rounded-2xl border border-sage/15 bg-white px-4 py-3 text-sm text-sage outline-none focus:border-sage/40";

  return (
    <div className="min-h-screen bg-ivory font-body text-sage">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Link href="/membership" className="text-sm text-sage/60 hover:text-sage">← Back to Membership</Link>

        <div className="mt-6 rounded-[2rem] border border-sage/10 bg-white/80 p-8 shadow-glow">
          {step === "pay" && (
            <>
              <h1 className="font-display text-2xl text-sage">Complete Your Purchase</h1>
              <p className="mt-2 text-sm text-sage/65">
                Signed in as <strong>{profile?.email}</strong>
              </p>
              <div className="mt-6 rounded-[1.5rem] border border-gold/20 bg-gold/8 px-6 py-5">
                <p className="text-xs uppercase tracking-[0.2em] text-gold font-medium">AstroGenZ Premium</p>
                <p className="mt-1 font-display text-3xl font-bold text-sage">
                  Rs. {price?.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-sage/55">Lifetime access · One-time payment · No renewal</p>
              </div>
              {error && <p className="mt-4 text-sm text-ember">{error}</p>}
              <button onClick={handleRazorpay} disabled={paying}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-4 text-base font-semibold text-ivory shadow-glow transition hover:bg-sage/85 disabled:opacity-60">
                {paying ? <><Loader2 className="h-5 w-5 animate-spin" /> Opening payment…</> : <><CreditCard className="h-5 w-5" /> Pay Rs. {price?.toLocaleString("en-IN")} via Razorpay</>}
              </button>
              <p className="mt-3 text-center text-xs text-sage/50">Secured by Razorpay · UPI · Cards · Wallets</p>
            </>
          )}

          {step === "proof" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sage">Payment received!</p>
                  <p className="text-xs text-sage/60">ID: {paymentId}</p>
                </div>
              </div>
              <p className="text-sm text-sage/70 leading-6">
                Please upload your payment screenshot so the admin can verify and activate your membership.
              </p>
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-gold/40 bg-gold/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-sage">
                  <Upload className="h-4 w-4 text-gold" /> Upload payment screenshot
                </div>
                <input ref={fileRef} type="file" accept="image/*"
                  className="block w-full text-sm text-sage file:mr-4 file:rounded-full file:border-0 file:bg-sage file:px-4 file:py-2 file:font-medium file:text-ivory" />
              </div>
              {error && <p className="mt-3 text-sm text-ember">{error}</p>}
              <button onClick={handleProofUpload} disabled={uploading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-3.5 text-sm font-semibold text-ivory transition hover:bg-sage/85 disabled:opacity-60">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit Purchase Request"}
              </button>
            </>
          )}

          {step === "done" && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl text-sage">Request Submitted! 🙏</h2>
              <p className="mt-3 text-sm leading-6 text-sage/70">
                Your membership request has been submitted. The admin will verify your payment and activate your account within a few hours.
              </p>
              <p className="mt-2 text-sm text-sage/60">You'll be able to access premium content once approved.</p>
              <Link href="/"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-sage/20 bg-white px-6 py-3 text-sm font-semibold text-sage transition hover:bg-ivory">
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
