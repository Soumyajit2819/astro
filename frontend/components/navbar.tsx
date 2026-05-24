"use client";

import { Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  ["About", "#about"],
  ["Services", "#services"],
  ["Feedback", "#feedback"],
  ["FAQ", "#faq"],
  ["Contact", "#contact"]
] as const;

export function Navbar({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-sage/10 bg-ivory/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-sage">
          <Sparkles className="h-5 w-5 text-gold" />
          <span className="font-display text-lg font-semibold">{brandName}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="text-sm text-sage/80 transition hover:text-sage">
              {label}
            </a>
          ))}
          <a
            href="#booking"
            className="rounded-full bg-sage px-4 py-2 text-sm font-semibold text-ivory transition hover:bg-sage/90"
          >
            Book Consultation
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-sage/15 p-2 text-sage md:hidden"
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-sage/10 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="text-sm text-sage/80" onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
            <a
              href="#booking"
              className="rounded-full bg-sage px-4 py-2 text-center text-sm font-semibold text-ivory"
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
