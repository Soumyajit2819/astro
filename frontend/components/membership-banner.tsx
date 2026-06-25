"use client";

import { Crown, Lock, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMembershipSettings } from "@/lib/supabase-auth";

export function MembershipBanner() {
  const [price, setPrice] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    getMembershipSettings().then((s) => {
      if (s) { setPrice(s.membership_price); setEnabled(s.membership_enabled); }
    });
  }, []);

  if (!enabled) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-gold/20 shadow-glow"
        style={{
          background: "linear-gradient(135deg, #3a1005 0%, #5a1e0a 35%, #7a2810 65%, #8b1a1a 100%)",
        }}
      >
        {/* Decorative stars */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { top: "15%", left: "5%",  size: 3 },
            { top: "70%", left: "8%",  size: 2 },
            { top: "20%", left: "90%", size: 3 },
            { top: "75%", left: "92%", size: 2 },
            { top: "45%", left: "50%", size: 2 },
          ].map((s, i) => (
            <span key={i} className="absolute rounded-full bg-amber-200/40"
              style={{ top: s.top, left: s.left, width: s.size, height: s.size }} />
          ))}
        </div>

        <div className="relative grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center">
          {/* Left content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              <Crown className="h-3.5 w-3.5" /> Premium Membership
            </div>

            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Unlock the Premium Astrology Video Library
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
              Get lifetime access to exclusive predictions, planetary remedies, career guidance, relationship insights, and special members-only video content.
            </p>

            {/* Benefits */}
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                "Exclusive Vedic Astrology Videos",
                "Career & Wealth Predictions",
                "Relationship & Marriage Guidance",
                "Planetary Remedies Library",
                "Members-Only Special Content",
                "New Videos Added Regularly",
              ].map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm text-white/80">
                  <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Right: price + CTA */}
          <div className="flex flex-col items-center gap-5 rounded-[1.5rem] border border-white/10 bg-white/8 px-8 py-7 text-center backdrop-blur lg:min-w-[220px]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/20">
              <Lock className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">One-time access</p>
              {price !== null ? (
                <p className="mt-1 font-display text-4xl font-bold text-white">
                  Rs. {price.toLocaleString("en-IN")}
                </p>
              ) : (
                <p className="mt-1 h-10 w-32 animate-pulse rounded-lg bg-white/10" />
              )}
              <p className="mt-1 text-xs text-white/50">Lifetime · No renewal</p>
            </div>
            <Link
              href="/membership"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-[#3a1005] transition hover:bg-amber-300 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              Unlock Membership
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
