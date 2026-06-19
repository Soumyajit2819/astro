"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  ["About", "#about"],
  ["Services & Consultation", "#contact"],
  ["Feedback", "#feedback"],
  ["FAQ", "#faq"],
] as const;

/* ── AstroVerse Logo — uses the uploaded PNG ── */
function AstroVerseLogo({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/astroverse-logo.png"
      alt="AstroVerse"
      width={size}
      height={size}
      className="rounded-md object-contain"
    />
  );
}

export function Navbar({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gold/15 bg-[linear-gradient(180deg,rgba(252,248,239,0.97),rgba(247,241,227,0.93))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 text-sage">
          <AstroVerseLogo size={40} />
          <span className="font-display text-xl font-semibold tracking-wide text-sage">
            {brandName}
          </span>
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
