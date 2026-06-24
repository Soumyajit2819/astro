"use client";

import { Sparkles, Zap } from "lucide-react";

interface AnnouncementBannerProps {
  classServiceId?: string;
}

export function AnnouncementBanner({ classServiceId }: AnnouncementBannerProps) {

  const handleEnroll = () => {
    // Store the actual class service id so ContactSection picks it up
    if (classServiceId) {
      sessionStorage.setItem("astro-preselect-service", classServiceId);
    } else {
      sessionStorage.setItem("astro-preselect-service-banner", "class");
    }
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative overflow-hidden w-full" style={{ zIndex: 10 }}>
      {/* Animated gradient background */}
      <div
        className="offer-banner-bg relative w-full py-4 px-4 sm:px-6 lg:px-8"
        style={{
          background: "linear-gradient(135deg, #1a2518 0%, #2d3d2a 25%, #3e5438 50%, #6b4c0a 75%, #c89b3c 100%)",
          backgroundSize: "300% 300%",
          animation: "bannerShift 6s ease infinite",
        }}
      >
        {/* Shimmer overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(253,230,138,0.12) 50%, transparent 60%)",
            animation: "shimmer 3s linear infinite",
          }}
        />

        {/* Stars decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { top: "20%", left: "8%", size: 3, delay: "0s" },
            { top: "60%", left: "15%", size: 2, delay: "0.8s" },
            { top: "30%", left: "50%", size: 2, delay: "1.4s" },
            { top: "70%", left: "72%", size: 3, delay: "0.3s" },
            { top: "20%", left: "88%", size: 2, delay: "1.8s" },
          ].map((star, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-[#fde68a]"
              style={{
                top: star.top, left: star.left,
                width: star.size, height: star.size,
                animation: `twinkle 2.5s ease-in-out ${star.delay} infinite`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          {/* Left — offer text */}
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "rgba(200,155,60,0.25)",
                border: "1.5px solid rgba(253,230,138,0.40)",
                animation: "pulse-ring 2s ease-in-out infinite",
              }}
            >
              <Sparkles className="h-4 w-4 text-[#fde68a]" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#fde68a]">
                🔥 Limited Offer — Seats Filling Fast!
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#f7f1e3]">
                Astrology Foundation Class · Special Price · Don&apos;t miss out
              </p>
            </div>
          </div>

          {/* Right — CTA only, no dismiss */}
          <button
            type="button"
            onClick={handleEnroll}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #c89b3c, #fde68a, #c89b3c)",
              backgroundSize: "200% 100%",
              animation: "btnShine 3s linear infinite",
              color: "#1a2518",
              boxShadow: "0 0 18px rgba(200,155,60,0.50), 0 4px 12px rgba(0,0,0,0.25)",
            }}
          >
            <Zap className="h-4 w-4" />
            Join Now
          </button>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes bannerShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes btnShine {
          0%,100% { background-position: 0% 0%; }
          50%      { background-position: 100% 0%; }
        }
        @keyframes pulse-ring {
          0%,100% { box-shadow: 0 0 0 0 rgba(200,155,60,0.4); }
          50%      { box-shadow: 0 0 0 6px rgba(200,155,60,0); }
        }
      `}</style>
    </div>
  );
}
