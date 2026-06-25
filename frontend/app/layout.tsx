import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstroGenZ — Vedic Astrology & Spiritual Consultations",
  description: "Book personalised Vedic astrology consultations, numerology readings, and spiritual guidance with AstroGenZ. Pay via Razorpay and connect directly with your astrologer."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-ivory font-body text-sage antialiased">
        {children}
      </body>
    </html>
  );
}
