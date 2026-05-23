"use client";

import { Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  ["About", "#about"],
  ["Services", "#services"],
  ["Pricing", "#pricing"],
  ["Courses", "#courses"],
  ["Testimonials", "#testimonials"],
  ["FAQ", "#faq"],
  ["Contact", "#contact"]
] as const;

export function Navbar({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5 text-stardust" />
          <span className="font-display text-lg font-semibold">{brandName}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="text-sm text-slate-300 transition hover:text-white">
              {label}
            </a>
          ))}
          <a
            href="#booking"
            className="rounded-full bg-stardust px-4 py-2 text-sm font-semibold text-midnight transition hover:bg-yellow-300"
          >
            Book Consultation
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-white/10 p-2 text-white md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="text-sm text-slate-300" onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
            <a
              href="#booking"
              className="rounded-full bg-stardust px-4 py-2 text-center text-sm font-semibold text-midnight"
              onClick={() => setOpen(false)}
            >
              Book Consultation
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
