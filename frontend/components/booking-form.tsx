"use client";

import type { SiteConfig } from "@/lib/site-config";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const bookingSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  phoneNumber: z.string().min(10, "Please enter a valid phone number."),
  email: z.string().email("Please enter a valid email."),
  selectedServiceId: z.string().min(1, "Please select a service or class."),
  message: z.string().optional()
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export function BookingForm({ config }: { config: SiteConfig }) {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mainAstrologer = config.astrologers[0];

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      email: "",
      selectedServiceId: config.services[0]?.id ?? "",
      message: ""
    }
  });

  const selectedServiceId = form.watch("selectedServiceId");
  const selectedService = config.services.find((service) => service.id === selectedServiceId) ?? config.services[0];

  const onSubmit = form.handleSubmit((values) => {
    const service = config.services.find((item) => item.id === values.selectedServiceId);
    if (!service) {
      setConfirmation("Please select a valid service.");
      return;
    }

    const whatsappText = encodeURIComponent(
      [
        `Hello ${mainAstrologer.name},`,
        `I want to book: ${service.name}`,
        `Name: ${values.fullName}`,
        `Phone: ${values.phoneNumber}`,
        `Email: ${values.email}`,
        `Message: ${values.message || "N/A"}`,
        `I have completed the UPI payment of Rs. ${service.price}. I will send the screenshot now.`
      ].join("\n")
    );

    const whatsappUrl = `https://wa.me/${mainAstrologer.whatsapp}?text=${whatsappText}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    setConfirmation(
      `UPI payment step ready for ${service.name}. Send your payment screenshot to ${mainAstrologer.phone} on WhatsApp so the astrologer can confirm your slot.`
    );
  });

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(mainAstrologer.upiId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-aurora";

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-display text-2xl font-semibold text-white">Book Consultation or Class</h3>
          <p className="mt-2 text-sm text-slate-300">
            Choose a service, pay by UPI, and send the screenshot to the astrologer&apos;s WhatsApp for manual
            confirmation.
          </p>
        </div>
        <div className="rounded-3xl border border-stardust/20 bg-stardust/10 p-4 text-sm text-stardust">
          <p className="font-semibold">UPI ID</p>
          <div className="mt-2 flex items-center gap-3">
            <span>{mainAstrologer.upiId}</span>
            <button
              type="button"
              onClick={copyUpiId}
              className="inline-flex items-center gap-1 rounded-full border border-stardust/30 px-3 py-1 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[1.5rem] border border-white/10 bg-midnight/40 p-5">
        <p className="text-sm uppercase tracking-[0.25em] text-aurora">Payment Flow</p>
        <div className="mt-4 grid gap-3 text-sm text-slate-300">
          <p>1. Select consultation or class</p>
          <p>2. Pay the shown amount by UPI</p>
          <p>3. Click submit and send the payment screenshot on WhatsApp</p>
          <p>4. Astrologer confirms your class seat or consultation timing personally</p>
        </div>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <div className="sm:col-span-2">
          <input className={inputClass} placeholder="Full name" {...form.register("fullName")} />
          <FieldError message={form.formState.errors.fullName?.message} />
        </div>
        <div>
          <input className={inputClass} placeholder="Phone number" {...form.register("phoneNumber")} />
          <FieldError message={form.formState.errors.phoneNumber?.message} />
        </div>
        <div>
          <input className={inputClass} placeholder="Email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div className="sm:col-span-2">
          <select className={inputClass} {...form.register("selectedServiceId")}>
            {config.services.map((service) => (
              <option key={service.id} value={service.id} className="bg-nebula">
                {service.name} - Rs. {service.price}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.selectedServiceId?.message} />
        </div>
        <div className="sm:col-span-2 rounded-[1.5rem] border border-stardust/20 bg-stardust/10 p-4">
          <p className="text-sm text-stardust">Selected payment amount</p>
          <p className="mt-1 font-display text-3xl text-white">Rs. {selectedService?.price ?? 0}</p>
          <p className="mt-2 text-sm text-slate-300">{selectedService?.description}</p>
        </div>
        <div className="sm:col-span-2">
          <textarea
            className={`${inputClass} min-h-28 resize-none`}
            placeholder="Additional message"
            {...form.register("message")}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stardust px-6 py-3 font-semibold text-midnight transition hover:bg-yellow-300"
          >
            <MessageCircle className="h-4 w-4" />
            Continue to WhatsApp Confirmation
          </button>
        </div>
      </form>

      {confirmation ? (
        <div className="mt-5 flex items-start gap-3 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
          <p>{confirmation}</p>
        </div>
      ) : null}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-xs text-ember">{message}</p>;
}
