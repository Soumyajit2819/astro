"use client";

/**
 * /admin/membership
 * ──────────────────
 * Membership admin panel — integrated into the existing /admin shell.
 * Authentication layer 1: astro_admin_session cookie (middleware).
 * Authentication layer 2: Google sign-in via Supabase → JWT sent with every API call.
 *                          The signed-in user must have profiles.is_admin = true.
 * Admin never needs to visit /membership — they sign in directly here.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Plus, RefreshCcw, Save, Tag, Trash2,
  Users, Video, Radio, Settings, FileText, AlertCircle, LogOut
} from "lucide-react";
import { supabaseAuth } from "@/lib/supabase-auth";

/* ── Types ────────────────────────────────────────────────── */
type Tab = "settings" | "members" | "videos" | "live-events" | "coupons" | "audit";

type MemberRow = {
  id: string; email: string | null; full_name: string | null;
  membership_status: "none" | "active" | "expired";
  expiry_date: string | null; premium: boolean;
  latest_purchase: { amount_paid: number | null; purchase_date: string | null; purchase_type: string } | null;
};

type VideoRow = {
  id: number; title: string; description: string | null;
  video_url: string; thumbnail_url: string | null;
  category: string; status: "published" | "draft";
  sort_order: number; is_active: boolean;
};

type LiveEvent = {
  id: number; title: string; description: string | null;
  thumbnail_url: string | null; event_date: string;
  youtube_link: string; is_active: boolean;
};

type CouponRow = {
  id: number; code: string; discount_type: "percent" | "fixed";
  discount_value: number; max_uses: number | null; used_count: number;
  expires_at: string | null; is_active: boolean;
};

type AuditEntry = {
  id: number; action: string; performed_by: string;
  target_user_id: string | null; metadata: Record<string, unknown> | null;
  created_at: string;
};

type Settings = { membership_price: string; membership_enabled: boolean; whatsapp_number: string };

