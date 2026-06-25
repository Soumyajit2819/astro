"use client";

import { Crown, Lock, Sparkles, Star, CheckCircle2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getMembershipSettings,
  getSession,
  signInWithGoogle,
  getUserProfile,
  type MembershipSettings,
  type UserProfile,
} from "@/lib/supabase-auth";

const BENEFITS = [
  { icon: "🎬", title: "Exclusive Video Library", desc: "Unlimited access to all premium astrology videos." },
  { icon: "🌟", title: "Career & Wealth Predictions", desc: "Detailed Vedic analysis for professional success." },
  { icon: "💑", title: "Relationship Guidance", desc: "Marriage timing, compatibility, and relationship remedies." },
  { icon: "🪐", title: "Planetary Remedies", desc: "Personalised remedies based on your birth chart." },
  { icon: "🔒", title: "Members-Only Content", desc: "Special videos released exclusively for members." },
  { icon: "♾️", title: "Lifetime Access", desc: "One payment. No subscriptions. No renewals." },
];

const FAQS = [
  { q: "Is this a subscription?", a: "No. It is a one-time payment. You pay once and get lifetime access." },
  { q: "How do I access premium videos after payment?", a: "After your payment is verified by the admin, your account is upgraded to premium. You can then access all videos at /membership/premium." },
  { q: "How long does approval take?", a: "Typically within a few hours. You will receive confirmation on WhatsApp." },
  { q: "Can I use the same account for consultations?", a: "Membership and consultations are two separate systems. Your Google account is only for membership access." },
  { q: "What payment methods are accepted?", a: "UPI via Razorpay. After payment, upload your screenshot to complete the request." },
];

export default function MembershipPage() {
  const [settings, setSettings] = useState<MembershipSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const [s, session] = await Promise.all([getMembershipSettings(), getSession()]);
      setSettings(s);
      if (session?.user) {
        const p = await getUserProfile(session.user.id);
        setProfile(p);
      }
      setLoading(false);
    };
    void init();
  }, []);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try { await signInWithGoogle(); }
    catch { setSigningIn(false); }
  };

  const price = settings?.membership_price ?? null;
  const enabled = settings?.membership_enabled ?? true;

  return (
    <div className="min-h-screen bg-ivory font-body text-sage">
      {/* Back to home */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-sage/60 hover:text-sage transition">
          ← Back to AstroGenZ
        </Link>
      </div>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-[2.5rem] px-8 py-16 text-center shadow-glow"
          style={{ background: "linear-gradient(135deg, #3a1005, #5a1e0a, #8b1a1a)" }}
        >
          {/* Stars decoration */}
          <div className="pointer-events-none absolute inset-0">
            {[15,25,45,65,80,90].map((l,i) => (
              <span key={i} className="absolute h-1 w-1 rounded-full bg-amber-300/40"
                style={{ top: `${[10,60,25,70,15,55][i]}%`, left: `${l}%` }} />
            ))}
          </div>

          <div className="relative">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/20 ring-2 ring-amber-400/30">
              <Crown className="h-10 w-10 text-amber-300" />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400 font-semibold">AstroGenZ Premium</p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">
              Unlock Premium Astrology Content
            </h1>
            <p className="mt-4 mx-auto max-w-lg text-base leading-7 text-white/70">
              Get lifetime access to exclusive predictions, planetary remedies, and a curated library of premium astrology videos.
            </p>

            {/* Price */}
            <div className="mt-8 inline-flex flex-col items-center rounded-[1.5rem] border border-white/15 bg-white/8 px-10 py-6 backdrop-blur">
              {loading ? (
                <div className="h-12 w-32 animate-pulse rounded-xl bg-white/10" />
              ) : price !== null ? (
                <>
                  <p className="text-xs text-white/60 uppercase tracking-[0.2em]">One-time payment</p>
                  <p className="mt-1 font-display text-5xl font-bold text-white">
                    Rs. {price.toLocaleString("en-IN")}
                  </p>
                  <p className="mt-1 text-xs text-white/50">Lifetime access · No renewal</p>
                </>
              ) : (
                <p className="text-white/60">Price unavailable</p>
              )}
            </div>

            {/* CTA */}
            {!loading && enabled && (
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                {profile?.premium ? (
                  <Link href="/membership/premium"
                    className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-3.5 font-bold text-[#3a1005] transition hover:bg-amber-300">
                    <Sparkles className="h-5 w-5" /> Go to Premium Library
                  </Link>
                ) : profile ? (
                  <Link href="/membership/purchase"
                    className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-3.5 font-bold text-[#3a1005] transition hover:bg-amber-300">
                    <Lock className="h-5 w-5" /> Subscribe Now — Rs. {price?.toLocaleString("en-IN")}
                  </Link>
                ) : (
                  <>
                    <button onClick={handleGoogleSignIn} disabled={signingIn}
                      className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-3.5 font-semibold text-[#3a1005] shadow-lg transition hover:bg-amber-50 disabled:opacity-60">
                      {signingIn ? (
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="60" strokeDashoffset="30" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-5 w-5">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      {signingIn ? "Signing in…" : "Continue with Google"}
                    </button>
                    <p className="text-xs text-white/50">Sign in to purchase membership</p>
                  </>
                )}
              </div>
            )}
            {!enabled && (
              <p className="mt-6 text-sm text-white/60">Membership sales are currently paused. Check back soon.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">What you get</p>
          <h2 className="mt-2 font-display text-3xl text-sage">Premium Member Benefits</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title}
              className="rounded-[1.75rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
              <div className="mb-3 text-3xl">{b.icon}</div>
              <h3 className="font-display text-lg text-sage">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-sage/65">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Already a member ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-gold/20 bg-white/80 p-8 text-center shadow-glow">
          <p className="font-display text-2xl text-sage">Already a member?</p>
          <p className="mt-2 text-sm text-sage/65">Sign in with your Google account to access your premium library.</p>
          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {profile?.premium ? (
              <Link href="/membership/premium"
                className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-3 text-sm font-semibold text-ivory transition hover:bg-sage/85">
                <Sparkles className="h-4 w-4" /> Open Premium Library
              </Link>
            ) : !profile ? (
              <button onClick={handleGoogleSignIn} disabled={signingIn}
                className="inline-flex items-center gap-3 rounded-full border border-sage/25 bg-white px-6 py-3 text-sm font-semibold text-sage shadow transition hover:bg-ivory disabled:opacity-60">
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {signingIn ? "Signing in…" : "Continue with Google"}
              </button>
            ) : (
              <p className="text-sm text-sage/65">You are signed in but your membership is pending approval.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">FAQ</p>
          <h2 className="mt-2 font-display text-3xl text-sage">Frequently Asked Questions</h2>
        </div>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <div key={i}
              className="rounded-[1.5rem] border border-sage/10 bg-white/80 overflow-hidden shadow-glow">
              <button type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left">
                <span className="font-semibold text-sage text-sm">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-sage/50 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="border-t border-sage/10 px-6 py-4">
                  <p className="text-sm leading-6 text-sage/70">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer spacer */}
      <div className="pb-16" />
    </div>
  );
}
