"use client";

import { X, Zap } from "lucide-react";
import { useState } from "react";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const handleEnroll = () => {
    sessionStorage.setItem("astro-preselect-service-banner", "class");
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="relative z-50 w-full"
      style={{
        background: "linear-gradient(90deg, #2d3d2a 0%, #3e5438 40%, #52624f 70%, #c89b3c 100%)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Left — pulse icon + text */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c89b3c] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#fde68a]" />
          </span>
          <p className="truncate text-xs font-semibold text-[#f7f1e3] sm:text-sm">
            🎓 <span className="text-[#fde68a]">Limited offer</span> — Astrology Foundation Class · Hurry, seats filling fast!
          </p>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleEnroll}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#c89b3c] px-3 py-1.5 text-xs font-bold text-[#2d3d2a] transition hover:bg-[#fde68a]"
          >
            <Zap className="h-3 w-3" />
            Join Now
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="rounded-full p-1 text-[#f7f1e3]/60 transition hover:text-[#f7f1e3]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
