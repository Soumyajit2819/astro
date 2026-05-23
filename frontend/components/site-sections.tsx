"use client";

import type { ReactNode } from "react";
import { useSiteConfig } from "@/lib/use-site-config";
import { CheckCircle2, Clock3, Facebook, Instagram, MessageSquareQuote, Phone, Star, Youtube } from "lucide-react";
import { BookingForm } from "./booking-form";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { SectionHeading } from "./section-heading";

export function SiteSections() {
  const { config, ready, loading, error } = useSiteConfig();
  const mainAstrologer = config.astrologers[0];

  if (!ready) {
    return <div className="min-h-screen bg-midnight" />;
  }

  return (
    <>
      <Navbar brandName={config.brandName} />
      <main>
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <ScheduleSection />
        <TestimonialsSection />
        <FaqSection />
        <ContactSection />
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
          <div>
            <div className="mb-6 inline-flex rounded-full border border-stardust/20 bg-stardust/10 px-4 py-2 text-sm text-stardust">
              {config.heroTagline}
            </div>
            <h1 className="max-w-4xl font-display text-5xl font-semibold leading-tight text-white sm:text-6xl">
              {config.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{config.heroDescription}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href="#booking" className="rounded-full bg-stardust px-6 py-3 text-center font-semibold text-midnight">
                Book Now
              </a>
              <a href="#schedule" className="rounded-full border border-white/15 px-6 py-3 text-center font-semibold text-white">
                View Schedule
              </a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                [mainAstrologer.experience.split(" ")[0], "Experience"],
                [`${config.services.length}`, "Services & classes"],
                [`${config.schedule.length}`, "Weekly schedule items"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="font-display text-2xl text-white">{value}</p>
                  <p className="mt-1 text-sm text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur">
            <div className="rounded-[1.5rem] border border-white/10 bg-nebula/80 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-aurora">Main Astrologer</p>
              <div className="mt-5 flex items-center gap-4">
                <AstrologerAvatar />
                <div>
                  <h2 className="font-display text-3xl text-white">{mainAstrologer.name}</h2>
                  <p className="mt-2 text-sm text-slate-300">{mainAstrologer.title}</p>
                </div>
              </div>
              <p className="mt-6 text-sm leading-7 text-slate-300">{mainAstrologer.bio}</p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FeatureCard icon={<Clock3 className="h-5 w-5" />} title="Structured Batches" text="Clear class timings and easy-to-follow weekly schedules." />
              <FeatureCard icon={<Phone className="h-5 w-5" />} title="Direct Confirmation" text="Clients send screenshot to astrologer and get personal confirmation." />
              <FeatureCard icon={<Star className="h-5 w-5" />} title="Clear Pricing" text="Consultation and class fees are shown clearly for every offering." />
              <FeatureCard icon={<MessageSquareQuote className="h-5 w-5" />} title="Simple Booking" text="UPI payment plus WhatsApp confirmation keeps the flow easy." />
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
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="flex h-full flex-col justify-between rounded-[1.5rem] bg-gradient-to-br from-aurora/20 via-plum/10 to-transparent p-8">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-stardust">Astrologer Profile</p>
                <h3 className="mt-4 font-display text-3xl text-white">{mainAstrologer.name}</h3>
                <p className="mt-3 text-sm text-slate-300">{mainAstrologer.title}</p>
                <p className="mt-4 text-slate-300">{mainAstrologer.experience}</p>
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
              title="Show your experience, social proof, and contact details clearly"
              description="This website keeps everything simple and personal, with a strong focus on the astrologer profile, clear offerings, and an easy booking experience."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Consultation services with clear prices",
                "Class batches with weekly timings",
                "Direct WhatsApp screenshot confirmation",
                "Social links and astrologer profile section"
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-stardust" />
                  <p className="text-sm text-slate-300">{item}</p>
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
          title="Consultations and classes with direct pricing"
          description="Visitors can clearly see what is available, how much it costs, and whether it is a one-to-one consultation or a class."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {config.services.map((service) => (
            <div key={service.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-aurora">{service.type}</p>
              <h3 className="mt-4 font-display text-2xl text-white">{service.name}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">{service.description}</p>
              <p className="mt-6 text-xl font-semibold text-stardust">Rs. {service.price}</p>
              <a href="#booking" className="mt-6 inline-block rounded-full bg-white/10 px-5 py-3 text-sm text-white">
                Choose this
              </a>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function ScheduleSection() {
    return (
      <section id="schedule" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              eyebrow="Schedule"
              title="Simple weekly class schedule for students"
              description="Keep your batches clear. When students pay and send a screenshot, the astrologer can manually confirm the right batch or consultation time."
            />
            <div className="mt-8 rounded-[2rem] border border-stardust/20 bg-stardust/10 p-6">
              <p className="font-display text-2xl text-white">Class timing information</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Choose the batch that fits you best. After payment screenshot confirmation, the astrologer shares final joining details personally.
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            {config.schedule.map((item) => (
              <div key={item.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.25em] text-aurora">{item.classDate}</p>
                <h3 className="mt-3 font-display text-2xl text-white">{item.className}</h3>
                <p className="mt-3 text-slate-300">{item.classTime}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-400">
                  <p>{item.teacher} • {item.type}</p>
                  {item.mode ? <p>Mode: {item.mode}</p> : null}
                  {item.platform ? <p>Platform: {item.platform}</p> : null}
                  {item.courseDuration ? <p>Course Duration: {item.courseDuration}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function TestimonialsSection() {
    return (
      <section id="testimonials" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Testimonials"
          title="Simple trust-building feedback section"
          description="This keeps the website warm and personal while still feeling professional."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {config.testimonials.map((testimonial) => (
            <div key={testimonial.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <MessageSquareQuote className="h-8 w-8 text-stardust" />
              <p className="mt-4 text-sm leading-7 text-slate-300">&quot;{testimonial.quote}&quot;</p>
              <p className="mt-6 font-semibold text-white">{testimonial.name}</p>
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
          description="Use this section for payment steps, class timing notes, and consultation process."
        />
        <div className="mt-10 grid gap-4">
          {config.faqs.map((faq) => (
            <div key={faq.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <h3 className="font-display text-xl text-white">{faq.question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{faq.answer}</p>
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
              title="Pay by UPI and send payment screenshot to the astrologer"
              description="After payment, the astrologer personally confirms consultation timing or class seat on WhatsApp or phone."
            />
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-300">
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
        {loading ? <p className="mt-6 text-sm text-slate-400">Loading live content from Supabase...</p> : null}
        {error ? <p className="mt-3 text-sm text-amber-300">Supabase load issue: {error}</p> : null}
      </section>
    );
  }

  function AstrologerAvatar() {
    if (mainAstrologer.photoUrl) {
      return <img src={mainAstrologer.photoUrl} alt={mainAstrologer.name} className="h-20 w-20 rounded-3xl object-cover" />;
    }

    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-stardust/15 font-display text-2xl text-stardust">
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
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stardust/10 text-stardust">{icon}</div>
      <h3 className="mt-4 font-display text-lg text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
    >
      {icon}
    </a>
  );
}
