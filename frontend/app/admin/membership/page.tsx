"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, RefreshCcw, Save, Tag, Trash2, XCircle } from "lucide-react";
import { supabaseAuth, type MembershipSettings, type MembershipPurchase, type PremiumVideo } from "@/lib/supabase-auth";

type PurchaseWithEmail = MembershipPurchase & { profiles?: { email: string; full_name: string } | null };

type MembershipCoupon = {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

type Tab = "settings" | "purchases" | "videos" | "coupons";

export default function MembershipAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [settings, setSettings]   = useState<MembershipSettings | null>(null);
  const [price, setPrice]         = useState("");
  const [enabled, setEnabled]     = useState(true);
  const [purchases, setPurchases] = useState<PurchaseWithEmail[]>([]);
  const [videos, setVideos]       = useState<PremiumVideo[]>([]);
  const [coupons, setCoupons]     = useState<MembershipCoupon[]>([]);
  const [status, setStatus]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  /* New video form */
  const [newVideo, setNewVideo] = useState({
    title: "", description: "", video_url: "", thumbnail_url: "", category: "General",
  });

  /* New coupon form */
  const [newCoupon, setNewCoupon] = useState({
    code: "", discount_type: "percent" as "percent" | "fixed",
    discount_value: "", max_uses: "", expires_at: "", is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const [s, p, v, c] = await Promise.all([
      supabaseAuth.from("membership_settings").select("*").limit(1).single(),
      supabaseAuth.from("membership_purchases")
        .select("*, profiles(email, full_name)")
        .order("created_at", { ascending: false }),
      supabaseAuth.from("premium_videos").select("*").order("sort_order", { ascending: true }),
      supabaseAuth.from("membership_coupons").select("*").order("created_at", { ascending: false }),
    ]);
    if (s.data) {
      setSettings(s.data as MembershipSettings);
      setPrice(String(s.data.membership_price));
      setEnabled(s.data.membership_enabled);
    }
    setPurchases((p.data ?? []) as PurchaseWithEmail[]);
    setVideos((v.data ?? []) as PremiumVideo[]);
    setCoupons((c.data ?? []) as MembershipCoupon[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const toast = (msg: string) => { setStatus(msg); setTimeout(() => setStatus(null), 3000); };

  /* ── Settings ── */
  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabaseAuth.from("membership_settings")
      .update({ membership_price: Number(price), membership_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("id", settings.id);
    toast(error ? `Error: ${error.message}` : "Settings saved.");
  };

  /* ── Purchases ── */
  const approvePurchase = async (id: number, userId: string) => {
    await supabaseAuth.from("membership_purchases")
      .update({ status: "approved", approved_by: "admin", approved_at: new Date().toISOString() })
      .eq("id", id);
    await supabaseAuth.from("profiles").update({ premium: true }).eq("id", userId);
    void load();
    toast("Purchase approved.");
  };
  const rejectPurchase = async (id: number) => {
    await supabaseAuth.from("membership_purchases")
      .update({ status: "rejected", approved_by: "admin", approved_at: new Date().toISOString() })
      .eq("id", id);
    void load();
  };

  /* ── Videos ── */
  const addVideo = async () => {
    if (!newVideo.title || !newVideo.video_url) { toast("Title and URL required."); return; }
    const maxOrder = Math.max(0, ...videos.map((v) => v.sort_order));
    const { error } = await supabaseAuth.from("premium_videos")
      .insert([{ ...newVideo, sort_order: maxOrder + 1, is_active: true }]);
    if (error) { toast(`Error: ${error.message}`); return; }
    setNewVideo({ title: "", description: "", video_url: "", thumbnail_url: "", category: "General" });
    toast("Video added."); void load();
  };
  const deleteVideo = async (id: number) => {
    await supabaseAuth.from("premium_videos").delete().eq("id", id); void load();
  };
  const toggleVideo = async (id: number, current: boolean) => {
    await supabaseAuth.from("premium_videos").update({ is_active: !current }).eq("id", id); void load();
  };

  /* ── Coupons ── */
  const addCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) { toast("Code and discount value required."); return; }
    const { error } = await supabaseAuth.from("membership_coupons").insert([{
      code: newCoupon.code.trim().toUpperCase(),
      discount_type: newCoupon.discount_type,
      discount_value: Number(newCoupon.discount_value),
      max_uses: newCoupon.max_uses ? Number(newCoupon.max_uses) : null,
      expires_at: newCoupon.expires_at || null,
      is_active: newCoupon.is_active,
    }]);
    if (error) { toast(`Error: ${error.message}`); return; }
    setNewCoupon({ code: "", discount_type: "percent", discount_value: "", max_uses: "", expires_at: "", is_active: true });
    toast("Coupon created."); void load();
  };
  const toggleCoupon = async (id: number, current: boolean) => {
    await supabaseAuth.from("membership_coupons").update({ is_active: !current }).eq("id", id); void load();
  };
  const deleteCoupon = async (id: number) => {
    await supabaseAuth.from("membership_coupons").delete().eq("id", id); void load();
  };

  const inputClass = "mt-1.5 w-full rounded-2xl border border-sage/15 bg-white px-4 py-2.5 text-sm text-sage outline-none focus:border-sage/40";

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "settings",  label: "Settings" },
    { id: "purchases", label: "Purchases", badge: purchases.filter(p => p.status === "pending").length || undefined },
    { id: "videos",    label: "Videos",    badge: videos.length || undefined },
    { id: "coupons",   label: "Coupons",   badge: coupons.length || undefined },
  ];

  return (
    <div className="min-h-screen bg-ivory font-body text-sage">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-sage">Membership Admin</h1>
            <p className="mt-1 text-sm text-sage/60">Manage pricing, purchases, videos, and coupon codes.</p>
          </div>
          <button onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-full border border-sage/15 px-4 py-2 text-sm text-sage hover:bg-ivory/80">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {status && (
          <div className="mb-6 rounded-2xl border border-gold/25 bg-gold/10 px-5 py-3 text-sm font-medium text-sage">{status}</div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-sage text-ivory" : "border border-sage/20 bg-white text-sage hover:bg-ivory"
              }`}>
              {tab.label}
              {tab.badge ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  activeTab === tab.id ? "bg-white/20 text-ivory" : "bg-gold/20 text-gold"
                }`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-sage/60">Loading…</p> : (
          <>
            {/* ── SETTINGS TAB ── */}
            {activeTab === "settings" && (
              <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                <h2 className="font-display text-xl text-sage mb-5">Membership Settings</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-sage">Membership Price (Rs.)</label>
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                      className={inputClass} placeholder="999" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-sage">
                      <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded" />
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

            {/* ── PURCHASES TAB ── */}
            {activeTab === "purchases" && (
              <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                <h2 className="font-display text-xl text-sage mb-5">
                  Purchases
                  {purchases.filter(p => p.status === "pending").length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-normal text-amber-700">
                      {purchases.filter(p => p.status === "pending").length} pending
                    </span>
                  )}
                </h2>
                {purchases.length === 0 ? <p className="text-sm text-sage/50">No purchases yet.</p> : (
                  <div className="flex flex-col gap-3">
                    {purchases.map((p) => (
                      <div key={p.id}
                        className="flex flex-col gap-3 rounded-[1.5rem] border border-sage/10 bg-ivory/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-sage text-sm">
                            {(p as PurchaseWithEmail).profiles?.full_name || "Unknown"} — {(p as PurchaseWithEmail).profiles?.email || p.user_id}
                          </p>
                          <p className="text-xs text-sage/60 mt-0.5">
                            Rs. {p.amount_paid} · {p.payment_id} · {new Date(p.created_at).toLocaleDateString()}
                          </p>
                          {p.payment_proof && (
                            <a href={p.payment_proof} target="_blank" rel="noreferrer" className="text-xs text-gold underline">View proof</a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            p.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                            p.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}>{p.status}</span>
                          {p.status === "pending" && (
                            <>
                              <button onClick={() => void approvePurchase(p.id, p.user_id!)}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button onClick={() => void rejectPurchase(p.id)}
                                className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── VIDEOS TAB ── */}
            {activeTab === "videos" && (
              <div className="space-y-6">
                {/* Add video */}
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5">Add Premium Video</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="text-sm font-medium text-sage">Title *</label>
                      <input value={newVideo.title} onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                        placeholder="e.g. Career Astrology Deep Dive" className={inputClass} /></div>
                    <div><label className="text-sm font-medium text-sage">Category</label>
                      <input value={newVideo.category} onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                        placeholder="Career, Wealth, Relationship…" className={inputClass} /></div>
                    <div className="sm:col-span-2"><label className="text-sm font-medium text-sage">Video URL *</label>
                      <input value={newVideo.video_url} onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..." className={inputClass} /></div>
                    <div><label className="text-sm font-medium text-sage">Thumbnail URL (optional)</label>
                      <input value={newVideo.thumbnail_url} onChange={(e) => setNewVideo({ ...newVideo, thumbnail_url: e.target.value })}
                        placeholder="https://…/thumb.jpg" className={inputClass} /></div>
                    <div><label className="text-sm font-medium text-sage">Description</label>
                      <input value={newVideo.description} onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                        placeholder="Short description…" className={inputClass} /></div>
                  </div>
                  <button onClick={addVideo}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-sage/85">
                    <Plus className="h-4 w-4" /> Add Video
                  </button>
                </div>
                {/* Video list */}
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5">Videos ({videos.length})</h2>
                  {videos.length === 0 ? <p className="text-sm text-sage/50">No videos yet.</p> : (
                    <div className="flex flex-col gap-3">
                      {videos.map((v) => (
                        <div key={v.id} className={`flex flex-col gap-3 rounded-[1.5rem] border p-4 sm:flex-row sm:items-center sm:justify-between ${
                          v.is_active ? "border-sage/10 bg-ivory/60" : "border-sage/5 bg-sage/3 opacity-60"
                        }`}>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sage text-sm truncate">{v.title}</p>
                            <p className="text-xs text-sage/50 mt-0.5">{v.category} · <a href={v.video_url} target="_blank" rel="noreferrer" className="underline">open link</a></p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => void toggleVideo(v.id, v.is_active)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                v.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-sage/10 text-sage/60 hover:bg-sage/20"
                              }`}>{v.is_active ? "Active" : "Hidden"}</button>
                            <button onClick={() => void deleteVideo(v.id)}
                              className="rounded-full border border-red-200 bg-white p-1.5 text-red-500 hover:bg-red-50">
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

            {/* ── COUPONS TAB ── */}
            {activeTab === "coupons" && (
              <div className="space-y-6">
                {/* Add coupon */}
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-gold" /> Create Coupon
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div><label className="text-sm font-medium text-sage">Code *</label>
                      <input value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().replace(/\s/g,"") })}
                        placeholder="SAVE20" className={inputClass} /></div>
                    <div>
                      <label className="text-sm font-medium text-sage">Discount Type</label>
                      <select value={newCoupon.discount_type}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as "percent" | "fixed" })}
                        className={inputClass}>
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (Rs.)</option>
                      </select>
                    </div>
                    <div><label className="text-sm font-medium text-sage">
                        Discount Value * {newCoupon.discount_type === "percent" ? "(%)" : "(Rs.)"}
                      </label>
                      <input type="number" value={newCoupon.discount_value}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                        placeholder={newCoupon.discount_type === "percent" ? "20" : "100"}
                        className={inputClass} /></div>
                    <div><label className="text-sm font-medium text-sage">Max Uses (blank = unlimited)</label>
                      <input type="number" value={newCoupon.max_uses}
                        onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                        placeholder="100" className={inputClass} /></div>
                    <div><label className="text-sm font-medium text-sage">Expires At (blank = never)</label>
                      <input type="datetime-local" value={newCoupon.expires_at}
                        onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                        className={inputClass} /></div>
                    <div className="flex flex-col justify-end">
                      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-sage">
                        <input type="checkbox" checked={newCoupon.is_active}
                          onChange={(e) => setNewCoupon({ ...newCoupon, is_active: e.target.checked })}
                          className="h-4 w-4 rounded" />
                        Active immediately
                      </label>
                    </div>
                  </div>
                  <button onClick={addCoupon}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-sage/85">
                    <Plus className="h-4 w-4" /> Create Coupon
                  </button>
                </div>

                {/* Coupon list */}
                <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
                  <h2 className="font-display text-xl text-sage mb-5">Coupons ({coupons.length})</h2>
                  {coupons.length === 0 ? <p className="text-sm text-sage/50">No coupons created yet.</p> : (
                    <div className="flex flex-col gap-3">
                      {coupons.map((c) => (
                        <div key={c.id} className={`rounded-[1.5rem] border p-4 transition ${
                          c.is_active ? "border-sage/10 bg-ivory/60" : "border-sage/5 opacity-60"
                        }`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sage">{c.code}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-sage/10 text-sage/50"
                                }`}>{c.is_active ? "Active" : "Disabled"}</span>
                              </div>
                              <p className="text-xs text-sage/60 mt-1">
                                {c.discount_type === "percent" ? `${c.discount_value}% off` : `Rs. ${c.discount_value} off`}
                                {" · "}
                                {c.used_count} used{c.max_uses ? ` / ${c.max_uses} max` : ""}
                                {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : " · no expiry"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => void toggleCoupon(c.id, c.is_active)}
                                className="rounded-full border border-sage/20 bg-white px-3 py-1.5 text-xs font-semibold text-sage hover:bg-ivory transition">
                                {c.is_active ? "Disable" : "Enable"}
                              </button>
                              <button onClick={() => void deleteCoupon(c.id)}
                                className="rounded-full border border-red-200 bg-white p-1.5 text-red-500 hover:bg-red-50">
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
          </>
        )}
      </div>
    </div>
  );
}
