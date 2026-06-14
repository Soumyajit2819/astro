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
   "A" and "V" overlapping monogram — bold, solid, original.
   A sits slightly left, V overlaps from the right.
   Gold fill with sage shadow for depth.
   ─────────────────────────────────────────────────────────── */
function AstroVerseLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AstroVerse logo — AV monogram"
    >
      {/* Circle background */}
      <circle cx="22" cy="22" r="21" fill="#52624f" />

      {/* A — left-anchored, slightly offset right */}
      {/* Left leg */}
      <polygon points="8,36 15,10 19,10 26,36 21.5,36 19.5,28.5 13,28.5 11,36" fill="#c89b3c" />
      {/* A crossbar */}
      <rect x="13.8" y="24" width="7.2" height="3" fill="#c89b3c" />

      {/* V — overlaps A from centre, slightly lighter so both read */}
      {/* Left leg of V */}
      <polygon points="17,10 22,10 28,32 25,32" fill="#f7f1e3" opacity="0.95" />
      {/* Right leg of V */}
      <polygon points="22,10 36,10 31,36 25,32 28,32" fill="#f7f1e3" opacity="0.95" />
      {/* V inner cutout to show depth */}
      <polygon points="22,10 27.5,10 28,32 22,26" fill="#f7f1e3" opacity="0.95" />

      {/* Thin gold rim */}
      <circle cx="22" cy="22" r="20.2" stroke="#c89b3c" strokeWidth="1.2" fill="none" opacity="0.6" />
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
          <AstroVerseLogo size={40} />
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