/* ── API helper — always sends Supabase JWT ─────────────── */
async function adminFetch(path: string, method = "GET", body?: object): Promise<Response> {
  const session = await supabaseAuth.auth.getSession();
  const jwt = session.data.session?.access_token ?? "";
  return fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/* ── New video/event/coupon default states ───────────────── */
const DEFAULT_VIDEO  = { title:"", description:"", video_url:"", thumbnail_url:"", category:"General", status:"published" as "published"|"draft", sort_order:0 };
const DEFAULT_EVENT  = { title:"", description:"", thumbnail_url:"", event_date:"", youtube_link:"", is_active:true };
const DEFAULT_COUPON = { code:"", discount_type:"percent" as "percent"|"fixed", discount_value:"", max_uses:"", expires_at:"", is_active:true };

const IC = "mt-1.5 w-full rounded-2xl border border-sage/15 bg-white px-4 py-2.5 text-sm text-sage outline-none focus:border-sage/40";

/* ══════════════════════════════════════════════════════════
   GOOGLE SIGN-IN GATE
   Admin signs in here independently — no member login needed.
   ══════════════════════════════════════════════════════════ */
function AdminSignInGate({ onSignedIn }: { onSignedIn: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true); setError(null);
    try {
      const { error: signInError } = await supabaseAuth.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/admin/membership`,
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });
      if (signInError) throw signInError;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm rounded-[2rem] border border-sage/10 bg-white/90 p-8 shadow-glow text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sage/10">
          <Settings className="h-7 w-7 text-sage" />
        </div>
        <h1 className="font-display text-2xl text-sage">Membership Admin</h1>
        <p className="mt-2 text-sm text-sage/60">Sign in with your admin Google account to continue.</p>
        {error && <p className="mt-3 text-xs text-ember">{error}</p>}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full border border-sage/20 bg-white px-6 py-3 text-sm font-semibold text-sage shadow transition hover:bg-ivory disabled:opacity-60"
        >
          {loading ? (
            <RefreshCcw className="h-4 w-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? "Signing in…" : "Sign in with Google"}
        </button>
        <p className="mt-4 text-xs text-sage/40">Only authorised admin accounts can access this panel.</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   Protected by middleware (astro_admin_session cookie) +
   Google sign-in with profiles.is_admin = true.
   ══════════════════════════════════════════════════════════ */
export default function MembershipAdminPage() {
  const [authState, setAuthState] = useState<"loading" | "unauthenticated" | "authenticated">("loading");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  // Check Supabase session on mount + listen for auth changes (e.g. after OAuth redirect)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseAuth.auth.getSession();
      if (session?.user) {
        setAdminEmail(session.user.email ?? null);
        setAuthState("authenticated");
      } else {
        setAuthState("unauthenticated");
      }
    };
    void checkSession();

    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAdminEmail(session.user.email ?? null);
        setAuthState("authenticated");
      } else {
        setAdminEmail(null);
        setAuthState("unauthenticated");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabaseAuth.auth.signOut();
    setAuthState("unauthenticated");
  };

  // Show loading spinner
  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <RefreshCcw className="h-8 w-8 animate-spin text-sage/40" />
      </div>
    );
  }

  // Show sign-in gate if not authenticated
  if (authState === "unauthenticated") {
    return <AdminSignInGate onSignedIn={() => setAuthState("authenticated")} />;
  }

  const [tab, setTab]         = useState<Tab>("settings");
  const [toastMsg, setToast]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Settings state ── */
  const [sett, setSett] = useState<Settings>({ membership_price:"", membership_enabled:true, whatsapp_number:"" });

  /* ── Members state ── */
  const [members, setMembers] = useState<MemberRow[]>([]);

  /* ── Videos state ── */
  const [videos, setVideos]     = useState<VideoRow[]>([]);
  const [newVideo, setNewVideo] = useState(DEFAULT_VIDEO);

  /* ── Live events state ── */
  const [events, setEvents]     = useState<LiveEvent[]>([]);
  const [newEvent, setNewEvent] = useState(DEFAULT_EVENT);

  /* ── Coupons state ── */
  const [coupons, setCoupons]     = useState<CouponRow[]>([]);
  const [newCoupon, setNewCoupon] = useState(DEFAULT_COUPON);

  /* ── Audit state ── */
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const toast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  /* ── Load all data ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, mRes, vRes, eRes, cRes, aRes] = await Promise.all([
        adminFetch("/api/admin/membership/settings"),
        adminFetch("/api/admin/membership/members"),
        adminFetch("/api/admin/membership/videos"),
        adminFetch("/api/admin/membership/live-events"),
        adminFetch("/api/admin/membership/coupons"),
        adminFetch("/api/admin/membership/audit-log"),
      ]);
      if (sRes.ok) {
        const d = await sRes.json();
        setSett({ membership_price: String(d.membership_price ?? ""), membership_enabled: d.membership_enabled ?? true, whatsapp_number: d.whatsapp_number ?? "" });
      }
      if (mRes.ok) { const d = await mRes.json(); setMembers(d.members ?? []); }
      if (vRes.ok) { const d = await vRes.json(); setVideos(d.videos ?? []); }
      if (eRes.ok) { const d = await eRes.json(); setEvents(d.events ?? []); }
      if (cRes.ok) { const d = await cRes.json(); setCoupons(d.coupons ?? []); }
      if (aRes.ok) { const d = await aRes.json(); setAudit(d.entries ?? []); }
    } catch (e) { toast(`Load error: ${e instanceof Error ? e.message : String(e)}`); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* ── Settings save ── */
  const saveSettings = async () => {
    const res = await adminFetch("/api/admin/membership/settings", "POST", {
      membership_price:   Number(sett.membership_price),
      membership_enabled: sett.membership_enabled,
      whatsapp_number:    sett.whatsapp_number,
    });
    const d = await res.json();
    toast(res.ok ? "Settings saved." : `Error: ${d.error}`);
    if (res.ok) void load();
  };

  /* ── Member actions ── */
  const extendMember = async (userId: string) => {
    if (!confirm("Extend this member's access by 30 days?")) return;
    const res = await adminFetch("/api/admin/membership/members/extend", "POST", { user_id: userId });
    const d = await res.json();
    toast(res.ok ? `Extended. New expiry: ${d.new_expiry_date ? new Date(d.new_expiry_date).toLocaleDateString() : "?"}` : `Error: ${d.error}`);
    if (res.ok) void load();
  };
  const disableMember = async (userId: string) => {
    if (!confirm("Disable this member's access immediately?")) return;
    const res = await adminFetch("/api/admin/membership/members/disable", "POST", { user_id: userId });
    const d = await res.json();
    toast(res.ok ? "Member disabled." : `Error: ${d.error}`);
    if (res.ok) void load();
  };

  /* ── Video CRUD ── */
  const addVideo = async () => {
    if (!newVideo.title || !newVideo.video_url) { toast("Title and URL required."); return; }
    const res = await adminFetch("/api/admin/membership/videos", "POST", newVideo);
    const d = await res.json();
    toast(res.ok ? "Video added." : `Error: ${d.error}`);
    if (res.ok) { setNewVideo(DEFAULT_VIDEO); void load(); }
  };
  const deleteVideo = async (id: number) => {
    if (!confirm("Delete this video?")) return;
    const res = await adminFetch(`/api/admin/membership/videos/${id}`, "DELETE");
    const d = await res.json();
    toast(res.ok ? "Video deleted." : `Error: ${d.error}`);
    if (res.ok) void load();
  };
  const toggleVideo = async (v: VideoRow) => {
    const newStatus = v.status === "published" ? "draft" : "published";
    const res = await adminFetch("/api/admin/membership/videos", "POST", { ...v, status: newStatus });
    const d = await res.json();
    toast(res.ok ? `Video ${newStatus}.` : `Error: ${d.error}`);
    if (res.ok) void load();
  };

  /* ── Live event CRUD ── */
  const addEvent = async () => {
    if (!newEvent.title || !newEvent.event_date || !newEvent.youtube_link) { toast("Title, date, and link required."); return; }
    const res = await adminFetch("/api/admin/membership/live-events", "POST", newEvent);
    const d = await res.json();
    toast(res.ok ? "Event created." : `Error: ${d.error}`);
    if (res.ok) { setNewEvent(DEFAULT_EVENT); void load(); }
  };
  const deleteEvent = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    const res = await adminFetch(`/api/admin/membership/live-events/${id}`, "DELETE");
    const d = await res.json();
    toast(res.ok ? "Event deleted." : `Error: ${d.error}`);
    if (res.ok) void load();
  };

  /* ── Coupon CRUD ── */
  const addCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) { toast("Code and value required."); return; }
    const res = await adminFetch("/api/admin/membership/coupons", "POST", {
      code: newCoupon.code.trim().toUpperCase(), discount_type: newCoupon.discount_type,
      discount_value: Number(newCoupon.discount_value),
      max_uses: newCoupon.max_uses ? Number(newCoupon.max_uses) : null,
      expires_at: newCoupon.expires_at || null, is_active: newCoupon.is_active,
    });
    const d = await res.json();
    toast(res.ok ? "Coupon created." : `Error: ${d.error}`);
    if (res.ok) { setNewCoupon(DEFAULT_COUPON); void load(); }
  };
  const toggleCoupon = async (c: CouponRow) => {
    const res = await adminFetch("/api/admin/membership/coupons", "POST", { ...c, is_active: !c.is_active });
    toast(res.ok ? "Coupon updated." : "Update failed.");
    if (res.ok) void load();
  };
  const deleteCoupon = async (id: number) => {
    if (!confirm("Delete this coupon?")) return;
    const res = await adminFetch(`/api/admin/membership/coupons/${id}`, "DELETE");
    toast(res.ok ? "Coupon deleted." : "Delete failed.");
    if (res.ok) void load();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id:"settings",    label:"Settings",    icon:<Settings className="h-4 w-4" /> },
    { id:"members",     label:"Members",     icon:<Users className="h-4 w-4" />,     badge: members.filter(m=>m.membership_status==="active").length || undefined },
    { id:"videos",      label:"Videos",      icon:<Video className="h-4 w-4" />,     badge: videos.length || undefined },
    { id:"live-events", label:"Live Events", icon:<Radio className="h-4 w-4" />,     badge: events.filter(e=>e.is_active).length || undefined },
    { id:"coupons",     label:"Coupons",     icon:<Tag className="h-4 w-4" />,       badge: coupons.filter(c=>c.is_active).length || undefined },
    { id:"audit",       label:"Audit Log",   icon:<FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-ivory font-body text-sage">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-sage">Membership Admin</h1>
            <p className="mt-1 text-sm text-sage/60">Manage pricing, members, videos, live events, and coupons.</p>
          </div>
          <div className="flex items-center gap-3">
            {adminEmail && (
              <span className="hidden text-xs text-sage/50 sm:block">{adminEmail}</span>
            )}
            <button onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-full border border-sage/15 px-4 py-2 text-sm text-sage hover:bg-ivory/80">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-full border border-sage/15 px-4 py-2 text-sm text-sage/70 hover:text-sage">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="mb-5 flex items-start gap-2 rounded-2xl border border-gold/25 bg-gold/10 px-5 py-3 text-sm font-medium text-sage">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {toastMsg}
          </div>
        )}

        {/* Tab bar — horizontally scrollable on mobile */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === t.id ? "bg-sage text-ivory" : "border border-sage/20 bg-white text-sage hover:bg-ivory"
              }`}>
              {t.icon} {t.label}
              {t.badge ? <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${tab===t.id?"bg-white/20 text-ivory":"bg-gold/20 text-gold"}`}>{t.badge}</span> : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-sm text-sage/60">
            <RefreshCcw className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* ══ SETTINGS ══ */}
            {tab === "settings" && (
              <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                <h2 className="font-display text-xl text-sage mb-5">Membership Settings</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-sage">Membership Price (Rs.)</label>
                    <input type="number" value={sett.membership_price}
                      onChange={(e) => setSett({...sett, membership_price: e.target.value})}
                      className={IC} placeholder="999" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-sage">WhatsApp Number (E.164)</label>
                    <input type="text" value={sett.whatsapp_number}
                      onChange={(e) => setSett({...sett, whatsapp_number: e.target.value})}
                      className={IC} placeholder="919876543210" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-sage">
                      <input type="checkbox" checked={sett.membership_enabled}
                        onChange={(e) => setSett({...sett, membership_enabled: e.target.checked})}
                        className="h-4 w-4 rounded" />
                      Membership sales enabled
                    </label>
                  </div>
                </div>
                <button onClick={saveSettings}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-sage/85">
                  <Save className="h-4 w-4" /> Save Settings
                </button>
              </div>
            )}

            {/* ══ MEMBERS ══ */}
            {tab === "members" && (
              <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                <h2 className="font-display text-xl text-sage mb-5">Members ({members.length})</h2>
                {members.length === 0 ? <p className="text-sm text-sage/50">No members yet.</p> : (
                  <div className="flex flex-col gap-3">
                    {members.map((m) => (
                      <div key={m.id} className="rounded-[1.5rem] border border-sage/10 bg-ivory/60 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-sage text-sm truncate">{m.full_name || m.email || m.id}</p>
                            <p className="text-xs text-sage/60 mt-0.5">{m.email}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                m.membership_status==="active"?"bg-emerald-100 text-emerald-700":
                                m.membership_status==="expired"?"bg-red-100 text-red-700":"bg-sage/10 text-sage/50"
                              }`}>{m.membership_status}</span>
                              {m.expiry_date && <span className="text-xs text-sage/50">Expires: {new Date(m.expiry_date).toLocaleDateString()}</span>}
                              {m.latest_purchase?.amount_paid && <span className="text-xs text-sage/50">Rs. {m.latest_purchase.amount_paid}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => void extendMember(m.id)}
                              className="rounded-full border border-sage/20 bg-white px-3 py-1.5 text-xs font-semibold text-sage hover:bg-ivory transition">
                              +30 Days
                            </button>
                            {m.membership_status === "active" && (
                              <button onClick={() => void disableMember(m.id)}
                                className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition">
                                Disable
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ VIDEOS ══ */}
            {tab === "videos" && (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5">Add Video</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="text-sm font-medium text-sage">Title *</label>
                      <input value={newVideo.title} onChange={(e)=>setNewVideo({...newVideo,title:e.target.value})} className={IC} placeholder="Video title" /></div>
                    <div><label className="text-sm font-medium text-sage">Category</label>
                      <input value={newVideo.category} onChange={(e)=>setNewVideo({...newVideo,category:e.target.value})} className={IC} placeholder="Career, Wealth…" /></div>
                    <div className="sm:col-span-2"><label className="text-sm font-medium text-sage">YouTube URL *</label>
                      <input value={newVideo.video_url} onChange={(e)=>setNewVideo({...newVideo,video_url:e.target.value})} className={IC} placeholder="https://youtube.com/watch?v=…" /></div>
                    <div><label className="text-sm font-medium text-sage">Thumbnail URL</label>
                      <input value={newVideo.thumbnail_url} onChange={(e)=>setNewVideo({...newVideo,thumbnail_url:e.target.value})} className={IC} /></div>
                    <div><label className="text-sm font-medium text-sage">Description</label>
                      <input value={newVideo.description} onChange={(e)=>setNewVideo({...newVideo,description:e.target.value})} className={IC} /></div>
                    <div><label className="text-sm font-medium text-sage">Status</label>
                      <select value={newVideo.status} onChange={(e)=>setNewVideo({...newVideo,status:e.target.value as "published"|"draft"})} className={IC}>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select></div>
                  </div>
                  <button onClick={addVideo} className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-sage/85">
                    <Plus className="h-4 w-4" /> Add Video
                  </button>
                </div>
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5">Videos ({videos.length})</h2>
                  {videos.length === 0 ? <p className="text-sm text-sage/50">No videos yet.</p> : (
                    <div className="flex flex-col gap-3">
                      {videos.map((v) => (
                        <div key={v.id} className={`flex flex-col gap-3 rounded-[1.5rem] border p-4 sm:flex-row sm:items-center sm:justify-between ${v.status==="published"?"border-sage/10 bg-ivory/60":"border-sage/5 opacity-60"}`}>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sage text-sm truncate">{v.title}</p>
                            <p className="text-xs text-sage/50 mt-0.5">{v.category} · <a href={v.video_url} target="_blank" rel="noreferrer" className="underline">link</a></p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={()=>void toggleVideo(v)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${v.status==="published"?"bg-emerald-100 text-emerald-700":"bg-sage/10 text-sage/60"}`}>
                              {v.status==="published"?"Published":"Draft"}
                            </button>
                            <button onClick={()=>void deleteVideo(v.id)} className="rounded-full border border-red-200 bg-white p-1.5 text-red-500 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ LIVE EVENTS ══ */}
            {tab === "live-events" && (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5">Add Live Event</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="text-sm font-medium text-sage">Title *</label>
                      <input value={newEvent.title} onChange={(e)=>setNewEvent({...newEvent,title:e.target.value})} className={IC} placeholder="Event title" /></div>
                    <div><label className="text-sm font-medium text-sage">Date &amp; Time *</label>
                      <input type="datetime-local" value={newEvent.event_date} onChange={(e)=>setNewEvent({...newEvent,event_date:e.target.value})} className={IC} /></div>
                    <div className="sm:col-span-2"><label className="text-sm font-medium text-sage">YouTube Live URL *</label>
                      <input value={newEvent.youtube_link} onChange={(e)=>setNewEvent({...newEvent,youtube_link:e.target.value})} className={IC} placeholder="https://youtube.com/live/…" /></div>
                    <div><label className="text-sm font-medium text-sage">Thumbnail URL</label>
                      <input value={newEvent.thumbnail_url} onChange={(e)=>setNewEvent({...newEvent,thumbnail_url:e.target.value})} className={IC} /></div>
                    <div><label className="text-sm font-medium text-sage">Description</label>
                      <input value={newEvent.description} onChange={(e)=>setNewEvent({...newEvent,description:e.target.value})} className={IC} /></div>
                  </div>
                  <button onClick={addEvent} className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-sage/85">
                    <Plus className="h-4 w-4" /> Create Event
                  </button>
                </div>
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5">Live Events ({events.length})</h2>
                  {events.length === 0 ? <p className="text-sm text-sage/50">No events yet.</p> : (
                    <div className="flex flex-col gap-3">
                      {events.map((ev) => (
                        <div key={ev.id} className={`flex flex-col gap-3 rounded-[1.5rem] border p-4 sm:flex-row sm:items-center sm:justify-between ${ev.is_active?"border-sage/10 bg-ivory/60":"border-sage/5 opacity-60"}`}>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sage text-sm truncate">{ev.title}</p>
                            <p className="text-xs text-sage/50 mt-0.5">{new Date(ev.event_date).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ev.is_active?"bg-emerald-100 text-emerald-700":"bg-sage/10 text-sage/50"}`}>
                              {ev.is_active?"Active":"Hidden"}
                            </span>
                            <button onClick={()=>void deleteEvent(ev.id)} className="rounded-full border border-red-200 bg-white p-1.5 text-red-500 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ COUPONS ══ */}
            {tab === "coupons" && (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-gold" /> Create Coupon
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div><label className="text-sm font-medium text-sage">Code *</label>
                      <input value={newCoupon.code} onChange={(e)=>setNewCoupon({...newCoupon,code:e.target.value.toUpperCase().replace(/\s/g,"")})} className={IC} placeholder="SAVE20" /></div>
                    <div><label className="text-sm font-medium text-sage">Type</label>
                      <select value={newCoupon.discount_type} onChange={(e)=>setNewCoupon({...newCoupon,discount_type:e.target.value as "percent"|"fixed"})} className={IC}>
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed (Rs.)</option>
                      </select></div>
                    <div><label className="text-sm font-medium text-sage">Value * {newCoupon.discount_type==="percent"?"(%)":"(Rs.)"}</label>
                      <input type="number" value={newCoupon.discount_value} onChange={(e)=>setNewCoupon({...newCoupon,discount_value:e.target.value})} className={IC} placeholder="20" /></div>
                    <div><label className="text-sm font-medium text-sage">Max Uses (blank=unlimited)</label>
                      <input type="number" value={newCoupon.max_uses} onChange={(e)=>setNewCoupon({...newCoupon,max_uses:e.target.value})} className={IC} placeholder="100" /></div>
                    <div><label className="text-sm font-medium text-sage">Expires At (blank=never)</label>
                      <input type="datetime-local" value={newCoupon.expires_at} onChange={(e)=>setNewCoupon({...newCoupon,expires_at:e.target.value})} className={IC} /></div>
                    <div className="flex flex-col justify-end">
                      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-sage">
                        <input type="checkbox" checked={newCoupon.is_active} onChange={(e)=>setNewCoupon({...newCoupon,is_active:e.target.checked})} className="h-4 w-4 rounded" />
                        Active immediately
                      </label>
                    </div>
                  </div>
                  <button onClick={addCoupon} className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-sage/85">
                    <Plus className="h-4 w-4" /> Create Coupon
                  </button>
                </div>
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5">Coupons ({coupons.length})</h2>
                  {coupons.length === 0 ? <p className="text-sm text-sage/50">No coupons yet.</p> : (
                    <div className="flex flex-col gap-3">
                      {coupons.map((c) => (
                        <div key={c.id} className={`rounded-[1.5rem] border p-4 ${c.is_active?"border-sage/10 bg-ivory/60":"border-sage/5 opacity-60"}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sage">{c.code}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.is_active?"bg-emerald-100 text-emerald-700":"bg-sage/10 text-sage/50"}`}>
                                  {c.is_active?"Active":"Disabled"}
                                </span>
                              </div>
                              <p className="text-xs text-sage/60 mt-1">
                                {c.discount_type==="percent"?`${c.discount_value}% off`:`Rs. ${c.discount_value} off`}
                                {" · "}{c.used_count} used{c.max_uses?` / ${c.max_uses} max`:""}
                                {c.expires_at?` · expires ${new Date(c.expires_at).toLocaleDateString()}`:" · no expiry"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={()=>void toggleCoupon(c)} className="rounded-full border border-sage/20 bg-white px-3 py-1.5 text-xs font-semibold text-sage hover:bg-ivory transition">
                                {c.is_active?"Disable":"Enable"}
                              </button>
                              <button onClick={()=>void deleteCoupon(c.id)} className="rounded-full border border-red-200 bg-white p-1.5 text-red-500 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ AUDIT LOG ══ */}
            {tab === "audit" && (
              <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                <h2 className="font-display text-xl text-sage mb-5">Audit Log (last 50)</h2>
                {audit.length === 0 ? <p className="text-sm text-sage/50">No audit entries yet.</p> : (
                  <div className="flex flex-col gap-2 overflow-x-auto">
                    <div className="grid grid-cols-4 gap-2 rounded-xl bg-sage/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-sage/60">
                      <span>Action</span><span>By</span><span>User</span><span>Time</span>
                    </div>
                    {audit.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-4 gap-2 rounded-xl border border-sage/8 bg-ivory/50 px-4 py-2.5 text-xs text-sage/80">
                        <span className="font-semibold truncate">{entry.action}</span>
                        <span className="truncate">{entry.performed_by}</span>
                        <span className="truncate text-sage/50">{entry.target_user_id ? entry.target_user_id.slice(0,8)+"…" : "—"}</span>
                        <span className="text-sage/50">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
