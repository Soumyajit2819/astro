"use client";

import { useState } from "react";
import { Calendar, Clock, ExternalLink, Loader2, Radio } from "lucide-react";
import type { LiveEvent } from "@/lib/supabase-auth";

interface LiveEventCardProps {
  event: LiveEvent;
  /** JWT for the /api/membership/live-link call */
  jwt: string;
  isPast?: boolean;
}

/**
 * LiveEventCard
 * ──────────────
 * Displays event metadata. "Join Live Session" button fetches
 * the youtube_link from the guard route, then opens it in a new tab.
 */
export function LiveEventCard({ event, jwt, isPast = false }: LiveEventCardProps) {
  const [joining, setJoining]   = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [imgError, setImgError]  = useState(false);

  const eventDate = new Date(event.event_date);
  const dateStr   = eventDate.toLocaleDateString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
  const timeStr = eventDate.toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  });

  const handleJoin = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch(`/api/membership/live-link?eventId=${event.id}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json() as { youtube_link?: string; error?: string };
      if (!res.ok || !data.youtube_link) {
        setJoinError(data.error ?? "Could not get live link. Try again.");
        return;
      }
      window.open(data.youtube_link, "_blank", "noopener,noreferrer");
    } catch {
      setJoinError("Network error. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className={`flex flex-col rounded-[1.75rem] border bg-white/80 shadow-glow overflow-hidden transition
      ${isPast ? "border-sage/10 opacity-70" : "border-gold/20"}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-sage/10">
        {!imgError && event.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.thumbnail_url}
            alt={event.title}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Branded fallback placeholder */
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3a1005, #5a1e0a, #8b1a1a)" }}
          >
            <Radio className="h-10 w-10 text-amber-300/60" />
          </div>
        )}
        {/* Past badge */}
        {isPast && (
          <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur">
            Past Session
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg text-sage leading-snug">{event.title}</h3>
        {event.description && (
          <p className="mt-1.5 text-sm leading-5 text-sage/65 line-clamp-2">{event.description}</p>
        )}

        {/* Date + time */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-sage/60">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> {dateStr}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {timeStr}
          </span>
        </div>

        {joinError && (
          <p className="mt-2 text-xs text-ember">{joinError}</p>
        )}

        {/* Join button */}
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={joining}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-60
              ${isPast
                ? "border border-sage/20 bg-white text-sage hover:bg-ivory"
                : "bg-sage text-ivory hover:bg-sage/85"
              }`}
          >
            {joining ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Opening…</>
            ) : (
              <><ExternalLink className="h-4 w-4" /> {isPast ? "Watch Recording" : "Join Live Session"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
