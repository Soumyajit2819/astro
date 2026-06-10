"use client";

import type { ReactNode } from "react";
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
        if (!active) {
          return;
        }

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
        if (!active) {
          return;
        }

        setFeedbackItems([]);
      }
    };

    void loadFeedback();

    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-ivory" />;
  }

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
        <AboutSection />
        <ServicesSection />
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
    </>
  );

  function HeroSection() {
    return (
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
          {/* Left — headline + CTAs + stat pills */}
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit rounded-full border border-gold/30 bg-white/70 px-4 py-2 text-sm font-medium text-sage shadow-glow backdrop-blur">
              {config.heroTagline}
            </div>
            <h1 className="max-w-2xl font-display text-5xl font-semibold leading-tight text-sage sm:text-6xl">
              Gentle guidance for astrology, healing &amp; spiritual clarity.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-sage/80">
              Select your service, complete the UPI payment, and share your details — our team will reach you with the next steps.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#booking" className="rounded-full bg-sage px-7 py-3 text-center font-semibold text-ivory shadow-glow transition hover:bg-sage/85">
                Book a Consultation
              </a>
              <a href="#about" className="rounded-full border border-sage/20 bg-white/70 px-7 py-3 text-center font-semibold text-sage backdrop-blur transition hover:bg-white/90">
                Meet the Astrologer
              </a>
            </div>

            {/* Stat pills */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                [mainAstrologer.experience.split(" ")[0], "Years of\nguidance"],
                [`${config.services.length}+`, "Services\noffered"],
                ["100%", "Manually\nguided"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-[1.5rem] border border-sage/10 bg-white/70 p-4 text-center shadow-glow backdrop-blur">
                  <p className="font-display text-3xl font-semibold text-sage">{value}</p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-4 text-sage/60">{label}</p>
                </div>
              ))}
            </div>

            {/* Feature rows */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-[1.25rem] border border-sage/10 bg-white/65 px-4 py-3 backdrop-blur">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <p className="text-sm text-sage/80">Personalised consultations with birth chart analysis</p>
              </div>
              <div className="flex items-start gap-3 rounded-[1.25rem] border border-sage/10 bg-white/65 px-4 py-3 backdrop-blur">
                <Flower2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <p className="text-sm text-sage/80">Classes for beginners to advanced students</p>
              </div>
              <div className="flex items-start gap-3 rounded-[1.25rem] border border-sage/10 bg-white/65 px-4 py-3 backdrop-blur">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <p className="text-sm text-sage/80">Direct WhatsApp follow-up after payment confirmation</p>
              </div>
              <div className="flex items-start gap-3 rounded-[1.25rem] border border-sage/10 bg-white/65 px-4 py-3 backdrop-blur">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <p className="text-sm text-sage/80">UPI payment with screenshot proof — no gateway needed</p>
              </div>
            </div>
          </div>

          {/* Right — services quick-look */}
          <div className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Available Services</p>
            {config.services.map((service) => {
              const discounted = (service.discountPercent ?? 0) > 0
                ? Math.round(service.price * (1 - (service.discountPercent ?? 0) / 100))
                : service.price;
              return (
                <div key={service.id} className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-sage/10 bg-white/70 px-5 py-4 shadow-glow backdrop-blur">
                  <div>
                    <p className="font-semibold text-sage">{service.name}</p>
                    <p className="mt-0.5 text-xs text-sage/60 capitalize">{service.type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {discounted < service.price ? (
                      <>
                        <p className="text-xs text-sage/40 line-through">Rs. {service.price}</p>
                        <p className="font-display text-lg font-semibold text-sage">Rs. {discounted}</p>
                      </>
                    ) : (
                      <p className="font-display text-lg font-semibold text-sage">Rs. {service.price}</p>
                    )}
                    <a
                      href="#booking"
                      onClick={() => setSelectedServiceId(service.id)}
                      className="mt-2 inline-block rounded-full bg-gold/15 px-4 py-1.5 text-xs font-semibold text-sage transition hover:bg-gold/25"
                    >
                      Book now
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function AboutSection() {
    return (
      <section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">

          {/* ── Full portrait card ── */}
          <div className="rounded-[2rem] border border-sage/10 bg-white/75 shadow-glow overflow-hidden">
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4", maxHeight: "480px" }}>
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
              {/* Dark gradient overlay at bottom for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
                <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">Astrologer Profile</p>
                <h3 className="mt-1.5 font-display text-2xl leading-tight text-white drop-shadow-md">{mainAstrologer.name}</h3>
                <p className="mt-1 text-sm text-white/80">{mainAstrologer.title}</p>
              </div>
            </div>

            {/* Social buttons below photo */}
            <div className="flex flex-wrap gap-3 p-5">
              {mainAstrologer.instagram ? (
                <a href={mainAstrologer.instagram} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-sage/25 bg-sage px-4 py-2 text-xs font-semibold text-ivory shadow-sm transition hover:bg-sage/80">
                  <Instagram className="h-3.5 w-3.5" /> Instagram
                </a>
              ) : null}
              {mainAstrologer.youtube ? (
                <a href={mainAstrologer.youtube} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-ember/25 bg-ember px-4 py-2 text-xs font-semibold text-ivory shadow-sm transition hover:bg-ember/80">
                  <Youtube className="h-3.5 w-3.5" /> YouTube
                </a>
              ) : null}
              {mainAstrologer.facebook ? (
                <a href={mainAstrologer.facebook} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-sage/25 bg-sage/85 px-4 py-2 text-xs font-semibold text-ivory shadow-sm transition hover:bg-sage/65">
                  <Facebook className="h-3.5 w-3.5" /> Facebook
                </a>
              ) : null}
            </div>
          </div>

          {/* ── Bio + highlights ── */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">About</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-sage">
                Experienced guidance rooted in Vedic tradition
              </h2>
              <p className="mt-4 text-base leading-7 text-sage/75">
                {mainAstrologer.bio || "Offering deep, personalised consultations in Vedic astrology, numerology, and spiritual mentorship for over a decade."}
              </p>
              <p className="mt-3 text-sm text-sage/60">{mainAstrologer.experience}</p>
            </div>

            {/* Highlights grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: <Sparkles className="h-4 w-4" />, text: "Vedic astrology & birth chart readings" },
                { icon: <Flower2 className="h-4 w-4" />, text: "Numerology & spiritual healing" },
                { icon: <CheckCircle2 className="h-4 w-4" />, text: "Classes for beginners to advanced" },
                { icon: <Phone className="h-4 w-4" />, text: "Direct follow-up on WhatsApp" }
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3 rounded-[1.25rem] border border-sage/10 bg-white/70 px-4 py-3 shadow-glow backdrop-blur">
                  <span className="mt-0.5 text-gold shrink-0">{icon}</span>
                  <p className="text-sm text-sage/80">{text}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 pt-2">
              <a href="#booking"
                className="rounded-full bg-sage px-7 py-3 text-sm font-semibold text-ivory shadow-glow transition hover:bg-sage/85">
                Book a Consultation
              </a>
              <a href="#services"
                className="rounded-full border border-sage/20 bg-white/70 px-7 py-3 text-sm font-semibold text-sage backdrop-blur transition hover:bg-white/90">
                View Services
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function ServicesSection() {
    return (
      <section id="services" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Services"
          title="Consultations and classes with clear pricing"
          description="Each option shows the amount up front so the payment QR can update correctly before the client proceeds."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {config.services.map((service) => {
            const discountedPrice =
              (service.discountPercent ?? 0) > 0
                ? Math.round(service.price * (1 - (service.discountPercent ?? 0) / 100))
                : service.price;
            return (
              <div key={service.id} className="rounded-[2rem] border border-sage/10 bg-white/75 p-6 shadow-glow">
                <p className="text-sm uppercase tracking-[0.25em] text-gold">{service.type}</p>
                <h3 className="mt-4 font-display text-2xl text-sage">{service.name}</h3>
                <p className="mt-4 text-sm leading-7 text-sage/80">{service.description}</p>
                {discountedPrice < service.price ? (
                  <div className="mt-6">
                    <p className="text-sm text-sage/50 line-through">Rs. {service.price}</p>
                    <p className="text-xl font-semibold text-sage">Rs. {discountedPrice}</p>
                  </div>
                ) : (
                  <p className="mt-6 text-xl font-semibold text-sage">Rs. {service.price}</p>
                )}
                <a
                  href="#booking"
                  onClick={() => setSelectedServiceId(service.id)}
                  className="mt-6 inline-block rounded-full bg-gold/15 px-5 py-3 text-sm font-semibold text-sage"
                >
                  Choose this
                </a>
                <p className="mt-3 text-xs text-sage/65">
                  Payment opens inside the booking section with QR, UPI ID, and screenshot confirmation.
                </p>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function FaqSection() {
    return (
      <section id="faq" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="This explains how the manual payment and confirmation flow works without adding a gateway."
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

  function ContactSection() {
    return (
      <section id="contact" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Contact"
              title="Complete payment, then proceed to astrologer confirmation"
              description="The QR reflects the chosen service amount. After the client marks payment complete and proceeds, the astrologer gets a ready confirmation message."
            />
            <div className="rounded-[2rem] border border-sage/10 bg-white/75 p-6 text-sage/80 shadow-glow">
              <p>Phone: {mainAstrologer.phone}</p>
              <p className="mt-3">WhatsApp: +{mainAstrologer.whatsapp}</p>
              <p className="mt-3">UPI ID: {mainAstrologer.upiId}</p>
              <p className="mt-3">Address: {mainAstrologer.address}</p>
            </div>
          </div>
          <div id="booking">
            <BookingForm config={config} initialServiceId={selectedServiceId} />
          </div>
        </div>
        {loading ? <p className="mt-6 text-sm text-sage/60">Loading live content from Supabase...</p> : null}
        {error ? <p className="mt-3 text-sm text-ember">Supabase load issue: {error}</p> : null}
      </section>
    );
  }

  function FeedbackSection() {
    const latestFeedback = feedbackItems.slice(0, 3);
    const visibleFeedback = showAllFeedback ? feedbackItems : latestFeedback;

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
                    {showAllFeedback ? "Show latest feedback" : "View all feedback"}
                  </button>
                ) : null}
              </>
            )}
          </div>
          <FeedbackForm
            services={config.services}
            onSubmitted={(item) => {
              setFeedbackItems((current) => [item, ...current]);
            }}
          />
        </div>
      </section>
    );
  }

  function AstrologerAvatar() {
    if (mainAstrologer.photoUrl) {
      return <img src={mainAstrologer.photoUrl} alt={mainAstrologer.name} className="h-20 w-20 rounded-3xl object-cover" />;
    }

    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 font-display text-2xl text-sage">
        {mainAstrologer.name
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")}
      </div>
    );
  }
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-sage/10 bg-white/70 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">{icon}</div>
      <h3 className="mt-4 font-display text-lg text-sage">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-sage/80">{text}</p>
    </div>
  );
}

function SocialLink({ href, icon }: { href: string; icon: ReactNode }) {
  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sage/10 bg-white/75 text-sage transition hover:bg-gold/10"
    >
      {icon}
    </a>
  );
}
