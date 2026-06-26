"use client";

import Link from "next/link";
import { AlertTriangle, Clock, RefreshCcw } from "lucide-react";

interface MembershipExpiryBannerProps {
  expiryDate: Date;
  daysRemaining: number;
}

/**
 * MembershipExpiryBanner
 * ───────────────────────
 * Shows expiry state at the top of the premium page.
 * daysRemaining > 5     → quiet green info bar
 * 1 < daysRemaining ≤ 5 → amber warning + Renew button
 * daysRemaining ≤ 1     → red warning + Renew now button
 */
export function MembershipExpiryBanner({ expiryDate, daysRemaining }: MembershipExpiryBannerProps) {
  const expiryStr = expiryDate.toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  if (daysRemaining > 5) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
          <Clock className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Membership active &middot; <strong>{daysRemaining} days remaining</strong>
            <span className="ml-2 text-xs text-emerald-600">(expires {expiryStr})</span>
          </span>
        </div>
      </div>
    );
  }

  if (daysRemaining > 1) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Renew soon &mdash; <strong>{daysRemaining} days remaining</strong>
              <span className="ml-2 text-xs text-amber-700">(expires {expiryStr})</span>
            </span>
          </div>
          <Link
            href="/membership/purchase"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 active:scale-95"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Renew Membership
          </Link>
        </div>
      </div>
    );
  }

  // daysRemaining <= 1
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-ember/30 bg-ember/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-ember">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {daysRemaining < 1
              ? "Less than 1 day remaining"
              : <strong>Less than 1 day remaining</strong>
            }
            <span className="ml-2 text-xs">(expires {expiryStr})</span>
          </span>
        </div>
        <Link
          href="/membership/purchase"
          className="inline-flex items-center gap-1.5 rounded-full bg-ember px-4 py-2 text-xs font-semibold text-white transition hover:bg-ember/85 active:scale-95"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Renew now
        </Link>
      </div>
    </div>
  );
}
