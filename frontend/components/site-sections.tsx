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
import { AnnouncementBanner } from "./announcement-banner";
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

  // Find class service id for the banner
  const classService = config.services.find((s) => s.type === "class");

  return (
    <>
      <Navbar brandName={config.brandName} />
      {/* Offer banner — above hero, below navbar */}
      {classService && <AnnouncementBanner classServiceId={classService.id} />}
      <main>
        <HeroSection />
        <DemoClassSection />
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
              <a href="#contact"
                className="rounded-full bg-sage px-7 py-3 text-sm font-semibold text-ivory shadow-glow transition hover:bg-sage/85">
                Book a Consultation
              </a>
              <a href="#contact"
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
     DEMO CLASS SECTION
  ═══════════════════════════════════════════════════════════ */
  function DemoClassSection() {
    const DEMO_VIDEO_ID = "FYGt7zqoISQ";
    // Find class-type services for the join/pay options
    const classServices = config.services.filter((s) => s.type === "class");

    return (
      <section id="demo-class" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">Free Demo Class</p>
          <h2 className="mt-2 font-display text-3xl text-sage">Watch before you decide</h2>
          <p className="mt-3 max-w-xl mx-auto text-sm leading-6 text-sage/65">
            Get a feel for how our astrology classes work. Watch the free demo below — if it resonates with you, enroll in the full class with a single payment.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">

          {/* ── Left: YouTube embed ── */}
          <div className="rounded-[2rem] overflow-hidden border border-sage/10 shadow-glow bg-black">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}?rel=0&modestbranding=1`}
                title="AstroGenZ Demo Class"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {/* Video caption */}
            <div className="bg-sage/5 px-5 py-4 border-t border-sage/10">
              <p className="text-sm font-semibold text-sage">🎓 Free Demo — Vedic Astrology Foundation</p>
              <p className="mt-1 text-xs text-sage/60">
                Live session by {mainAstrologer.name} · Watch anytime
              </p>
              <a
                href={`https://www.youtube.com/live/${DEMO_VIDEO_ID}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-sage/20 bg-white px-4 py-2 text-xs font-semibold text-sage transition hover:bg-ivory"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#ff0000]">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Open on YouTube
              </a>
            </div>
          </div>

          {/* ── Right: class options ── */}
          <div className="flex flex-col gap-5">
            <div className="rounded-[2rem] border border-gold/25 bg-gold/6 p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium">Ready to enroll?</p>
              <h3 className="mt-2 font-display text-2xl text-sage">Join the full class</h3>
              <p className="mt-2 text-sm leading-6 text-sage/70">
                Liked what you saw? Enroll in the complete Vedic astrology course. After payment, you'll be added to the class group on WhatsApp by the astrologer directly.
              </p>

              {/* Class service options */}
              {classServices.length > 0 ? (
                <div className="mt-5 flex flex-col gap-3">
                  {classServices.map((svc) => {
                    const discounted = (svc.discountPercent ?? 0) > 0
                      ? Math.round(svc.price * (1 - (svc.discountPercent ?? 0) / 100))
                      : svc.price;
                    return (
                      <div key={svc.id} className="rounded-[1.5rem] border border-sage/15 bg-white/80 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sage text-sm">{svc.name}</p>
                            <p className="text-xs text-sage/60 mt-0.5">{svc.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {discounted < svc.price && (
                              <p className="text-xs text-sage/40 line-through">Rs. {svc.price}</p>
                            )}
                            <p className="font-display text-lg font-semibold text-sage">Rs. {discounted}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("astro-select-service", {
                              detail: { serviceId: svc.id }
                            }));
                            document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-ivory shadow-glow transition hover:bg-sage/85"
                        >
                          Enroll — Pay Rs. {discounted}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-sage/60">Class enrollment coming soon. Contact us on WhatsApp for details.</p>
              )}
            </div>

            {/* WhatsApp direct option */}
            <div className="rounded-[2rem] border border-sage/10 bg-white/75 p-6">
              <p className="text-sm font-semibold text-sage">Have questions before enrolling?</p>
              <p className="mt-1.5 text-xs text-sage/65 leading-5">
                Chat with {mainAstrologer.name} directly on WhatsApp to ask about the class schedule, duration, or content.
              </p>
              <a
                href={`https://wa.me/${mainAstrologer.whatsapp}?text=${encodeURIComponent("Hi! I watched the demo class on AstroGenZ and I'm interested in enrolling. Can you share more details?")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe5d]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Ask on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     SERVICES & CONSULTATION
  ═══════════════════════════════════════════════════════════ */
  function ContactSection() {
    // No default — null means nothing selected yet
    const [activeServiceId, setActiveServiceId] = useState<string | null>(null);

    // Listen for events from banner "Join Now", demo "Enroll Now"
    useEffect(() => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent<{ serviceId: string }>).detail;
        if (!detail?.serviceId) return;
        let targetId = detail.serviceId;
        if (targetId === "__class__") {
          const classSvc = config.services.find((s) => s.type === "class");
          if (classSvc) targetId = classSvc.id;
          else return;
        }
        const exists = config.services.find((s) => s.id === targetId);
        if (!exists) return;
        setActiveServiceId(targetId);
        // Scroll to booking form on both desktop and mobile
        setTimeout(() => {
          document.getElementById("booking-form-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      };
      window.addEventListener("astro-select-service", handler);
      return () => window.removeEventListener("astro-select-service", handler);
    }, []);

    const handleChoose = (serviceId: string) => {
      setActiveServiceId(serviceId);
      setTimeout(() => {
        document.getElementById("booking-form-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    };

    return (
      <section id="contact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">Services &amp; Consultation</p>
          <h2 className="mt-2 font-display text-3xl text-sage">Choose your service &amp; book</h2>
          <p className="mt-2 text-sm text-sage/65">
            Select a service below, fill your details, and pay securely via Razorpay.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">

          {/* ── Left: service cards with "Choose this" button ── */}
          <div className="flex flex-col gap-3">
            {config.services.map((service) => {
              const discounted = (service.discountPercent ?? 0) > 0
                ? Math.round(service.price * (1 - (service.discountPercent ?? 0) / 100))
                : service.price;
              const isSelected = activeServiceId === service.id;

              return (
                <div
                  key={service.id}
                  className={`rounded-[2rem] border p-5 transition-all shadow-glow ${
                    isSelected
                      ? "border-sage/50 bg-sage/5 ring-2 ring-sage/20"
                      : "border-sage/10 bg-white/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-gold font-medium">{service.type}</p>
                      <h3 className="mt-1 font-display text-lg text-sage">{service.name}</h3>
                      <p className="mt-1 text-xs leading-5 text-sage/60">{service.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {discounted < service.price && (
                        <p className="text-xs text-sage/40 line-through">Rs. {service.price}</p>
                      )}
                      <p className="font-display text-lg font-semibold text-sage">Rs. {discounted}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChoose(service.id)}
                    className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                      isSelected
                        ? "bg-sage text-ivory shadow-glow cursor-default"
                        : "border border-sage/30 bg-white text-sage hover:bg-sage hover:text-ivory"
                    }`}
                  >
                    {isSelected ? "✓ Selected" : "Choose this"}
                  </button>
                </div>
              );
            })}

            <div className="rounded-[1.5rem] border border-sage/10 bg-white/70 p-5 text-sm text-sage/70">
              <p className="font-semibold text-sage mb-2">Need help choosing?</p>
              <p>📱 {mainAstrologer.phone}</p>
              <p className="mt-1">💬 +{mainAstrologer.whatsapp}</p>
              <p className="mt-1">📍 {mainAstrologer.address}</p>
            </div>
          </div>

          {/* ── Right: booking form or placeholder ── */}
          <div id="booking-form-anchor">
            {activeServiceId ? (
              <BookingForm config={config} initialServiceId={activeServiceId} />
            ) : (
              <div className="rounded-[2rem] border border-dashed border-sage/20 bg-white/50 p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                  <span className="text-2xl">🔮</span>
                </div>
                <h3 className="font-display text-xl text-sage">Select a service to begin</h3>
                <p className="mt-2 text-sm text-sage/55">
                  Click &quot;Choose this&quot; on any service to open the booking form.
                </p>
              </div>
            )}
          </div>
        </div>

        {loading ? <p className="mt-6 text-sm text-sage/60">Loading…</p> : null}
        {error ? <p className="mt-3 text-sm text-ember">Supabase issue: {error}</p> : null}
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
