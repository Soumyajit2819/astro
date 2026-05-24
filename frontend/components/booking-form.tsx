"use client";

import type { SiteConfig } from "@/lib/site-config";
import { insertRows, uploadPublicFile } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Copy, MessageCircle, QrCode, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import type { ServiceItem } from "@/lib/site-config";

const BOOKING_DRAFT_STORAGE_KEY = "astro-booking-draft";

const createBookingSchema = (services: ServiceItem[]) =>
  z
    .object({
      fullName: z.string().min(2, "Please enter your name."),
      phoneNumber: z.string().min(10, "Please enter a valid phone number."),
      email: z.string().email("Please enter a valid email."),
      dob: z.string().optional(),
      tob: z.string().optional(),
      pob: z.string().optional(),
      selectedServiceId: z.string().min(1, "Please select a service."),
      paymentScreenshot: z.custom<FileList | undefined>().optional(),
      paymentCompleted: z.boolean().refine((value) => value, {
        message: "Please confirm that the payment is completed before proceeding."
      }),
      message: z.string().optional()
    })
    .superRefine((values, context) => {
      const selectedService = services.find((service) => service.id === values.selectedServiceId);

      const screenshotFile = values.paymentScreenshot?.item(0);
      if (!screenshotFile) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentScreenshot"],
          message: "Upload the payment screenshot before proceeding."
        });
      } else if (!screenshotFile.type.startsWith("image/")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentScreenshot"],
          message: "Upload a valid image file for payment proof."
        });
      }

      if (selectedService?.type === "class") {
        return;
      }

      if (!values.dob) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dob"],
          message: "Date of birth is required."
        });
      }

      if (!values.tob) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tob"],
          message: "Time of birth is required."
        });
      }

      if (!values.pob || values.pob.length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pob"],
          message: "Place of birth is required."
        });
      }
    });

