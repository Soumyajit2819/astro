/**
 * supabase-auth.ts
 * ─────────────────
 * Membership-specific Supabase client using the JS SDK.
 * Completely isolated from the existing lib/supabase.ts (raw fetch client).
 * Do NOT import from lib/supabase.ts here.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

/** Singleton Supabase client for membership/auth features */
export const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});

// ── Types ──────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  premium: boolean;
  created_at: string;
};

export type MembershipSettings = {
  id: number;
  membership_price: number;
  membership_enabled: boolean;
};

export type PremiumVideo = {
  id: number;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type MembershipPurchase = {
  id: number;
  user_id: string;
  amount_paid: number | null;
  payment_id: string | null;
  payment_proof: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

// ── Auth helpers ───────────────────────────────────────────

/** Sign in with Google OAuth */
export async function signInWithGoogle() {
  const { error } = await supabaseAuth.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Always use the dedicated callback route so code exchange happens correctly on Vercel
      redirectTo: `${window.location.origin}/auth/callback?next=/membership`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
  if (error) throw error;
}

/** Sign out */
export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut();
  if (error) throw error;
}

/** Get current session (null if not logged in) */
export async function getSession() {
  const { data } = await supabaseAuth.auth.getSession();
  return data.session;
}

/** Get current user profile from profiles table */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAuth
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

// ── Membership data helpers ────────────────────────────────

/** Get membership settings (price, enabled status) */
export async function getMembershipSettings(): Promise<MembershipSettings | null> {
  const { data, error } = await supabaseAuth
    .from("membership_settings")
    .select("*")
    .limit(1)
    .single();
  if (error) return null;
  return data as MembershipSettings;
}

/** Get all active premium videos (requires premium = true in RLS) */
export async function getPremiumVideos(): Promise<PremiumVideo[]> {
  const { data, error } = await supabaseAuth
    .from("premium_videos")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as PremiumVideo[];
}

/** Submit a membership purchase request */
export async function submitMembershipPurchase(params: {
  userId: string;
  amountPaid: number;
  paymentId: string;
  paymentProofUrl?: string;
}) {
  const { data, error } = await supabaseAuth
    .from("membership_purchases")
    .insert([{
      user_id:       params.userId,
      amount_paid:   params.amountPaid,
      payment_id:    params.paymentId,
      payment_proof: params.paymentProofUrl ?? null,
      status:        "pending",
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Get user's purchase history */
export async function getUserPurchases(userId: string): Promise<MembershipPurchase[]> {
  const { data, error } = await supabaseAuth
    .from("membership_purchases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as MembershipPurchase[];
}
