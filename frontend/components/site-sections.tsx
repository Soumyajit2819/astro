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
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-gold/30 bg-white/70 px-4 py-2 text-sm font-medium text-sage">
              {config.heroTagline}
            </div>
            <h1 className="max-w-4xl font-display text-5xl font-semibold leading-tight text-sage sm:text-6xl">
              Gentle guidance for astrology, healing, and spiritual clarity.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-sage/90">
              A bright and welcoming space for consultations, remedies, and learning. Select your service, complete
              the payment, and share your details so our team can reach you with the next steps.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href="#booking" className="rounded-full bg-sage px-6 py-3 text-center font-semibold text-ivory">
                Start Your Booking
              </a>
              <a href="#services" className="rounded-full border border-sage/15 px-6 py-3 text-center font-semibold text-sage">
                Explore Services
              </a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                [mainAstrologer.experience.split(" ")[0], "Years of guidance"],
                [`${config.services.length}`, "Offerings"],
                ["100%", "Guided manually"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-[1.75rem] border border-sage/10 bg-white/70 p-4 shadow-glow">
                  <p className="font-display text-2xl text-sage">{value}</p>
                  <p className="mt-1 text-sm text-sage/65">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-sage/10 bg-white/75 p-6 shadow-glow backdrop-blur">
            {/* Spiritual Mentor profile with photo */}
            <div className="relative overflow-hidden rounded-[1.5rem]">
              {mainAstrologer.photoUrl ? (
                <div className="relative h-40 w-full overflow-hidden rounded-t-[1.5rem]">
                  <img
                    src={mainAstrologer.photoUrl}
                    alt={mainAstrologer.name}
                    className="h-full w-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/20 to-transparent" />
                </div>
              ) : null}
              <div className="rounded-[1.5rem] bg-spiritual p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-gold">Spiritual Mentor</p>
                <div className="mt-5 flex items-center gap-4">
                  <AstrologerAvatar />
                  <div>
                    <h2 className="font-display text-3xl text-sage">{mainAstrologer.name}</h2>
                    <p className="mt-2 text-sm text-sage/80">{mainAstrologer.title}</p>
                  </div>
                </div>
                <p className="mt-6 text-sm leading-7 text-sage/90">{mainAstrologer.bio}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FeatureCard icon={<Sparkles className="h-5 w-5" />} title="Light, calm design" text="A simple spiritual presentation that feels clear, personal, and trustworthy." />
              <FeatureCard icon={<Sparkles className="h-5 w-5" />} title="Guided process" text="Clients move step by step from service selection to payment confirmation." />
              <FeatureCard icon={<Phone className="h-5 w-5" />} title="Direct follow-up" text="Once payment is marked done, the astrologer receives a ready message." />
              <FeatureCard icon={<Flower2 className="h-5 w-5" />} title="Smart details intake" text="Consultations collect birth details, while classes keep the form simpler." />
            </div>
          </div>
        </div>
      </section>
    );
  }

  function AboutSection() {
    return (
      <section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">

          {/* ── Astrologer Profile Card ── */}
          <div className="rounded-[2rem] border border-sage/10 bg-white/75 shadow-glow overflow-hidden">
            {/* Photo background header */}
            <div className="relative h-52 w-full overflow-hidden rounded-t-[2rem]">
              {mainAstrologer.photoUrl ? (
                <img
                  src={mainAstrologer.photoUrl}
                  alt={mainAstrologer.name}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-gold/20 via-ivory to-sage/10 flex items-center justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/80 font-display text-4xl text-sage shadow-glow">
                    {mainAstrologer.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                  </div>
                </div>
              )}
              {/* Gradient overlay so text below is readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/30 to-transparent" />
              {/* Name floated over the bottom of the photo */}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium">Astrologer Profile</p>
                <h3 className="mt-1 font-display text-2xl text-sage leading-tight">{mainAstrologer.name}</h3>
              </div>
            </div>

            {/* Card body */}
            <div className="flex flex-col gap-4 p-6">
              <div>
                <p className="text-sm font-semibold text-sage">{mainAstrologer.title}</p>
                <p className="mt-2 text-sm leading-6 text-sage/75">{mainAstrologer.experience}</p>
                {mainAstrologer.bio ? (
                  <p className="mt-3 text-sm leading-6 text-sage/70 line-clamp-3">{mainAstrologer.bio}</p>
                ) : null}
              </div>

              {/* Social links — dark bordered, labelled */}
              <div className="mt-2 flex flex-wrap gap-3">
                {mainAstrologer.instagram ? (
                  <a
                    href={mainAstrologer.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-sage/30 bg-sage px-4 py-2 text-xs font-semibold text-ivory transition hover:bg-sage/80"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    Instagram
                  </a>
                ) : null}
                {mainAstrologer.youtube ? (
                  <a
                    href={mainAstrologer.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember px-4 py-2 text-xs font-semibold text-ivory transition hover:bg-ember/80"
                  >
                    <Youtube className="h-3.5 w-3.5" />
                    YouTube
                  </a>
                ) : null}
                {mainAstrologer.facebook ? (
                  <a
                    href={mainAstrologer.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-sage/30 bg-sage/80 px-4 py-2 text-xs font-semibold text-ivory transition hover:bg-sage/60"
                  >
                    <Facebook className="h-3.5 w-3.5" />
                    Facebook
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <SectionHeading
              eyebrow="About"
              title="An astrology website with a warm spiritual tone and a practical booking flow"
              description="The experience stays calm and easy to understand while still collecting the exact details needed for consultations and payment follow-up."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Light theme with a restrained 3-color palette",
                "Service cards with visible pricing",
                "Service-specific intake before confirmation",
                "Manual payment confirmation without a payment gateway"
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[1.5rem] border border-sage/10 bg-white/75 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-gold" />
                  <p className="text-sm text-sage/80">{item}</p>
                </div>
              ))}
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
