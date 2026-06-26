"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { supabaseAuth, type LiveEvent } from "@/lib/supabase-auth";
import { LiveEventCard } from "@/components/live-event-card";

interface LiveEventsSectionProps {
  /** Supabase session JWT — passed down from premium page */
  jwt: string;
}

/**
 * LiveEventsSection
 * ──────────────────
 * Fetches live_events from Supabase (member RLS — no youtube_link).
 * Splits into Upcoming and Past.
 * Upcoming: event_date > now() - 2h AND is_active = true
 * Past:     event_date ≤ now() - 2h AND is_active = true
 */
export function LiveEventsSection({ jwt }: LiveEventsSectionProps) {
  const [events,  setEvents]  = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch active events — member RLS ensures no youtube_link leaks
      const { data } = await supabaseAuth
        .from("live_events")
        .select("id, title, description, thumbnail_url, event_date, is_active, created_at")
        .eq("is_active", true)
        .order("event_date", { ascending: true });

      setEvents((data ?? []) as LiveEvent[]);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-6 w-40 animate-pulse rounded-full bg-sage/10" />
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-[1.75rem] bg-sage/5" />
          ))}
        </div>
      </div>
    );
  }

  // Two hours ago threshold
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const upcoming = events.filter((e) => new Date(e.event_date) > twoHoursAgo);
  const past     = events.filter((e) => new Date(e.event_date) <= twoHoursAgo);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Section header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ember/10">
          <Radio className="h-4.5 w-4.5 text-ember" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-sage">Live Astrology Sessions</h2>
          <p className="text-sm text-sage/60">Exclusive live events for premium members</p>
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Upcoming Sessions
        </h3>
        {upcoming.length === 0 ? (
          <div className="rounded-[1.75rem] border border-sage/10 bg-white/50 py-12 text-center">
            <Radio className="mx-auto mb-3 h-8 w-8 text-sage/20" />
            <p className="text-sm text-sage/50">No upcoming live sessions right now.</p>
            <p className="mt-1 text-xs text-sage/40">Check back soon — new sessions are added regularly.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <LiveEventCard key={event.id} event={event} jwt={jwt} isPast={false} />
            ))}
          </div>
        )}
      </div>

      {/* Past sessions */}
      {past.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sage/50">
            Past Sessions
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <LiveEventCard key={event.id} event={event} jwt={jwt} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
