"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Lock, LogOut, Search } from "lucide-react";
import Link from "next/link";
import {
  getSession,
  getUserProfile,
  getPremiumVideos,
  signOut,
  type UserProfile,
  type PremiumVideo,
} from "@/lib/supabase-auth";
import { PremiumVideoCard } from "@/components/premium-video-card";

/** Sync profile server-side (bypasses RLS) */
async function syncProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, string> }) {
  try {
    await fetch("/api/membership/sync-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      }),
    });
  } catch { /* non-fatal */ }
}

export default function PremiumLibraryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<PremiumVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session?.user) { router.replace("/membership"); return; }

      // Ensure profile row exists
      await syncProfile(session.user);

      const p = await getUserProfile(session.user.id);
      if (!p?.premium) { router.replace("/membership"); return; }

      setProfile(p);
      const vids = await getPremiumVideos();
      setVideos(vids);
      setLoading(false);
    };
    void init();
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/membership");
  };

  const categories = ["All", ...Array.from(new Set(videos.map((v) => v.category).filter(Boolean)))];

  const filtered = videos.filter((v) => {
    const matchCat = activeCategory === "All" || v.category === activeCategory;
    const matchSearch = !search ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      (v.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-sage/20 border-t-sage" />
          <p className="mt-4 text-sm text-sage/60">Loading your premium library…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory font-body text-sage">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-sage/10 bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/astrogenz-logo.jpeg" alt="AstroGenZ" width={40} height={40} className="rounded-lg object-contain" />
            <span className="font-display text-lg font-semibold text-sage">AstroGenZ</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <Crown className="h-3.5 w-3.5" /> Premium
            </div>
            {profile && (
              <span className="hidden text-sm text-sage/60 sm:block">{profile.email}</span>
            )}
            <button onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-sage/15 px-3 py-1.5 text-xs font-medium text-sage/70 transition hover:text-sage">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] px-8 py-10 text-center"
          style={{ background: "linear-gradient(135deg, #3a1005, #5a1e0a, #8b1a1a)" }}>
          <Crown className="mx-auto h-10 w-10 text-amber-300 mb-3" />
          <h1 className="font-display text-3xl font-semibold text-white">
            Welcome back, {profile?.full_name?.split(" ")[0] ?? "Member"} 🙏
          </h1>
          <p className="mt-2 text-sm text-white/70">
            You have full access to the AstroGenZ Premium Video Library.
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage/40" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos…"
              className="w-full rounded-full border border-sage/15 bg-white py-2.5 pl-10 pr-4 text-sm text-sage outline-none placeholder:text-sage/40 focus:border-sage/40" />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  activeCategory === cat ? "bg-sage text-ivory" : "border border-sage/20 bg-white text-sage hover:bg-sage/5"
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video grid */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Lock className="mx-auto h-10 w-10 text-sage/25 mb-4" />
            <p className="font-display text-xl text-sage/50">
              {videos.length === 0 ? "Premium videos coming soon." : "No videos match your search."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((video) => (
              <PremiumVideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