type BookingFormValues = z.infer<ReturnType<typeof createBookingSchema>>;
type BookingDraft = Omit<BookingFormValues, "paymentScreenshot">;

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
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const mainAstrologer = config.astrologers[0];
  const bookingSchema = useMemo(() => createBookingSchema(config.services), [config.services]);

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
  const requiresBirthDetails = selectedService?.type !== "class";
  const paymentScreenshot = form.watch("paymentScreenshot");

  const upiLink = useMemo(() => {
    return buildUpiLink(mainAstrologer.upiId, mainAstrologer.name, selectedService?.price ?? 0, selectedService?.name ?? "Consultation");
  }, [mainAstrologer.name, mainAstrologer.upiId, selectedService?.name, selectedService?.price]);
  const paymentActionUrl = selectedService?.paymentUrl?.trim() || upiLink;
  const paymentActionLabel = selectedService?.paymentUrl?.trim() ? "Open Payment App (Optional)" : "Open UPI App (Optional)";

  const qrSource = selectedService?.paymentQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiLink)}`;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedDraft = window.localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!savedDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(savedDraft) as Partial<BookingDraft>;
      form.reset({
        fullName: parsedDraft.fullName ?? "",
        phoneNumber: parsedDraft.phoneNumber ?? "",
        email: parsedDraft.email ?? "",
        dob: parsedDraft.dob ?? "",
        tob: parsedDraft.tob ?? "",
        pob: parsedDraft.pob ?? "",
        selectedServiceId: parsedDraft.selectedServiceId ?? config.services[0]?.id ?? "",
        paymentCompleted: false,
        message: parsedDraft.message ?? ""
      });
      setConfirmation("Your booking details were restored after returning to the page. Please re-upload the screenshot after payment.");
    } catch {
      window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
    }
  }, [config.services, form]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (typeof window === "undefined") {
        return;
      }

      const draft: BookingDraft = {
        fullName: values.fullName ?? "",
        phoneNumber: values.phoneNumber ?? "",
        email: values.email ?? "",
        dob: values.dob ?? "",
        tob: values.tob ?? "",
        pob: values.pob ?? "",
        selectedServiceId: values.selectedServiceId ?? config.services[0]?.id ?? "",
        paymentCompleted: false,
        message: values.message ?? ""
      };

      window.localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    });

    return () => subscription.unsubscribe();
  }, [config.services, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const service = config.services.find((item) => item.id === values.selectedServiceId);
    if (!service) {
      setConfirmation("Please select a valid service.");
      return;
    }

    const screenshotFile = values.paymentScreenshot?.item(0);
    if (!screenshotFile) {
      setConfirmation("Upload the payment screenshot before proceeding.");
      return;
    }

    try {
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "astrologer-images";
      const extension = screenshotFile.name.split(".").pop() || "jpg";
      const safePhone = values.phoneNumber.replace(/\D/g, "") || "client";
      const path = `payment-proofs/${Date.now()}-${safePhone}.${extension}`;
      const screenshotUrl = await uploadPublicFile(bucket, path, screenshotFile);
      setProofUrl(screenshotUrl);

      await insertRows("payment_proofs", [
        {
          customer_name: values.fullName,
          email: values.email,
          phone_number: values.phoneNumber,
          service_name: service.name,
          amount: service.price,
          payment_screenshot_url: screenshotUrl,
          notes: values.message || "",
          status: "pending"
        }
      ]);

      const details = [
        `Hello ${mainAstrologer.name},`,
        `Payment done confirmation for: ${service.name}`,
        `Amount paid: Rs. ${service.price}`,
        "Payment Screenshot Link:",
        screenshotUrl,
        `Name: ${values.fullName}`,
        `Phone: ${values.phoneNumber}`,
        `Email: ${values.email}`
      ];

      if (service.type !== "class") {
        details.push(`DOB: ${values.dob}`, `TOB: ${values.tob}`, `POB: ${values.pob}`);
      }

      details.push(`Message: ${values.message || "N/A"}`, "Client has uploaded the payment screenshot. Please verify and follow up with the next step.");

      const whatsappText = encodeURIComponent(details.join("\n"));

      const whatsappUrl = `https://wa.me/${mainAstrologer.whatsapp}?text=${whatsappText}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
      form.reset({
        fullName: "",
        phoneNumber: "",
        email: "",
        dob: "",
        tob: "",
        pob: "",
        selectedServiceId: config.services[0]?.id ?? "",
        paymentCompleted: false,
        message: ""
      });

      setConfirmation(
        `Payment proof uploaded for Rs. ${service.price}. If WhatsApp does not show the link properly, use the buttons below to open or copy the screenshot link manually.`
      );
    } catch (uploadError) {
      setProofUrl(null);
      setConfirmation(uploadError instanceof Error ? uploadError.message : "Payment screenshot upload failed.");
    }
  });

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(mainAstrologer.upiId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const copyProofLink = async () => {
    if (!proofUrl) {
      return;
    }

    await navigator.clipboard.writeText(proofUrl);
    setConfirmation("Screenshot link copied. Paste it directly into WhatsApp if the link is not visible in the draft.");
  };

  const inputClass =
    "mt-2 w-full rounded-2xl border border-sage/12 bg-white px-4 py-3 text-sm text-sage outline-none transition placeholder:text-sage/40 focus:border-gold";

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
            <p>2. Fill your contact details{requiresBirthDetails ? " and birth details" : ""}.</p>
            <p>3. Pay using the QR code or copy the UPI ID manually.</p>
            <p>4. Use the app-open button only if your phone supports the payment request cleanly.</p>
            <p>5. Upload your payment screenshot, mark payment completed, then proceed.</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-gold/25 bg-gold/10 p-5">
          <div className="flex items-center gap-2 text-gold">
            <QrCode className="h-4 w-4" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">Dynamic Payment QR <span className="text-ember">*</span></p>
          </div>
          <div className="mt-4 rounded-[1.5rem] bg-white p-4">
            <img src={qrSource} alt={`Payment QR for Rs. ${selectedService?.price ?? 0}`} className="mx-auto h-56 w-56 rounded-2xl object-contain" />
          </div>
          <div className="mt-4 rounded-[1.25rem] border border-sage/10 bg-white/80 p-4 text-sm text-sage">
            <p className="font-semibold">Preferred payment method</p>
            <p className="mt-2 text-sage/75">Scan the QR code above or copy the UPI ID below and pay the exact amount manually in BHIM, PhonePe, GPay, or Paytm.</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-sage/10 bg-ivory/70 px-4 py-3">
              <span className="break-all font-medium">{mainAstrologer.upiId}</span>
              <button
                type="button"
                onClick={copyUpiId}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sage/15 px-3 py-1 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <a
            href={paymentActionUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-sage/15 bg-white px-4 py-3 text-sm font-semibold text-sage"
          >
            {paymentActionLabel}
          </a>
          <p className="mt-2 text-xs text-sage/65">
            This button is only a convenience option. If BHIM or another app says the request is unsupported, use the QR code or copied UPI ID instead.
          </p>
          <p className="mt-4 text-sm text-sage/75">
            Selected service: <span className="font-semibold text-sage">{selectedService?.name}</span>
          </p>
          <p className="mt-1 font-display text-3xl text-sage">Rs. {selectedService?.price ?? 0}</p>
          <p className="mt-2 text-sm text-sage/75">{selectedService?.description}</p>
          <p className="mt-3 text-xs font-medium text-ember">Proceed only after real payment. Screenshot proof is required.</p>
        </div>
      </div>

      <form className="grid gap-5" onSubmit={onSubmit}>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-sage">
            Select Service <span className="text-ember">*</span>
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
          </label>
          <FieldError message={form.formState.errors.selectedServiceId?.message} />
        </div>

        <RequiredInput label="Full Name" placeholder="Enter your full name" register={form.register("fullName")} className={inputClass} />
        <FieldError message={form.formState.errors.fullName?.message} />

        <RequiredInput label="Email" placeholder="Enter your email address" register={form.register("email")} className={inputClass} />
        <FieldError message={form.formState.errors.email?.message} />

        <RequiredInput
          label="Phone Number"
          placeholder="Enter your phone number"
          register={form.register("phoneNumber")}
          className={inputClass}
        />
        <FieldError message={form.formState.errors.phoneNumber?.message} />

        {requiresBirthDetails ? (
          <>
            <RequiredInput label="Date of Birth" type="date" register={form.register("dob")} className={inputClass} />
            <FieldError message={form.formState.errors.dob?.message} />

            <RequiredInput label="Time of Birth" type="time" register={form.register("tob")} className={inputClass} />
            <FieldError message={form.formState.errors.tob?.message} />

            <RequiredInput
              label="Place of Birth"
              placeholder="Enter your place of birth"
              register={form.register("pob")}
              className={inputClass}
            />
            <FieldError message={form.formState.errors.pob?.message} />
          </>
        ) : null}

        <label className="text-sm font-medium text-sage">
          Payment Screenshot <span className="text-ember">*</span>
          <div className="mt-2 rounded-[1.5rem] border border-dashed border-gold/40 bg-gold/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-sage">
              <Upload className="h-4 w-4 text-gold" />
              Upload the screenshot after payment
            </div>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-sage file:mr-4 file:rounded-full file:border-0 file:bg-sage file:px-4 file:py-2 file:font-medium file:text-ivory"
              {...form.register("paymentScreenshot")}
            />
            <p className="mt-2 text-xs text-sage/65">Accepted proof: JPG, PNG, WEBP, or any image from your payment app.</p>
          </div>
        </label>
        <FieldError message={form.formState.errors.paymentScreenshot?.message} />

        <label className="text-sm font-medium text-sage">
          Additional Message
          <textarea
            className={`${inputClass} min-h-28 resize-none`}
            placeholder="Anything you want to share before the consultation"
            {...form.register("message")}
          />
        </label>

        <div className="rounded-[1.5rem] border border-sage/10 bg-ivory/65 p-4">
          <p className="mb-3 text-sm font-medium text-sage">
            Payment Confirmation <span className="text-ember">*</span>
          </p>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-sage/80">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-sage/20 text-sage focus:ring-gold"
              {...form.register("paymentCompleted")}
            />
            <span>
              I have completed the payment of <strong>Rs. {selectedService?.price ?? 0}</strong> using the QR shown
              above, and I have uploaded the payment screenshot. Only after this can I proceed.
            </span>
          </label>
          <FieldError message={form.formState.errors.paymentCompleted?.message} />
        </div>

        <div>
          <button
            type="submit"
            disabled={!form.watch("paymentCompleted") || !paymentScreenshot?.item(0)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 font-semibold text-ivory transition hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-60"
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
              {proofUrl ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-sage px-4 py-2 text-xs font-semibold text-ivory"
                  >
                    Open Screenshot
                  </a>
                  <button
                    type="button"
                    onClick={copyProofLink}
                    className="inline-flex items-center justify-center rounded-full border border-sage/15 bg-white/70 px-4 py-2 text-xs font-semibold text-sage"
                  >
                    Copy Screenshot Link
                  </button>
                </div>
              ) : null}
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

function RequiredInput({
  label,
  placeholder,
  type = "text",
  register,
  className
}: {
  label: string;
  placeholder?: string;
  type?: string;
  register: UseFormRegisterReturn;
  className: string;
}) {
  return (
    <label className="text-sm font-medium text-sage">
      {label} <span className="text-ember">*</span>
      <input type={type} className={className} placeholder={placeholder} {...register} />
    </label>
  );
}
