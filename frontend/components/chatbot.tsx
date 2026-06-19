"use client";

import type { SiteConfig } from "@/lib/site-config";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ─── Types ──────────────────────────────────────────────── */
type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  chips?: string[];
};

/* ─── Helpers ────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function matchKeywords(input: string, keywords: string[]): boolean {
  const lower = input.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/* ─── Rule engine ────────────────────────────────────────── */
function getBotReply(
  input: string,
  config: SiteConfig
): { text: string; chips?: string[] } {
  const astrologer = config.astrologers[0];
  const services = config.services;

  // --- help / menu ---
  if (matchKeywords(input, ["help", "options", "menu", "what can you do"])) {
    return {
      text: "🌟 Here are the topics I can help you with:",
      chips: [
        "About astrologer",
        "View services",
        "Book now",
        "FAQs",
        "Follow on social",
        "Contact / WhatsApp",
        "Coupon & discounts",
      ],
    };
  }

  // --- greetings ---
  if (matchKeywords(input, ["hi", "hello", "namaste", "hey", "hola", "namaskar"])) {
    return {
      text: `Namaste! 🙏 Welcome to ${config.brandName}. I can help you with information about our services, the astrologer, booking, and more. What would you like to know?`,
      chips: ["About astrologer", "View services", "Book now", "FAQs"],
    };
  }

  // --- astrologer info ---
  if (
    matchKeywords(input, [
      "astrologer",
      "who is",
      "about",
      "profile",
      "name",
      "tell me about",
    ])
  ) {
    const a = astrologer;
    return {
      text: `✨ Meet ${a.name} — ${a.title}.\n\n${a.bio}\n\n🕰 ${a.experience}`,
      chips: ["View services", "Book now", "Follow on social"],
    };
  }

  // --- experience / expertise ---
  if (
    matchKeywords(input, [
      "experience",
      "years",
      "how long",
      "expertise",
      "background",
    ])
  ) {
    return {
      text: `🌠 ${astrologer.name} brings ${astrologer.experience} to every reading and class — blending deep Vedic knowledge with warm personal guidance.`,
      chips: ["View services", "Book now"],
    };
  }

  // --- career service ---
  if (matchKeywords(input, ["career"])) {
    const svc = services.find(
      (s) => s.name.toLowerCase().includes("career") || s.description.toLowerCase().includes("career")
    );
    if (svc) {
      const discounted =
        (svc.discountPercent ?? 0) > 0
          ? Math.round(svc.price * (1 - svc.discountPercent / 100))
          : null;
      return {
        text: `💼 ${svc.name}\n\n${svc.description}\n\n💰 Price: Rs. ${discounted ?? svc.price}${discounted ? ` (${svc.discountPercent}% off from Rs. ${svc.price})` : ""}`,
        chips: ["Book now", "View all services"],
      };
    }
  }

  // --- marriage service ---
  if (matchKeywords(input, ["marriage", "wedding", "relationship", "compatibility", "partner"])) {
    const svc = services.find(
      (s) =>
        s.name.toLowerCase().includes("marriage") ||
        s.description.toLowerCase().includes("marriage") ||
        s.description.toLowerCase().includes("relationship")
    );
    if (svc) {
      const discounted =
        (svc.discountPercent ?? 0) > 0
          ? Math.round(svc.price * (1 - svc.discountPercent / 100))
          : null;
      return {
        text: `💑 ${svc.name}\n\n${svc.description}\n\n💰 Price: Rs. ${discounted ?? svc.price}${discounted ? ` (${svc.discountPercent}% off from Rs. ${svc.price})` : ""}`,
        chips: ["Book now", "View all services"],
      };
    }
  }

  // --- class / learn ---
  if (matchKeywords(input, ["class", "learn", "astrology class", "course", "batch", "enroll", "study"])) {
    const classSvcs = services.filter((s) => s.type === "class");
    if (classSvcs.length > 0) {
      const lines = classSvcs.map((s) => {
        const discounted =
          (s.discountPercent ?? 0) > 0
            ? Math.round(s.price * (1 - s.discountPercent / 100))
            : null;
        return `📚 ${s.name}\n${s.description}\nPrice: Rs. ${discounted ?? s.price}${discounted ? ` (${s.discountPercent}% off)` : ""}`;
      });
      return {
        text: `🎓 Here are our available classes:\n\n${lines.join("\n\n")}`,
        chips: ["Book now", "View services"],
      };
    }
  }

  // --- services / prices / fees ---
  if (
    matchKeywords(input, [
      "service",
      "services",
      "offerings",
      "price",
      "cost",
      "fees",
      "what do you offer",
      "what services",
      "consultation",
      "view all",
      "all services",
    ])
  ) {
    const lines = services.map((s) => {
      const discounted =
        (s.discountPercent ?? 0) > 0
          ? Math.round(s.price * (1 - s.discountPercent / 100))
          : null;
      const label = s.type === "class" ? "🎓" : "🔮";
      return `${label} ${s.name} — Rs. ${discounted ?? s.price}${discounted ? ` *(${s.discountPercent}% off)*` : ""}\n   ${s.description}`;
    });
    return {
      text: `Here are all our current offerings:\n\n${lines.join("\n\n")}`,
      chips: ["Book now", "About astrologer", "FAQs"],
    };
  }

  // --- book / booking ---
  if (matchKeywords(input, ["book", "booking", "how to book", "appointment", "schedule", "reserve"])) {
    return {
      text: `📅 Booking is simple and personal:\n\n1. Scroll to the ✦ Services section\n2. Choose your service and click "Book now"\n3. Fill in your details and pay via UPI/Razorpay\n4. Send the payment screenshot to WhatsApp\n5. The astrologer will confirm your slot personally 🙏\n\nYou can also go directly to the booking section:`,
      chips: ["Go to #booking", "View services", "Payment info"],
    };
  }

  // --- payment / razorpay ---
  if (matchKeywords(input, ["payment", "pay", "razorpay", "upi", "qr", "how to pay", "online payment"])) {
    return {
      text: `💳 We use Razorpay for secure online payments.\n\nSteps:\n1. Select your service\n2. Complete payment via UPI, card, or net banking\n3. After payment, you'll receive a confirmation\n4. Send your payment receipt on WhatsApp to finalise your booking\n\nThe astrologer's UPI ID is: ${astrologer.upiId}`,
      chips: ["Book now", "Contact / WhatsApp"],
    };
  }

  // --- faq ---
  if (matchKeywords(input, ["faq", "frequently asked", "common questions", "questions"])) {
    if (config.faqs.length === 0) {
      return { text: "📖 No FAQs are available right now. Feel free to ask me anything directly!", chips: ["View services", "Book now"] };
    }
    const lines = config.faqs.map((f) => `❓ ${f.question}\n   → ${f.answer}`);
    return {
      text: `Here are the frequently asked questions:\n\n${lines.join("\n\n")}`,
      chips: ["Book now", "Contact / WhatsApp"],
    };
  }

  // --- social / follow ---
  if (
    matchKeywords(input, [
      "instagram",
      "youtube",
      "facebook",
      "social",
      "follow",
      "connect",
      "social media",
    ])
  ) {
    const links: string[] = [];
    if (astrologer.instagram) links.push(`📸 Instagram: ${astrologer.instagram}`);
    if (astrologer.youtube) links.push(`▶️ YouTube: ${astrologer.youtube}`);
    if (astrologer.facebook) links.push(`👤 Facebook: ${astrologer.facebook}`);

    if (links.length === 0) {
      return { text: "Social links haven't been added yet. Check back soon! 🌟" };
    }
    return {
      text: `🌐 Follow ${astrologer.name} on social media:\n\n${links.join("\n")}`,
      chips: ["Book now", "About astrologer"],
    };
  }

  // --- feedback / review / testimonial ---
  if (
    matchKeywords(input, [
      "feedback",
      "review",
      "experience",
      "testimonial",
      "rating",
      "leave feedback",
    ])
  ) {
    return {
      text: `💬 We'd love to hear about your experience! You can leave your feedback in the Feedback section of our site.\n\nYour words help others on their spiritual journey. 🙏`,
      chips: ["Go to #feedback", "Book now"],
    };
  }

  // --- contact / phone / whatsapp ---
  if (
    matchKeywords(input, [
      "contact",
      "phone",
      "whatsapp",
      "reach",
      "call",
      "number",
      "get in touch",
    ])
  ) {
    return {
      text: `📞 You can reach ${astrologer.name} directly:\n\n📱 Phone: ${astrologer.phone}\n💬 WhatsApp: +${astrologer.whatsapp}\n\nAfter payment, just send your screenshot on WhatsApp and your booking will be confirmed! 🌟`,
      chips: ["Book now", "Payment info"],
    };
  }

  // --- coupon / discount / offer ---
  if (matchKeywords(input, ["coupon", "discount", "offer", "promo", "code", "deal", "off"])) {
    const activeCoupons = config.coupons?.filter((c) => c.active) ?? [];
    if (activeCoupons.length > 0) {
      const lines = activeCoupons.map(
        (c) => `🏷 Code: ${c.code} — ${c.discountPercent}% off\n   ${c.description}`
      );
      return {
        text: `🎉 Here are the active coupon codes:\n\n${lines.join("\n\n")}\n\nEnter the code at checkout in the booking form.`,
        chips: ["Book now", "View services"],
      };
    }
    return {
      text: "🎁 We occasionally offer special discounts and coupon codes. Keep an eye on our social media for the latest offers!\n\nIf you have a code, enter it in the booking form at checkout.",
      chips: ["Follow on social", "Book now"],
    };
  }

  // --- default fallback ---
  return {
    text: "I didn't quite understand that 🤔 You can ask me about our services, the astrologer, booking process, or type 'help' to see all topics.",
    chips: ["Help / Topics", "View services", "Book now"],
  };
}

