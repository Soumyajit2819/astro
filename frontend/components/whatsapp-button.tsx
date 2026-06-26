"use client";

import { useEffect, useState } from "react";

/**
 * WhatsAppButton
 * ───────────────
 * Fetches /api/membership/whatsapp-number on mount.
 * Renders nothing if number is empty or fetch fails.
 * Renders a green WhatsApp link button when number is present.
 */
export function WhatsAppButton() {
  const [number, setNumber] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/membership/whatsapp-number")
      .then((r) => r.json())
      .then((data: { whatsapp_number?: string | null }) => {
        if (data.whatsapp_number) setNumber(data.whatsapp_number);
      })
      .catch(() => { /* non-fatal — render nothing */ })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !number) return null;

  const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(
    "Hi, I just joined AstroGenZ Premium!"
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
      style={{ backgroundColor: "#25d366" }}
    >
      {/* WhatsApp SVG icon */}
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M20.52 3.48A11.94 11.94 0 0 0 12.05.02C5.46.02.02 5.46.02 12.05c0 2.13.56 4.2 1.62 6.03L.05 24l6.04-1.58A11.97 11.97 0 0 0 12.05 24C18.64 24 24 18.56 24 11.97c0-3.19-1.24-6.19-3.48-8.49ZM12.05 21.98c-1.8 0-3.57-.48-5.1-1.39l-.37-.22-3.79.99 1.01-3.69-.24-.38a9.96 9.96 0 0 1-1.53-5.32c0-5.52 4.49-10.01 10.02-10.01a9.96 9.96 0 0 1 7.09 2.94 9.97 9.97 0 0 1 2.93 7.07c0 5.52-4.5 10.01-10.02 10.01Zm5.49-7.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.18.2-.35.22-.65.07a8.16 8.16 0 0 1-2.4-1.48 9.06 9.06 0 0 1-1.66-2.06c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.46s1.06 2.85 1.2 3.05c.15.2 2.08 3.17 5.04 4.45.7.3 1.25.48 1.67.62.7.22 1.34.19 1.84.11.56-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
      </svg>
      Contact Astrologer on WhatsApp
    </a>
  );
}
