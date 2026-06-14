"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  ["About", "#about"],
  ["Services", "#services-list"],
  ["Feedback", "#feedback"],
  ["FAQ", "#faq"],
  ["Contact", "#contact"]
] as const;

/* ── AstroVerse SVG Logo ─────────────────────────────────────
   A crescent moon cradling a 6-pointed star, with a small
   orbit ring — original, simple, spiritually themed.
   Not a registered trademark of any known brand.
   ─────────────────────────────────────────────────────────── */
function AstroVerseLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AstroVerse logo"
    >
      {/* Outer orbit ellipse */}
      <ellipse
        cx="20" cy="20"
        rx="18" ry="7"
        stroke="#c89b3c"
        strokeWidth="1.4"
        strokeDasharray="3 2"
        transform="rotate(-25 20 20)"
        opacity="0.7"
      />
      {/* Crescent moon */}
      <path
        d="M20 7 C13 7 8 13 8 20 C8 27 13 33 20 33 C15 29 13 24.5 13 20 C13 15.5 15 11 20 7Z"
        fill="#c89b3c"
        opacity="0.90"
      />
      {/* 6-pointed star (two triangles) */}
      <polygon
        points="24,12 25.7,17 31,17 26.6,20.2 28.3,25.2 24,22 19.7,25.2 21.4,20.2 17,17 22.3,17"
        fill="#52624f"
        opacity="0.85"
      />
      {/* Centre dot */}
      <circle cx="24" cy="19" r="1.8" fill="#c89b3c" />
    </svg>
  );
}

export function Navbar({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gold/15 bg-[linear-gradient(180deg,rgba(252,248,239,0.97),rgba(247,241,227,0.93))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 text-sage">
          <AstroVerseLogo size={36} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold tracking-wide text-sage">
              {brandName}
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-medium">
              Vedic · Astrology
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-sage/80 transition hover:text-sage"
            >
              {label}
            </a>
          ))}
          <a
            href="#booking"
            className="rounded-full bg-sage px-5 py-2 text-sm font-semibold text-ivory shadow-glow transition hover:bg-sage/88"
          >
            Book Now
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-sage/15 p-2 text-sage md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gold/15 bg-white/60 px-4 py-4 md:hidden backdrop-blur">
          <div className="flex flex-col gap-4">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-sage/85"
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ))}
            <a
              href="#booking"
              className="rounded-full bg-sage px-4 py-2.5 text-center text-sm font-semibold text-ivory"
              onClick={() => setOpen(false)}
            >
              Book Now
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
