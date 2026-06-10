import type { Metadata } from "next";
import "./globals.css";
import { PlanetAnimations } from "@/components/planet-animations";

export const metadata: Metadata = {
  title: "Cosmic Consultation Studio",
  description: "Simple astrology consultation and class website with editable content, UPI payment details, and WhatsApp confirmation flow."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-ivory font-body text-sage antialiased">
        <PlanetAnimations />
        {children}
      </body>
    </html>
  );
}