/* ─── Welcome message ────────────────────────────────────── */
function makeWelcome(config: SiteConfig): Message {
  return {
    id: uid(),
    role: "bot",
    text: `Namaste! 🙏 I'm your ${config.brandName} assistant. I can help you explore our services, learn about the astrologer, understand how to book, and much more.\n\nWhat would you like to know?`,
    chips: ["About astrologer", "View services", "Book now", "FAQs", "Follow on social"],
  };
}

/* ─── Component ──────────────────────────────────────────── */
export function Chatbot({ config }: { config: SiteConfig }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [makeWelcome(config)]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to latest message whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
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

  function handleChip(chip: string) {
    // Map display chips to intent strings
    const chipMap: Record<string, string> = {
      "About astrologer": "about astrologer",
      "View services": "view services",
      "View all services": "view all services",
      "Book now": "book now",
      FAQs: "faq",
      "Follow on social": "follow on social",
      "Contact / WhatsApp": "contact whatsapp",
      "Coupon & discounts": "coupon discount",
      "Help / Topics": "help",
      "Payment info": "payment razorpay",
      "Go to #booking": "book now",
      "Go to #feedback": "feedback",
    };
    sendMessage(chipMap[chip] ?? chip);
  }

  return (
    <>
      {/* ── Floating bubble ── */}
      <button
        type="button"
        aria-label="Open chat assistant"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#52624f] shadow-lg transition hover:bg-[#52624f]/85 focus:outline-none focus:ring-2 focus:ring-[#52624f] focus:ring-offset-2"
      >
        {open ? (
          <X className="h-6 w-6 text-[#f7f1e3]" />
        ) : (
          <MessageCircle className="h-6 w-6 text-[#f7f1e3]" />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-[1.5rem] border border-[#52624f]/15 bg-[#f7f1e3] shadow-2xl"
          style={{ width: 380, height: 500 }}
          role="dialog"
          aria-label="AstroVerse chat assistant"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[#52624f]/15 bg-[#52624f] px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7f1e3]/20">
              <Bot className="h-4 w-4 text-[#f7f1e3]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-none text-[#f7f1e3]">AstroVerse Assistant</p>
              <p className="mt-0.5 text-[10px] text-[#f7f1e3]/65">Ask me anything ✨</p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-[#f7f1e3]/70 transition hover:bg-[#f7f1e3]/15 hover:text-[#f7f1e3]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "rounded-br-sm bg-[#52624f] text-[#f7f1e3]"
                      : "rounded-bl-sm bg-white text-[#52624f] shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Quick reply chips */}
                {msg.role === "bot" && msg.chips && msg.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {msg.chips.map((chip) => {
                      const isLink = chip.startsWith("Go to #");
                      const anchor = chip.replace("Go to #", "#");
                      if (isLink) {
                        return (
                          <a
                            key={chip}
                            href={anchor}
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-[#52624f]/25 bg-white px-3 py-1 text-xs font-medium text-[#52624f] transition hover:bg-[#52624f]/10"
                          >
                            {chip.replace("Go to ", "")}
                          </a>
                        );
                      }
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleChip(chip)}
                          className="rounded-full border border-[#52624f]/25 bg-white px-3 py-1 text-xs font-medium text-[#52624f] transition hover:bg-[#52624f]/10"
                        >
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

          {/* Input */}
          <div className="border-t border-[#52624f]/15 bg-white px-3 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about services, booking…"
                className="flex-1 rounded-full border border-[#52624f]/20 bg-[#f7f1e3] px-4 py-2 text-sm text-[#52624f] placeholder-[#52624f]/40 outline-none focus:border-[#52624f]/50 focus:ring-1 focus:ring-[#52624f]/30"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#52624f] text-[#f7f1e3] transition hover:bg-[#52624f]/85 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
