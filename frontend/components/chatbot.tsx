"use client";

import type { SiteConfig } from "@/lib/site-config";
import { Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  chips?: string[];
  socialLinks?: { label: string; url: string; icon: "instagram" | "youtube" | "facebook" }[];
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function match(input: string, keywords: string[]) {
  const l = input.toLowerCase();
  return keywords.some((k) => l.includes(k));
}
function discountedPrice(price: number, pct: number) {
  return pct > 0 ? Math.round(price * (1 - pct / 100)) : price;
}

function getBotReply(raw: string, config: SiteConfig): Omit<Message, "id" | "role"> {
  const input = raw.toLowerCase().trim();
  const a = config.astrologers[0];
  const svcs = config.services;

  /* help */
  if (match(input, ["help", "menu", "options", "what can", "topics"])) {
    return {
      text: "Here's what I can help you with:",
      chips: ["About astrologer", "All services", "Career consultation", "Marriage consultation", "Astrology class", "How to book", "Payment", "Coupon & offers", "Social media", "Contact", "Leave feedback", "FAQs"],
    };
  }

  /* greetings */
  if (match(input, ["hi", "hello", "namaste", "hey", "namaskar", "good morning", "good evening"])) {
    return {
      text: `Namaste! 🙏 Welcome to AstroVerse.\n\nI'm Verse AI — your spiritual guide assistant. Ask me about our services, astrologer, booking, or anything else.`,
      chips: ["All services", "About astrologer", "How to book", "FAQs"],
    };
  }

  /* ── SPECIFIC SERVICES — check before generic "about" ── */

  /* marriage */
  if (match(input, ["marriage", "wedding", "kundali", "compatibility", "partner", "love", "relationship"])) {
    const svc = svcs.find((s) =>
      s.name.toLowerCase().includes("marriage") ||
      s.description.toLowerCase().includes("marriage") ||
      s.description.toLowerCase().includes("relationship")
    );
    if (svc) {
      const dp = discountedPrice(svc.price, svc.discountPercent ?? 0);
      return {
        text: `💑 *${svc.name}*\n\n${svc.description}\n\n💰 Price: Rs. ${dp}${dp < svc.price ? ` (${svc.discountPercent}% off from Rs. ${svc.price})` : ""}`,
        chips: ["Book now", "All services", "How to book"],
      };
    }
  }

  /* career */
  if (match(input, ["career", "job", "profession", "business", "work"])) {
    const svc = svcs.find((s) =>
      s.name.toLowerCase().includes("career") ||
      s.description.toLowerCase().includes("career")
    );
    if (svc) {
      const dp = discountedPrice(svc.price, svc.discountPercent ?? 0);
      return {
        text: `💼 *${svc.name}*\n\n${svc.description}\n\n💰 Price: Rs. ${dp}${dp < svc.price ? ` (${svc.discountPercent}% off from Rs. ${svc.price})` : ""}`,
        chips: ["Book now", "All services", "How to book"],
      };
    }
  }

  /* class */
  if (match(input, ["class", "learn", "course", "batch", "enroll", "study", "beginner", "foundation"])) {
    const classSvcs = svcs.filter((s) => s.type === "class");
    if (classSvcs.length > 0) {
      const lines = classSvcs.map((s) => {
        const dp = discountedPrice(s.price, s.discountPercent ?? 0);
        return `🎓 *${s.name}*\n${s.description}\nPrice: Rs. ${dp}${dp < s.price ? ` (${s.discountPercent}% off)` : ""}`;
      });
      return { text: `Here are our classes:\n\n${lines.join("\n\n")}`, chips: ["Book now", "All services"] };
    }
  }

  /* all services */
  if (match(input, ["all service", "view service", "service", "offering", "price", "cost", "fees", "what do you offer"])) {
    const lines = svcs.map((s) => {
      const dp = discountedPrice(s.price, s.discountPercent ?? 0);
      const icon = s.type === "class" ? "🎓" : "🔮";
      return `${icon} *${s.name}* — Rs. ${dp}${dp < s.price ? ` _(${s.discountPercent}% off)_` : ""}\n   ${s.description}`;
    });
    return {
      text: `Our services:\n\n${lines.join("\n\n")}`,
      chips: ["Career consultation", "Marriage consultation", "Astrology class", "Book now"],
    };
  }

  /* astrologer */
  if (match(input, ["astrologer", "who is", "about astrologer", "profile", "tell me about astrologer"])) {
    return {
      text: `✨ *${a.name}*\n${a.title}\n\n${a.bio}\n\n🕰 ${a.experience}`,
      chips: ["All services", "Book now", "Social media"],
    };
  }

  /* experience */
  if (match(input, ["experience", "years", "how long", "expertise", "background"])) {
    return {
      text: `🌠 ${a.name} has ${a.experience} — blending deep Vedic knowledge with warm, personal guidance for every client.`,
      chips: ["All services", "Book now"],
    };
  }

  /* booking */
  if (match(input, ["book", "booking", "how to book", "appointment", "schedule", "reserve"])) {
    return {
      text: `📅 Booking is simple:\n\n1. Go to the Services section\n2. Click "Book now" on your chosen service\n3. Fill your personal & birth details\n4. Pay securely via Razorpay\n5. WhatsApp opens automatically with your details\n6. The astrologer confirms your slot personally 🙏`,
      chips: ["Go to #booking", "All services", "Payment"],
    };
  }

  /* payment */
  if (match(input, ["payment", "pay", "razorpay", "upi", "how to pay", "online payment", "card"])) {
    return {
      text: `💳 We use *Razorpay* for secure payments.\n\nAccepted: UPI · Cards · Net Banking · Wallets\n\nSteps:\n1. Select service & fill details\n2. Click "Pay via Razorpay"\n3. Complete payment in the Razorpay window\n4. Done — astrologer is notified on WhatsApp automatically ✅`,
      chips: ["Book now", "Contact"],
    };
  }

  /* social media — render as actual buttons */
  if (match(input, ["instagram", "youtube", "facebook", "social", "follow", "connect", "social media", "links"])) {
    const links: Message["socialLinks"] = [];
    if (a.instagram) links.push({ label: "Instagram", url: a.instagram, icon: "instagram" });
    if (a.youtube) links.push({ label: "YouTube", url: a.youtube, icon: "youtube" });
    if (a.facebook) links.push({ label: "Facebook", url: a.facebook, icon: "facebook" });
    if (!links.length) return { text: "Social links haven't been set up yet. Check back soon! 🌟" };
    return {
      text: `Follow ${a.name} on social media 🌐`,
      socialLinks: links,
      chips: ["About astrologer", "Book now"],
    };
  }

  /* feedback */
  if (match(input, ["feedback", "review", "testimonial", "rating", "leave feedback", "share experience"])) {
    return {
      text: `💬 Had a consultation? We'd love your feedback!\n\nYour words help others on their spiritual journey. Please leave a review in our Feedback section — it means a lot. 🙏`,
      chips: ["Go to #feedback", "Book now"],
    };
  }

  /* contact */
  if (match(input, ["contact", "phone", "whatsapp", "reach", "call", "number", "get in touch"])) {
    return {
      text: `📞 Reach ${a.name} directly:\n\n📱 Phone: ${a.phone}\n💬 WhatsApp: +${a.whatsapp}\n\nAfter payment, WhatsApp opens automatically with your booking details. 🌟`,
      chips: ["Book now", "Payment"],
    };
  }

  /* coupon */
  if (match(input, ["coupon", "discount", "offer", "promo", "code", "deal"])) {
    const active = (config.coupons ?? []).filter((c) => c.active);
    if (active.length > 0) {
      const lines = active.map((c) => `🏷 *${c.code}* — ${c.discountPercent}% off\n   ${c.description}`);
      return {
        text: `🎉 Active coupon codes:\n\n${lines.join("\n\n")}\n\nEnter at checkout in the booking form.`,
        chips: ["Book now", "All services"],
      };
    }
    return {
      text: "🎁 No active coupons right now. Follow us on social media for the latest offers!",
      chips: ["Social media", "Book now"],
    };
  }

  /* faq */
  if (match(input, ["faq", "frequently asked", "common question", "question"])) {
    if (!config.faqs.length) return { text: "No FAQs yet. Ask me anything directly!", chips: ["All services", "Book now"] };
    const lines = config.faqs.map((f) => `❓ ${f.question}\n   → ${f.answer}`);
    return { text: `Frequently Asked Questions:\n\n${lines.join("\n\n")}`, chips: ["Book now", "Contact"] };
  }

  /* fallback */
  return {
    text: "I didn't quite get that 🤔\n\nTry asking about our services, the astrologer, how to book, or type 'help' to see all topics.",
    chips: ["Help", "All services", "Book now"],
  };
}

function makeWelcome(config: SiteConfig): Message {
  return {
    id: uid(), role: "bot",
    text: `Namaste! 🙏 I'm *Verse AI* — the AstroVerse assistant.\n\nAsk me about services, the astrologer, booking, or anything else.`,
    chips: ["All services", "About astrologer", "How to book", "FAQs", "Social media"],
  };
}

/* ── Social icon SVGs ── */
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

/* ── Bot avatar SVG ── */
function BotAvatar() {
  return (
    <svg viewBox="0 0 36 36" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <rect x="6" y="10" width="24" height="18" rx="5" fill="#f7f1e3" opacity="0.9"/>
      {/* Eyes */}
      <circle cx="13" cy="18" r="2.5" fill="#52624f"/>
      <circle cx="23" cy="18" r="2.5" fill="#52624f"/>
      <circle cx="14" cy="17" r="1" fill="white"/>
      <circle cx="24" cy="17" r="1" fill="white"/>
      {/* Smile */}
      <path d="M13 23 Q18 26 23 23" stroke="#52624f" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Antenna */}
      <line x1="18" y1="10" x2="18" y2="5" stroke="#c89b3c" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="18" cy="4" r="2" fill="#c89b3c"/>
      {/* Ears */}
      <rect x="2" y="15" width="4" height="6" rx="2" fill="#f7f1e3" opacity="0.9"/>
      <rect x="30" y="15" width="4" height="6" rx="2" fill="#f7f1e3" opacity="0.9"/>
    </svg>
  );
}

