"use client";

import type { SiteConfig } from "@/lib/site-config";
import { insertRows } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Tag,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import type { CouponItem, ServiceItem } from "@/lib/site-config";

const BOOKING_DRAFT_STORAGE_KEY = "astro-booking-draft";

/* ── Razorpay types ── */
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
}

/* ── Schema ── */
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
      message: z.string().optional(),
    })
    .superRefine((values, context) => {
      const selectedService = services.find((s) => s.id === values.selectedServiceId);
      if (selectedService?.type === "class") return;
      if (!values.dob)
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["dob"], message: "Date of birth is required." });
      if (!values.tob)
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["tob"], message: "Time of birth is required." });
      if (!values.pob || values.pob.length < 2)
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["pob"], message: "Place of birth is required." });
    });

type BookingFormValues = z.infer<ReturnType<typeof createBookingSchema>>;
type BookingDraft = BookingFormValues;

export function BookingForm({
  config,
  initialServiceId,
}: {
  config: SiteConfig;
  initialServiceId?: string;
}) {
  const [step, setStep] = useState<"form" | "paying" | "success">("form");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponItem | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const skipDraftRef = useRef(false);

  const mainAstrologer = config.astrologers[0];
  const bookingSchema = useMemo(() => createBookingSchema(config.services), [config.services]);
  const defaultServiceId = initialServiceId ?? config.services[0]?.id ?? "";

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      fullName: "", phoneNumber: "", email: "",
      dob: "", tob: "", pob: "",
      selectedServiceId: defaultServiceId,
      message: "",
    },
  });

  /* Sync initialServiceId from parent "Book now" click */
  useEffect(() => {
    if (initialServiceId) {
      form.setValue("selectedServiceId", initialServiceId, { shouldValidate: false });
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError(null);
    }
  }, [initialServiceId, form]);

  const selectedServiceId = form.watch("selectedServiceId");
  const selectedService =
    config.services.find((s) => s.id === selectedServiceId) ?? config.services[0];
  const requiresBirthDetails = selectedService?.type !== "class";

  /* Price calculation */
  const basePrice = selectedService?.price ?? 0;
  const serviceDiscountPct = selectedService?.discountPercent ?? 0;
  const priceAfterService = serviceDiscountPct > 0
    ? Math.round(basePrice * (1 - serviceDiscountPct / 100))
    : basePrice;
  const couponDiscountPct = appliedCoupon?.discountPercent ?? 0;
  const finalPrice = couponDiscountPct > 0
    ? Math.round(priceAfterService * (1 - couponDiscountPct / 100))
    : priceAfterService;
  const totalSavings = basePrice - finalPrice;

  /* Draft restore */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved) as Partial<BookingDraft>;
      if (d.fullName || d.email || d.phoneNumber) {
        form.reset({
          fullName: d.fullName ?? "",
          phoneNumber: d.phoneNumber ?? "",
          email: d.email ?? "",
          dob: d.dob ?? "",
          tob: d.tob ?? "",
          pob: d.pob ?? "",
          selectedServiceId: d.selectedServiceId ?? defaultServiceId,
          message: d.message ?? "",
        });
      }
    } catch { window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Draft auto-save */
  useEffect(() => {
    const sub = form.watch((values) => {
      if (typeof window === "undefined") return;
      if (skipDraftRef.current) { skipDraftRef.current = false; return; }
      if (values.fullName || values.email || values.phoneNumber) {
        window.localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(values));
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  /* Load Razorpay script once */
  useEffect(() => {
    if (document.getElementById("razorpay-script")) return;
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  /* Coupon helpers */
  const applyCoupon = () => {
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError("Enter a coupon code first."); return; }
    const match = (config.coupons ?? []).find((c) => c.code.toUpperCase() === code && c.active);
    if (!match) { setAppliedCoupon(null); setCouponError("Invalid or expired coupon code."); return; }
    setAppliedCoupon(match);
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(""); setCouponError(null); };

  /* Main submit — create Razorpay order → open checkout → verify → save to Supabase → WhatsApp */
  const onSubmit = form.handleSubmit(async (values) => {
    const service = config.services.find((s) => s.id === values.selectedServiceId);
    if (!service) return;

    setStep("paying");
    setStatusMsg(null);

    try {
      /* 1. Create order on server */
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalPrice,
          currency: "INR",
          receipt: `booking_${Date.now()}`,
        }),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error ?? "Failed to create payment order.");
      }
      const order = await orderRes.json();

      /* 2. Open Razorpay checkout */
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId || typeof window.Razorpay === "undefined") {
        throw new Error("Razorpay is not loaded. Please refresh and try again.");
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: "AstroVerse",
          description: service.name,
          order_id: order.id,
          prefill: {
            name: values.fullName,
            email: values.email,
            contact: values.phoneNumber,
          },
          theme: { color: "#52624f" },
          handler: async (response: RazorpayResponse) => {
            try {
              /* 3. Verify signature on server */
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
              const verified = await verifyRes.json();
              if (!verified.verified) throw new Error("Payment verification failed.");

              /* 4. Save booking to Supabase */
              await insertRows("payment_proofs", [{
                customer_name: values.fullName,
                email: values.email,
                phone_number: values.phoneNumber,
                service_name: service.name,
                amount: finalPrice,
                original_amount: basePrice,
                coupon_code: appliedCoupon?.code ?? null,
                coupon_discount_percent: appliedCoupon?.discountPercent ?? null,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                notes: values.message || "",
                status: "paid",
              }]);

              /* 5. Open WhatsApp with booking details */
              const lines = [
                `Hello ${mainAstrologer.name},`,
                `✅ Razorpay payment confirmed for: ${service.name}`,
                `Amount paid: Rs. ${finalPrice}`,
                ...(totalSavings > 0 ? [`Original: Rs. ${basePrice} | Saved: Rs. ${totalSavings}`] : []),
                ...(appliedCoupon ? [`Coupon: ${appliedCoupon.code} (${appliedCoupon.discountPercent}% off)`] : []),
                `Payment ID: ${response.razorpay_payment_id}`,
                `Order ID: ${response.razorpay_order_id}`,
                `Name: ${values.fullName}`,
                `Phone: ${values.phoneNumber}`,
                `Email: ${values.email}`,
                ...(service.type !== "class"
                  ? [`DOB: ${values.dob}`, `TOB: ${values.tob}`, `POB: ${values.pob}`]
                  : []),
                `Message: ${values.message || "N/A"}`,
                "Payment is verified. Please follow up with the client.",
              ];
              window.open(
                `https://wa.me/${mainAstrologer.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`,
                "_blank",
                "noopener,noreferrer"
              );

              /* 6. Reset */
              skipDraftRef.current = true;
              window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
              setAppliedCoupon(null);
              setCouponCode("");
              form.reset({
                fullName: "", phoneNumber: "", email: "",
                dob: "", tob: "", pob: "",
                selectedServiceId: config.services[0]?.id ?? "",
                message: "",
              });
              setStep("success");
              setStatusMsg(`Payment of Rs. ${finalPrice} confirmed. Payment ID: ${response.razorpay_payment_id}. WhatsApp has been opened — the astrologer will reach you shortly.`);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => {
              setStep("form");
              setStatusMsg("Payment was cancelled. You can try again.");
              resolve();
            },
          },
        });
        rzp.open();
      });
    } catch (err) {
      setStep("form");
      setStatusMsg(err instanceof Error ? err.message : "Payment failed. Please try again.");
    }
  });

  const inputClass =
    "mt-2 w-full rounded-2xl border border-sage/12 bg-white px-4 py-3 text-sm text-sage outline-none transition placeholder:text-sage/40 focus:border-gold";

  return (
    <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow backdrop-blur sm:p-8">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-display text-2xl font-semibold text-sage">Consultation Booking</h3>
        <p className="mt-2 text-sm text-sage/75">
          Fill your details, apply a coupon if you have one, then pay securely via Razorpay.
          The astrologer is notified on WhatsApp automatically after payment.
        </p>
      </div>

      {/* Success state */}
      {step === "success" && statusMsg ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">Booking confirmed!</p>
              <p className="mt-1">{statusMsg}</p>
              <p className="mt-3 flex items-center gap-2 font-medium text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Our team will reach you soon.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={onSubmit}>

          {/* Service + price + coupon */}
          <div className="rounded-[1.5rem] border border-gold/25 bg-gold/8 p-5">
            <label className="text-sm font-medium text-sage">
              Select Service <span className="text-ember">*</span>
              <select
                className={inputClass}
                {...form.register("selectedServiceId", {
                  onChange: () => {
                    setAppliedCoupon(null);
                    setCouponCode("");
                    setCouponError(null);
                  },
                })}
              >
                {config.services.map((service) => {
                  const dp = (service.discountPercent ?? 0) > 0
                    ? Math.round(service.price * (1 - (service.discountPercent ?? 0) / 100))
                    : service.price;
                  return (
                    <option key={service.id} value={service.id}>
                      {service.name} — Rs. {dp}{dp < service.price ? ` (was Rs. ${service.price})` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <FieldError message={form.formState.errors.selectedServiceId?.message} />

            {/* Price display */}
            <div className="mt-4">
              {totalSavings > 0 ? (
                <div>
                  <p className="text-sm text-sage/50 line-through">Rs. {basePrice}</p>
                  <p className="font-display text-3xl font-semibold text-sage">Rs. {finalPrice}</p>
                  <p className="mt-1 text-sm font-medium text-emerald-600">
                    You save Rs. {totalSavings}
                    {serviceDiscountPct > 0 && ` (${serviceDiscountPct}% service`}
                    {serviceDiscountPct > 0 && couponDiscountPct > 0 && ` + ${couponDiscountPct}% coupon`}
                    {serviceDiscountPct > 0 && ")"}
                    {serviceDiscountPct === 0 && couponDiscountPct > 0 && ` (${couponDiscountPct}% coupon)`}
                  </p>
                </div>
              ) : (
                <p className="font-display text-3xl font-semibold text-sage">Rs. {finalPrice}</p>
              )}
              <p className="mt-1 text-xs text-sage/60">{selectedService?.description}</p>
            </div>

            {/* Coupon */}
            <div className="mt-4 rounded-[1.25rem] border border-sage/10 bg-white/80 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-sage">
                <Tag className="h-4 w-4 text-gold" /> Have a coupon code?
              </p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">
                      {appliedCoupon.code} — {appliedCoupon.discountPercent}% off applied
                    </p>
                    {appliedCoupon.description ? (
                      <p className="text-xs text-emerald-600">{appliedCoupon.description}</p>
                    ) : null}
                  </div>
                  <button type="button" onClick={removeCoupon}
                    className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-white px-3 py-1 text-xs font-medium text-ember">
                    <XCircle className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-2xl border border-sage/12 bg-white px-4 py-2 text-sm text-sage outline-none placeholder:text-sage/40 focus:border-gold"
                  />
                  <button type="button" onClick={applyCoupon}
                    className="inline-flex items-center rounded-full bg-sage px-4 py-2 text-xs font-semibold text-ivory">
                    Apply
                  </button>
                </div>
              )}
              {couponError ? <p className="mt-2 text-xs text-ember">{couponError}</p> : null}
            </div>
          </div>

          {/* Personal details */}
          <RequiredInput label="Full Name" placeholder="Enter your full name"
            register={form.register("fullName")} className={inputClass} />
          <FieldError message={form.formState.errors.fullName?.message} />

          <RequiredInput label="Email" placeholder="Enter your email address"
            register={form.register("email")} className={inputClass} />
          <FieldError message={form.formState.errors.email?.message} />

          <RequiredInput label="Phone Number" placeholder="Enter your phone number"
            register={form.register("phoneNumber")} className={inputClass} />
          <FieldError message={form.formState.errors.phoneNumber?.message} />

          {requiresBirthDetails ? (
            <>
              <RequiredInput label="Date of Birth" type="date"
                register={form.register("dob")} className={inputClass} />
              <FieldError message={form.formState.errors.dob?.message} />

              <RequiredInput label="Time of Birth" type="time"
                register={form.register("tob")} className={inputClass} />
              <FieldError message={form.formState.errors.tob?.message} />

              <RequiredInput label="Place of Birth" placeholder="Enter your place of birth"
                register={form.register("pob")} className={inputClass} />
              <FieldError message={form.formState.errors.pob?.message} />
            </>
          ) : null}

          <label className="text-sm font-medium text-sage">
            Additional Message
            <textarea
              className={`${inputClass} min-h-24 resize-none`}
              placeholder="Anything you want to share before the consultation"
              {...form.register("message")}
            />
          </label>

          {/* Error / cancel message */}
          {statusMsg && step === "form" ? (
            <p className="rounded-2xl border border-ember/20 bg-ember/5 px-4 py-3 text-sm text-ember">
              {statusMsg}
            </p>
          ) : null}

          {/* Pay button */}
          <button
            type="submit"
            disabled={step === "paying"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-4 text-base font-semibold text-ivory shadow-glow transition hover:bg-sage/88 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {step === "paying" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Opening payment…
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Pay Rs. {finalPrice} via Razorpay
              </>
            )}
          </button>

          <p className="text-center text-xs text-sage/55">
            Secured by Razorpay · UPI · Cards · Net Banking · Wallets accepted
          </p>
        </form>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-ember">{message}</p>;
}

function RequiredInput({
  label, placeholder, type = "text", register, className,
}: {
  label: string; placeholder?: string; type?: string;
  register: UseFormRegisterReturn; className: string;
}) {
  return (
    <label className="text-sm font-medium text-sage">
      {label} <span className="text-ember">*</span>
      <input type={type} className={className} placeholder={placeholder} {...register} />
    </label>
  );
}
