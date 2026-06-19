"use client";

import { selectRows } from "@/lib/supabase";
import { useSiteConfig } from "@/lib/use-site-config";
import {
  CheckCircle2,
  Facebook,
  Flower2,
  Instagram,
  Phone,
  Sparkles,
  Star,
  Youtube
} from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { BookingForm } from "./booking-form";
import { Chatbot } from "./chatbot";
import { FeedbackForm } from "./feedback-form";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { SectionHeading } from "./section-heading";

type FeedbackRow = {
  id?: number;
  full_name?: string;
  consultation_type?: string;
  feedback_text?: string;
  rating?: number;
};

type FeedbackCardItem = {
  id: string;
  name: string;
  service: string;
  quote: string;
  rating: number;
};

export function SiteSections() {
  const { config, ready, loading, error } = useSiteConfig();
  const [feedbackItems, setFeedbackItems] = useState<FeedbackCardItem[]>([]);
  const [showAllFeedback, setShowAllFeedback] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const mainAstrologer = config.astrologers[0];

  useEffect(() => {
    let active = true;
    const loadFeedback = async () => {
      try {
        const rows = await selectRows<FeedbackRow>("feedback");
        if (!active) return;
        setFeedbackItems(
          rows
            .filter((row) => row.feedback_text)
            .map((row, index) => ({
              id: String(row.id ?? index),
              name: row.full_name || "Anonymous",
              service: row.consultation_type || "Consultation",
              quote: row.feedback_text || "",
              rating: Math.min(5, Math.max(1, Number(row.rating || 5)))
            }))
            .reverse()
            .slice(0, 6)
        );
      } catch {
        if (!active) return;
        setFeedbackItems([]);
      }
    };
    void loadFeedback();
    return () => { active = false; };
  }, []);

  if (!ready) return <div className="min-h-screen bg-ivory" />;

  const toggleFeedbackView = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setShowAllFeedback((current) => !current);
  };

  return (
    <>
      <Navbar brandName={config.brandName} />
      <main>
        <HeroSection />
        <ContactSection />
        <FeedbackSection />
        <FaqSection />
      </main>
      <Footer
        brandName={config.brandName}
        instagram={mainAstrologer.instagram}
        youtube={mainAstrologer.youtube}
        facebook={mainAstrologer.facebook}
      />
      <Chatbot config={config} />
    </>
  );

  /* ═══════════════════════════════════════════════════════════
     HERO — Astrologer profile (large left) + intro text right
  ═══════════════════════════════════════════════════════════ */
  function HeroSection() {
    return (
      <section id="about" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.55fr_1fr] lg:items-start lg:px-8 lg:py-24">

          {/* ── Left: tall astrologer card ── */}
          <div className="rounded-[2rem] border border-sage/10 bg-white/80 shadow-glow overflow-hidden">
            {/* Portrait photo — full height */}
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: "2/3", maxHeight: "560px" }}
            >
              {mainAstrologer.photoUrl ? (
                <img
                  src={mainAstrologer.photoUrl}
                  alt={mainAstrologer.name}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-gold/15 via-ivory to-sage/10 flex items-center justify-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/80 font-display text-5xl text-sage shadow-glow">
                    {mainAstrologer.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                  </div>
                </div>
              )}
              {/* Gradient so name overlays cleanly */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
                <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">Astrologer Profile</p>
                <h2 className="mt-1.5 font-display text-2xl leading-snug text-white drop-shadow-md">
                  {mainAstrologer.name}
                </h2>
                <p className="mt-1 text-sm text-white/80">{mainAstrologer.title}</p>
              </div>
            </div>

            {/* Social buttons */}
            <div className="flex flex-wrap gap-2.5 p-5">
              {mainAstrologer.instagram ? (
                <a href={mainAstrologer.instagram} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-sage/20 bg-sage px-4 py-2 text-xs font-semibold text-ivory transition hover:bg-sage/80">
                  <Instagram className="h-3.5 w-3.5" /> Instagram
                </a>
              ) : null}
              {mainAstrologer.youtube ? (
                <a href={mainAstrologer.youtube} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-ember/20 bg-ember px-4 py-2 text-xs font-semibold text-ivory transition hover:bg-ember/80">
                  <Youtube className="h-3.5 w-3.5" /> YouTube
                </a>
              ) : null}
              {mainAstrologer.facebook ? (
                <a href={mainAstrologer.facebook} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-sage/20 bg-sage/80 px-4 py-2 text-xs font-semibold text-ivory transition hover:bg-sage/60">
                  <Facebook className="h-3.5 w-3.5" /> Facebook
                </a>
              ) : null}
            </div>
          </div>

          {/* ── Right: tagline + bio + stats + feature pills ── */}
          <div className="flex flex-col justify-center gap-6">
            {/* Tagline badge */}
            <div className="inline-flex w-fit rounded-full border border-gold/30 bg-white/70 px-4 py-2 text-sm font-medium text-sage shadow-glow backdrop-blur">
              {config.heroTagline}
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl font-semibold leading-tight text-sage sm:text-6xl">
              Gentle guidance for astrology, healing &amp; spiritual clarity.
            </h1>

            {/* Bio */}
            <p className="max-w-lg text-base leading-7 text-sage/75">
              {mainAstrologer.bio ||
                "Offering deep, personalised consultations in Vedic astrology, numerology, and spiritual mentorship."}
            </p>
            <p className="text-sm text-sage/55">{mainAstrologer.experience}</p>

            {/* Stat pills */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ["4+", "Years\nguidance"],
                [`${config.services.length}+`, "Services\navailable"],
                ["100%", "Personally\nguided"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-[1.5rem] border border-sage/10 bg-white/70 p-4 text-center shadow-glow backdrop-blur">
                  <p className="font-display text-2xl font-semibold text-sage">{value}</p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-4 text-sage/55">{label}</p>
                </div>
              ))}
            </div>

            {/* Specialty chips */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { icon: <Sparkles className="h-4 w-4" />, text: "Vedic astrology & birth chart readings" },
                { icon: <Flower2 className="h-4 w-4" />,  text: "Numerology & spiritual healing" },
                { icon: <CheckCircle2 className="h-4 w-4" />, text: "Classes — beginner to advanced" },
                { icon: <Phone className="h-4 w-4" />,    text: "Direct WhatsApp follow-up after payment" }
              ].map(({ icon, text }) => (
                <div key={text}
                  className="flex items-start gap-2.5 rounded-[1.25rem] border border-sage/10 bg-white/65 px-4 py-3 backdrop-blur">
                  <span className="mt-0.5 shrink-0 text-gold">{icon}</span>
                  <p className="text-sm text-sage/80">{text}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-1">
              <a href="#booking"
                className="rounded-full bg-sage px-7 py-3 text-sm font-semibold text-ivory shadow-glow transition hover:bg-sage/85">
                Book a Consultation
              </a>
              <a href="#services-list"
                className="rounded-full border border-sage/20 bg-white/70 px-7 py-3 text-sm font-semibold text-sage backdrop-blur transition hover:bg-white/90">
                View Services
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     SERVICES — compact list, Book now scrolls to booking form
  ═══════════════════════════════════════════════════════════ */
  function ServicesSection() {
    return (
      <section id="services-list" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">Available Services</p>
          <h2 className="mt-2 font-display text-3xl text-sage">Choose a service to get started</h2>
          <p className="mt-2 text-sm text-sage/65">Select a service, complete the UPI payment, and your details go straight to the astrologer on WhatsApp.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {config.services.map((service) => {
            const discounted =
              (service.discountPercent ?? 0) > 0
                ? Math.round(service.price * (1 - (service.discountPercent ?? 0) / 100))
                : service.price;
            return (
              <div key={service.id}
                className="flex flex-col justify-between rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow backdrop-blur">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium">{service.type}</p>
                  <h3 className="mt-3 font-display text-xl text-sage">{service.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-sage/70">{service.description}</p>
                </div>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    {discounted < service.price ? (
                      <>
                        <p className="text-xs text-sage/40 line-through">Rs. {service.price}</p>
                        <p className="font-display text-2xl font-semibold text-sage">Rs. {discounted}</p>
                      </>
                    ) : (
                      <p className="font-display text-2xl font-semibold text-sage">Rs. {service.price}</p>
                    )}
                  </div>
                  <a
                    href="#booking"
                    onClick={() => {
                      setSelectedServiceId(service.id);
                      setTimeout(() => {
                        document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-ivory shadow-glow transition hover:bg-sage/85"
                  >
                    Book now
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     CONTACT + BOOKING — services left, form right
     User picks a service on the left → form on right updates
  ═══════════════════════════════════════════════════════════ */
  function ContactSection() {
    return (
      <section id="contact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">Book a Consultation</p>
          <h2 className="mt-2 font-display text-3xl text-sage">Choose your service &amp; proceed</h2>
          <p className="mt-2 text-sm text-sage/65">
            Select a service on the left — the booking form updates instantly. Fill your details and pay securely via Razorpay.
          </p>
        </div>

        <div id="booking" className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">

          {/* ── Left: service picker ── */}
          <div className="flex flex-col gap-4">
            {config.services.map((service) => {
              const discounted =
                (service.discountPercent ?? 0) > 0
                  ? Math.round(service.price * (1 - (service.discountPercent ?? 0) / 100))
                  : service.price;
              const isSelected = (selectedServiceId ?? config.services[0]?.id) === service.id;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`w-full rounded-[2rem] border p-5 text-left transition-all shadow-glow ${
                    isSelected
                      ? "border-sage bg-sage/8 ring-2 ring-sage/20"
                      : "border-sage/10 bg-white/80 hover:border-sage/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium">{service.type}</p>
                      <h3 className="mt-1.5 font-display text-lg text-sage">{service.name}</h3>
                      <p className="mt-1 text-xs leading-5 text-sage/65">{service.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {discounted < service.price ? (
                        <>
                          <p className="text-xs text-sage/40 line-through">Rs. {service.price}</p>
                          <p className="font-display text-xl font-semibold text-sage">Rs. {discounted}</p>
                        </>
                      ) : (
                        <p className="font-display text-xl font-semibold text-sage">Rs. {service.price}</p>
                      )}
                    </div>
                  </div>
                  {/* Selected indicator */}
                  <div className={`mt-3 flex items-center gap-2 text-xs font-semibold transition-all ${
                    isSelected ? "text-sage" : "text-sage/40"
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-sage" : "bg-sage/25"}`} />
                    {isSelected ? "Selected — fill details on the right" : "Click to select"}
                  </div>
                </button>
              );
            })}

            {/* Contact info below services */}
            <div className="rounded-[1.5rem] border border-sage/10 bg-white/70 p-5 text-sm text-sage/75">
              <p className="font-semibold text-sage mb-2">Need help choosing?</p>
              <p>📱 Phone: {mainAstrologer.phone}</p>
              <p className="mt-1">💬 WhatsApp: +{mainAstrologer.whatsapp}</p>
              <p className="mt-1">📍 {mainAstrologer.address}</p>
            </div>
          </div>

          {/* ── Right: booking form — no key prop, no remount ── */}
          <div>
            <BookingForm
              config={config}
              initialServiceId={selectedServiceId ?? config.services[0]?.id}
            />
          </div>
        </div>

        {loading ? <p className="mt-6 text-sm text-sage/60">Loading live content from Supabase...</p> : null}
        {error   ? <p className="mt-3 text-sm text-ember">Supabase load issue: {error}</p> : null}
      </section>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     FEEDBACK
  ═══════════════════════════════════════════════════════════ */
  function FeedbackSection() {
    const visibleFeedback = showAllFeedback ? feedbackItems : feedbackItems.slice(0, 3);

    return (
      <section id="feedback" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionHeading
              eyebrow="Feedback"
              title="Latest client feedback"
              description="The newest three reviews are highlighted here. Visitors can open the full list to read all feedback shared by other clients."
            />
            {feedbackItems.length === 0 ? (
              <div className="mt-8 rounded-[1.75rem] border border-sage/10 bg-white/80 p-5 text-sm text-sage/75 shadow-glow">
                No feedback has been shared yet.
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-4">
                  {visibleFeedback.map((item) => (
                    <div key={item.id} className="rounded-[1.75rem] border border-sage/10 bg-white/80 p-5 shadow-glow">
                      <p className="text-sm uppercase tracking-[0.2em] text-gold">{item.service}</p>
                      <div className="mt-3 flex items-center gap-1 text-gold">
                        {Array.from({ length: item.rating }).map((_, index) => (
                          <Star key={`${item.id}-star-${index}`} className="h-4 w-4 fill-gold text-gold" />
                        ))}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-sage/85">"{item.quote}"</p>
                      <p className="mt-4 font-display text-lg text-sage">{item.name}</p>
                    </div>
                  ))}
                </div>
                {feedbackItems.length > 3 ? (
                  <button
                    type="button"
                    onClick={toggleFeedbackView}
                    className="mt-5 inline-flex rounded-full border border-sage/15 bg-white px-5 py-3 text-sm font-semibold text-sage"
                  >
                    {showAllFeedback ? "Show latest" : "View all feedback"}
                  </button>
                ) : null}
              </>
            )}
          </div>
          <FeedbackForm
            services={config.services}
            onSubmitted={(item) => setFeedbackItems((current) => [item, ...current])}
          />
        </div>
      </section>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     FAQ
  ═══════════════════════════════════════════════════════════ */
  function FaqSection() {
    return (
      <section id="faq" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="How the manual payment and WhatsApp confirmation flow works."
        />
        <div className="mt-10 grid gap-4">
          {config.faqs.map((faq) => (
            <div key={faq.id} className="rounded-[2rem] border border-sage/10 bg-white/75 p-6 shadow-glow">
              <h3 className="font-display text-xl text-sage">{faq.question}</h3>
              <p className="mt-3 text-sm leading-7 text-sage/80">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
}
