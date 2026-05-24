"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useSiteConfig } from "@/lib/use-site-config";
import {
  CheckCircle2,
  CircleDot,
  Facebook,
  Flower2,
  Instagram,
  Phone,
  Sparkles,
  Youtube
} from "lucide-react";
import { BookingForm } from "./booking-form";
import { FeedbackForm } from "./feedback-form";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { SectionHeading } from "./section-heading";

export function SiteSections() {
  const { config, ready, loading, error } = useSiteConfig();
  const mainAstrologer = config.astrologers[0];

  if (!ready) {
    return <div className="min-h-screen bg-ivory" />;
  }

  return (
    <>
      <Navbar brandName={config.brandName} />
      <main>
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <FaqSection />
        <ContactSection />
        <FeedbackSection />
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

            <div className="mt-8 grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="dev-blessing rounded-[2rem] border border-gold/20 p-5 shadow-glow">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
                  <Sparkles className="h-4 w-4" />
                  Ketu Dev Blessings
                </div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-48 overflow-hidden rounded-[1.6rem] border border-gold/20 bg-white/75 sm:h-52 sm:w-40">
                    <Image
                      src="/theme/ketu-dev-theme.jpeg"
                      alt="Ketu Dev blessing"
                      fill
                      sizes="(max-width: 640px) 100vw, 160px"
                      className="object-contain p-2"
                    />
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 h-10 rounded-full bg-gold/15 blur-xl" />
                  </div>
                  <div>
                    <p className="font-display text-2xl text-sage">Protection, insight, and spiritual depth</p>
                    <p className="mt-2 text-sm leading-6 text-sage/80">
                      The Ketu Dev blessing image is now placed inside the user theme in a clean devotional card, sized
                      to stay clear of surrounding text and content.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-sage/10 bg-white/75 p-5 shadow-glow">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
                  <CircleDot className="h-4 w-4" />
                  Jupiter Motion
                </div>
                <div className="cosmic-orbit mt-4 flex h-52 items-center justify-center overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_40%,rgba(255,249,236,0.98),rgba(240,228,197,0.88))]">
                  <div className="planet-glow h-36 w-36" />
                  <div className="planet-jupiter h-36 w-36 overflow-hidden rounded-full">
                    <Image
                      src="/theme/jupiter-theme.jpeg"
                      alt="Rotating Jupiter planet"
                      fill
                      sizes="144px"
                      className="jupiter-image object-cover"
                    />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-sage/80">
                  The real Jupiter image is wrapped inside a rotating 3D-style frame so the homepage feels smoother,
                  more spiritual, and visually richer without disturbing the layout.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-sage/10 bg-white/75 p-6 shadow-glow backdrop-blur">
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
          <div className="rounded-[2rem] border border-sage/10 bg-white/75 p-8 shadow-glow">
            <div className="flex h-full flex-col justify-between rounded-[1.5rem] border border-gold/20 bg-gold/10 p-8">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-gold">Astrologer Profile</p>
                <h3 className="mt-4 font-display text-3xl text-sage">{mainAstrologer.name}</h3>
                <p className="mt-3 text-sm text-sage/80">{mainAstrologer.title}</p>
                <p className="mt-4 text-sage/75">{mainAstrologer.experience}</p>
              </div>
              <div className="mt-6 flex gap-3">
                <SocialLink href={mainAstrologer.instagram} icon={<Instagram className="h-4 w-4" />} />
                <SocialLink href={mainAstrologer.youtube} icon={<Youtube className="h-4 w-4" />} />
                <SocialLink href={mainAstrologer.facebook} icon={<Facebook className="h-4 w-4" />} />
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
          {config.services.map((service) => (
            <div key={service.id} className="rounded-[2rem] border border-sage/10 bg-white/75 p-6 shadow-glow">
              <p className="text-sm uppercase tracking-[0.25em] text-gold">{service.type}</p>
              <h3 className="mt-4 font-display text-2xl text-sage">{service.name}</h3>
              <p className="mt-4 text-sm leading-7 text-sage/80">{service.description}</p>
              <p className="mt-6 text-xl font-semibold text-sage">Rs. {service.price}</p>
              <a href="#booking" className="mt-6 inline-block rounded-full bg-gold/15 px-5 py-3 text-sm font-semibold text-sage">
                Choose this
              </a>
            </div>
          ))}
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
            <BookingForm config={config} />
          </div>
        </div>
        {loading ? <p className="mt-6 text-sm text-sage/60">Loading live content from Supabase...</p> : null}
        {error ? <p className="mt-3 text-sm text-ember">Supabase load issue: {error}</p> : null}
      </section>
    );
  }

  function FeedbackSection() {
    return (
      <section id="feedback" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionHeading
              eyebrow="Feedback"
              title="Let clients share feedback after their consultation"
              description="Instead of showing fixed automated feedback on the homepage, this section lets real users submit their own response after the service is complete."
            />
          </div>
          <FeedbackForm />
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