export function Chatbot({ config }: { config: SiteConfig }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [makeWelcome(config)]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: uid(), role: "user", text: trimmed };
    const reply = getBotReply(trimmed, config);
    const botMsg: Message = { id: uid(), role: "bot", ...reply };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  }

  const chipMap: Record<string, string> = {
    "About astrologer": "about astrologer",
    "All services": "all services",
    "Career consultation": "career",
    "Marriage consultation": "marriage",
    "Astrology class": "class",
    "How to book": "how to book",
    "Payment": "payment",
    "Coupon & offers": "coupon",
    "Social media": "social media",
    "Contact": "contact",
    "Leave feedback": "leave feedback",
    "FAQs": "faq",
    "Help": "help",
    "Book now": "book now",
    "View services": "all services",
    "View all services": "all services",
    "Payment info": "payment",
    "Go to #booking": "book now",
    "Go to #feedback": "leave feedback",
  };

  function handleChip(chip: string) {
    if (chip.startsWith("Go to #")) return; // handled as <a>
    sendMessage(chipMap[chip] ?? chip);
  }

  /* render bold *text* */
  function renderText(text: string) {
    return text.split(/(\*[^*]+\*)/g).map((part, i) =>
      part.startsWith("*") && part.endsWith("*")
        ? <strong key={i}>{part.slice(1, -1)}</strong>
        : <span key={i}>{part}</span>
    );
  }

  return (
    <>
      {/* ── Floating button — dark green, bot icon, glowing ── */}
      <button
        type="button"
        aria-label="Open Verse AI chat"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          background: "linear-gradient(135deg, #2d3d2a 0%, #3e5438 50%, #52624f 100%)",
          boxShadow: "0 0 0 3px rgba(82,98,79,0.25), 0 8px 24px rgba(30,45,28,0.40)",
          focusRingColor: "#52624f",
        }}
      >
        {open ? (
          <X className="h-6 w-6 text-[#f7f1e3]" />
        ) : (
          <BotAvatar />
        )}
        {/* Pulse ring when closed */}
        {!open && (
          <span className="absolute inset-0 animate-ping rounded-full opacity-20"
            style={{ background: "rgba(82,98,79,0.6)" }} />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed bottom-28 right-6 z-50 flex flex-col overflow-hidden rounded-[1.5rem] shadow-2xl"
          style={{
            width: 368,
            height: 520,
            border: "1.5px solid rgba(82,98,79,0.18)",
            background: "#f9f5ec",
          }}
          role="dialog"
          aria-label="Verse AI chat assistant"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ background: "linear-gradient(135deg, #2d3d2a 0%, #3e5438 60%, #52624f 100%)" }}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(247,241,227,0.15)" }}>
              <BotAvatar />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#f7f1e3]">Verse AI</p>
              <p className="text-[10px] text-[#c89b3c]">AstroVerse Assistant · Always here ✨</p>
            </div>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-[#f7f1e3]/60 transition hover:bg-white/10 hover:text-[#f7f1e3]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
            style={{ background: "#f9f5ec" }}>
            {messages.map((msg) => (
              <div key={msg.id}
                className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>

                {/* Bubble */}
                <div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "rounded-br-sm text-white"
                    : "rounded-bl-sm text-[#2d3d2a] shadow-sm"
                }`}
                style={msg.role === "user"
                  ? { background: "linear-gradient(135deg, #3e5438, #52624f)" }
                  : { background: "white", border: "1px solid rgba(82,98,79,0.10)" }
                }>
                  {renderText(msg.text)}
                </div>

                {/* Social link buttons */}
                {msg.socialLinks && msg.socialLinks.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1 w-full max-w-[84%]">
                    {msg.socialLinks.map((link) => (
                      <a key={link.icon} href={link.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                        style={{
                          background: link.icon === "instagram"
                            ? "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)"
                            : link.icon === "youtube"
                            ? "#ff0000"
                            : "#1877f2",
                        }}>
                        {link.icon === "instagram" && <InstagramIcon />}
                        {link.icon === "youtube" && <YouTubeIcon />}
                        {link.icon === "facebook" && <FacebookIcon />}
                        Follow on {link.label}
                      </a>
                    ))}
                  </div>
                )}

                {/* Chips */}
                {msg.role === "bot" && msg.chips && msg.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {msg.chips.map((chip) => {
                      if (chip.startsWith("Go to #")) {
                        const anchor = chip.replace("Go to ", "");
                        return (
                          <a key={chip} href={anchor} onClick={() => setOpen(false)}
                            className="rounded-full px-3 py-1 text-xs font-medium transition"
                            style={{ border: "1px solid rgba(82,98,79,0.30)", background: "white", color: "#3e5438" }}>
                            {chip.replace("Go to ", "")}
                          </a>
                        );
                      }
                      return (
                        <button key={chip} type="button" onClick={() => handleChip(chip)}
                          className="rounded-full px-3 py-1 text-xs font-medium transition hover:opacity-80"
                          style={{ border: "1px solid rgba(82,98,79,0.30)", background: "white", color: "#3e5438" }}>
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="border-t px-3 py-3"
            style={{ borderColor: "rgba(82,98,79,0.12)", background: "white" }}>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about AstroVerse…"
                className="flex-1 rounded-full border px-4 py-2 text-sm outline-none"
                style={{
                  borderColor: "rgba(82,98,79,0.20)",
                  background: "#f9f5ec",
                  color: "#2d3d2a",
                }}
              />
              <button type="submit" aria-label="Send" disabled={!input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-35"
                style={{ background: "linear-gradient(135deg, #3e5438, #52624f)" }}>
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-1.5 text-center text-[10px]" style={{ color: "#8a9e85" }}>
              Powered by Verse AI · AstroVerse
            </p>
          </div>
        </div>
      )}
    </>
  );
}
