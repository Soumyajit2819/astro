import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cosmic Consultation Studio",
  description: "Simple astrology consultation and class website with editable content, UPI payment details, and WhatsApp confirmation flow."
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
