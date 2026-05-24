"use client";

import type { SiteConfig } from "@/lib/site-config";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Copy, MessageCircle, QrCode, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const bookingSchema = z.object({
  fullName: z.string().min(2, "Please enter your name."),
  phoneNumber: z.string().min(10, "Please enter a valid phone number."),
  email: z.string().email("Please enter a valid email."),
  dob: z.string().min(1, "Date of birth is required."),
  tob: z.string().min(1, "Time of birth is required."),
  pob: z.string().min(2, "Place of birth is required."),
  selectedServiceId: z.string().min(1, "Please select a service."),
  paymentCompleted: z.boolean().refine((value) => value, {
    message: "Please confirm that the payment is completed before proceeding."
  }),
  message: z.string().optional()
});

type BookingFormValues = z.infer<typeof bookingSchema>;

function buildUpiLink(upiId: string, name: string, amount: number, serviceName: string) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: String(amount),
    cu: "INR",
    tn: `${serviceName} consultation payment`
  });

  return `upi://pay?${params.toString()}`;
}

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
      dob: "",
      tob: "",
      pob: "",
      selectedServiceId: config.services[0]?.id ?? "",
      paymentCompleted: false,
      message: ""
    }
  });

  const selectedServiceId = form.watch("selectedServiceId");
  const selectedService = config.services.find((service) => service.id === selectedServiceId) ?? config.services[0];

  const upiLink = useMemo(() => {
    return buildUpiLink(mainAstrologer.upiId, mainAstrologer.name, selectedService?.price ?? 0, selectedService?.name ?? "Consultation");
  }, [mainAstrologer.name, mainAstrologer.upiId, selectedService?.name, selectedService?.price]);

  const qrSource = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiLink)}`;

  const onSubmit = form.handleSubmit((values) => {
    const service = config.services.find((item) => item.id === values.selectedServiceId);
    if (!service) {
      setConfirmation("Please select a valid service.");
      return;
    }

    const whatsappText = encodeURIComponent(
      [
        `Hello ${mainAstrologer.name},`,
        `Payment done confirmation for: ${service.name}`,
        `Amount paid: Rs. ${service.price}`,
        `Name: ${values.fullName}`,
        `Phone: ${values.phoneNumber}`,
        `Email: ${values.email}`,
        `DOB: ${values.dob}`,
        `TOB: ${values.tob}`,
        `POB: ${values.pob}`,
        `Message: ${values.message || "N/A"}`,
        "Client has confirmed payment completion. Please follow up with the next step."
      ].join("\n")
    );

    const whatsappUrl = `https://wa.me/${mainAstrologer.whatsapp}?text=${whatsappText}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    setConfirmation(
      `Payment marked complete for Rs. ${service.price}. The astrologer has the confirmation message draft, and your customer now sees that your team will reach out next.`
    );
  });

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(mainAstrologer.upiId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const inputClass =
    "w-full rounded-2xl border border-sage/12 bg-white/80 px-4 py-3 text-sm text-sage outline-none transition placeholder:text-sage/40 focus:border-gold";

  return (
    <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow backdrop-blur sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-display text-2xl font-semibold text-sage">Consultation Booking & Payment</h3>
          <p className="mt-2 text-sm text-sage/75">
            Fill every required detail, pay the exact service amount, confirm payment completion, then proceed to astrologer confirmation.
          </p>
        </div>
        <div className="rounded-3xl border border-gold/25 bg-gold/10 p-4 text-sm text-sage">
          <p className="font-semibold">UPI ID</p>
          <div className="mt-2 flex items-center gap-3">
            <span>{mainAstrologer.upiId}</span>
            <button
              type="button"
              onClick={copyUpiId}
              className="inline-flex items-center gap-1 rounded-full border border-sage/15 px-3 py-1 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-sage/10 bg-ivory/70 p-5">
          <p className="text-sm uppercase tracking-[0.25em] text-gold">Required Flow</p>
          <div className="mt-4 grid gap-3 text-sm text-sage/80">
            <p>1. Select the service or consultation amount.</p>
            <p>2. Fill name, email, phone, DOB, TOB, and POB.</p>
            <p>3. Scan the QR for the exact amount shown here.</p>
            <p>4. Mark payment completed, then proceed to astrologer confirmation.</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-gold/25 bg-gold/10 p-5">
          <div className="flex items-center gap-2 text-gold">
            <QrCode className="h-4 w-4" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">Dynamic Payment QR</p>
          </div>
          <div className="mt-4 rounded-[1.5rem] bg-white p-4">
            <img src={qrSource} alt={`Payment QR for Rs. ${selectedService?.price ?? 0}`} className="mx-auto h-56 w-56 rounded-2xl object-contain" />
          </div>
          <p className="mt-4 text-sm text-sage/75">
            Selected service: <span className="font-semibold text-sage">{selectedService?.name}</span>
          </p>
          <p className="mt-1 font-display text-3xl text-sage">Rs. {selectedService?.price ?? 0}</p>
          <p className="mt-2 text-sm text-sage/75">{selectedService?.description}</p>
        </div>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <div className="sm:col-span-2">
          <select
            className={inputClass}
            {...form.register("selectedServiceId", {
              onChange: () => {
                form.setValue("paymentCompleted", false, { shouldValidate: true });
                setConfirmation(null);
              }
            })}
          >
            {config.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - Rs. {service.price}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.selectedServiceId?.message} />
        </div>

        <div className="sm:col-span-2">
          <input className={inputClass} placeholder="Full name" {...form.register("fullName")} />
          <FieldError message={form.formState.errors.fullName?.message} />
        </div>

        <div>
          <input className={inputClass} placeholder="Email address" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div>
          <input className={inputClass} placeholder="Phone number" {...form.register("phoneNumber")} />
          <FieldError message={form.formState.errors.phoneNumber?.message} />
        </div>

        <div>
          <input type="date" className={inputClass} {...form.register("dob")} />
          <FieldError message={form.formState.errors.dob?.message} />
        </div>
        <div>
          <input type="time" className={inputClass} {...form.register("tob")} />
          <FieldError message={form.formState.errors.tob?.message} />
        </div>

        <div className="sm:col-span-2">
          <input className={inputClass} placeholder="Place of birth" {...form.register("pob")} />
          <FieldError message={form.formState.errors.pob?.message} />
        </div>

        <div className="sm:col-span-2">
          <textarea
            className={`${inputClass} min-h-28 resize-none`}
            placeholder="Additional message (optional)"
            {...form.register("message")}
          />
        </div>

        <div className="sm:col-span-2 rounded-[1.5rem] border border-sage/10 bg-ivory/65 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-sage/80">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-sage/20 text-sage focus:ring-gold"
              {...form.register("paymentCompleted")}
            />
            <span>
              I have completed the payment of <strong>Rs. {selectedService?.price ?? 0}</strong> using the QR shown
              above. Only after this confirmation can I proceed to the next step.
            </span>
          </label>
          <FieldError message={form.formState.errors.paymentCompleted?.message} />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 font-semibold text-ivory transition hover:bg-sage/90"
          >
            <MessageCircle className="h-4 w-4" />
            Proceed to Astrologer Confirmation
          </button>
        </div>
      </form>

      {confirmation ? (
        <div className="mt-5 rounded-3xl border border-gold/25 bg-gold/10 p-4 text-sm text-sage">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-gold" />
            <div>
              <p>{confirmation}</p>
              <p className="mt-2 flex items-center gap-2 font-medium text-sage">
                <ShieldCheck className="h-4 w-4 text-gold" />
                Our team will reach you soon.
              </p>
            </div>
          </div>
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
