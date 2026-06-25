"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, RefreshCcw, Save, Trash2, XCircle } from "lucide-react";
import { supabaseAuth, type MembershipSettings, type MembershipPurchase, type PremiumVideo } from "@/lib/supabase-auth";

type PurchaseWithEmail = MembershipPurchase & { profiles?: { email: string; full_name: string } | null };

export default function MembershipAdminPage() {
  /* ── State ── */
  const [settings, setSettings] = useState<MembershipSettings | null>(null);
  const [price, setPrice] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseWithEmail[]>([]);
  const [videos, setVideos] = useState<PremiumVideo[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* New video form */
  const [newVideo, setNewVideo] = useState({
    title: "", description: "", video_url: "", thumbnail_url: "", category: "General",
  });

  const load = async () => {
    setLoading(true);
    const [s, p, v] = await Promise.all([
      supabaseAuth.from("membership_settings").select("*").limit(1).single(),
      supabaseAuth.from("membership_purchases")
        .select("*, profiles(email, full_name)")
        .order("created_at", { ascending: false }),
      supabaseAuth.from("premium_videos").select("*").order("sort_order", { ascending: true }),
    ]);
    if (s.data) {
      setSettings(s.data as MembershipSettings);
      setPrice(String(s.data.membership_price));
      setEnabled(s.data.membership_enabled);
    }
    setPurchases((p.data ?? []) as PurchaseWithEmail[]);
    setVideos((v.data ?? []) as PremiumVideo[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  /* ── Settings save ── */
  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabaseAuth.from("membership_settings")
      .update({ membership_price: Number(price), membership_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("id", settings.id);
    setStatus(error ? `Error: ${error.message}` : "Settings saved.");
    setTimeout(() => setStatus(null), 3000);
  };

  /* ── Approve/Reject purchase ── */
  const approvePurchase = async (id: number, userId: string) => {
    await supabaseAuth.from("membership_purchases")
      .update({ status: "approved", approved_by: "admin", approved_at: new Date().toISOString() })
      .eq("id", id);
    await supabaseAuth.from("profiles").update({ premium: true }).eq("id", userId);
    void load();
    setStatus("Purchase approved and user upgraded to premium.");
    setTimeout(() => setStatus(null), 3000);
  };

  const rejectPurchase = async (id: number) => {
    await supabaseAuth.from("membership_purchases")
      .update({ status: "rejected", approved_by: "admin", approved_at: new Date().toISOString() })
      .eq("id", id);
    void load();
  };

  /* ── Add video ── */
  const addVideo = async () => {
    if (!newVideo.title || !newVideo.video_url) {
      setStatus("Title and video URL are required."); return;
    }
    const maxOrder = Math.max(0, ...videos.map((v) => v.sort_order));
    const { error } = await supabaseAuth.from("premium_videos")
      .insert([{ ...newVideo, sort_order: maxOrder + 1, is_active: true }]);
    if (error) { setStatus(`Error: ${error.message}`); return; }
    setNewVideo({ title: "", description: "", video_url: "", thumbnail_url: "", category: "General" });
    setStatus("Video added.");
    void load();
    setTimeout(() => setStatus(null), 3000);
  };

  /* ── Delete video ── */
  const deleteVideo = async (id: number) => {
    await supabaseAuth.from("premium_videos").delete().eq("id", id);
    void load();
  };

  /* ── Toggle video active ── */
  const toggleVideo = async (id: number, current: boolean) => {
    await supabaseAuth.from("premium_videos").update({ is_active: !current }).eq("id", id);
    void load();
  };

  const inputClass = "mt-1.5 w-full rounded-2xl border border-sage/15 bg-white px-4 py-2.5 text-sm text-sage outline-none focus:border-sage/40";

  return (
    <div className="min-h-screen bg-ivory font-body text-sage">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-sage">Membership Admin</h1>
            <p className="mt-1 text-sm text-sage/60">Manage pricing, purchases, and premium video library.</p>
          </div>
          <button onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-full border border-sage/15 px-4 py-2 text-sm text-sage hover:bg-ivory/80">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {status && (
          <div className="rounded-2xl border border-gold/25 bg-gold/10 px-5 py-3 text-sm font-medium text-sage">{status}</div>
        )}

        {loading ? (
          <p className="text-sm text-sage/60">Loading…</p>
        ) : (
          <>
            {/* ── Settings ── */}
            <section className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
              <h2 className="font-display text-xl text-sage mb-5">Membership Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-sage">Membership Price (Rs.)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                    className={inputClass} placeholder="999" />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-sage">
                    <input type="checkbox" checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="h-4 w-4 rounded" />
                    Membership sales enabled
                  </label>
                </div>
              </div>
              <button onClick={saveSettings}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-sage/85">
                <Save className="h-4 w-4" /> Save Settings
              </button>
            </section>

            {/* ── Purchases ── */}
            <section className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
              <h2 className="font-display text-xl text-sage mb-5">
                Membership Purchases
                <span className="ml-2 rounded-full bg-gold/15 px-2.5 py-0.5 text-sm font-normal text-gold">
                  {purchases.filter((p) => p.status === "pending").length} pending
                </span>
              </h2>
              {purchases.length === 0 ? (
                <p className="text-sm text-sage/50">No purchases yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {purchases.map((p) => (
                    <div key={p.id}
                      className="flex flex-col gap-3 rounded-[1.5rem] border border-sage/10 bg-ivory/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-sage text-sm">
                          {(p as PurchaseWithEmail).profiles?.full_name || "Unknown"} —{" "}
                          {(p as PurchaseWithEmail).profiles?.email || p.user_id}
                        </p>
                        <p className="text-xs text-sage/60 mt-0.5">
                          Rs. {p.amount_paid} · {p.payment_id} · {new Date(p.created_at).toLocaleDateString()}
                        </p>
                        {p.payment_proof && (
                          <a href={p.payment_proof} target="_blank" rel="noreferrer"
                            className="text-xs text-gold underline">View proof</a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          p.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                          p.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
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
            </section>

            {/* ── Add Video ── */}
            <section className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
              <h2 className="font-display text-xl text-sage mb-5">Add Premium Video</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-sage">Title *</label>
                  <input value={newVideo.title}
                    onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                    placeholder="e.g. Career Astrology Deep Dive" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-sage">Category</label>
                  <input value={newVideo.category}
                    onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                    placeholder="Career, Wealth, Relationship…" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-sage">Video URL * (YouTube / Vimeo / Direct)</label>
                  <input value={newVideo.video_url}
                    onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..." className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-sage">Thumbnail URL (optional)</label>
                  <input value={newVideo.thumbnail_url}
                    onChange={(e) => setNewVideo({ ...newVideo, thumbnail_url: e.target.value })}
                    placeholder="https://…/thumb.jpg" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-sage">Description (optional)</label>
                  <input value={newVideo.description}
                    onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                    placeholder="Short description…" className={inputClass} />
                </div>
              </div>
              <button onClick={addVideo}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-sage/85">
                <Plus className="h-4 w-4" /> Add Video
              </button>
            </section>

            {/* ── Video list ── */}
            <section className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
              <h2 className="font-display text-xl text-sage mb-5">
                Premium Videos ({videos.length})
              </h2>
              {videos.length === 0 ? (
                <p className="text-sm text-sage/50">No videos added yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {videos.map((v) => (
                    <div key={v.id}
                      className={`flex flex-col gap-3 rounded-[1.5rem] border p-4 sm:flex-row sm:items-center sm:justify-between ${
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
                          }`}>
                          {v.is_active ? "Active" : "Hidden"}
                        </button>
                        <button onClick={() => void deleteVideo(v.id)}
                          className="rounded-full border border-red-200 bg-white p-1.5 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
