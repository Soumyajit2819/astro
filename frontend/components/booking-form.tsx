"use client";

import type { SiteConfig } from "@/lib/site-config";
import { insertRows } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CreditCard, Loader2, MessageCircle, ShieldCheck, Tag, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import type { CouponItem, ServiceItem } from "@/lib/site-config";

const BOOKING_DRAFT_STORAGE_KEY = "astro-booking-draft";

declare global {
  interface Window { Razorpay: new (o: RazorpayOptions) => RazorpayInstance; }
}
interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string;
  description: string; order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (r: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayResponse {
  razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
}
interface RazorpayInstance { open: () => void; }

/* ── Form type based on service price ──────────────────────
   "own"    = single DOB/TOB/POB (Rs. 230, 797, 1132 …)
   "couple" = boy + girl DOB/TOB/POB (Rs. 571)
   "class"  = email only, no birth details
   ────────────────────────────────────────────────────────── */
type FormType = "own" | "couple" | "class";

function getFormType(service: ServiceItem | undefined): FormType {
  if (!service) return "own";
  if (service.type === "class") return "class";
  // Couple / compatibility services — typically marriage/kundali match at Rs. 571
  const price = service.price;
  const name = service.name.toLowerCase();
  const desc = service.description.toLowerCase();
  if (
    price === 571 ||
    name.includes("marriage") || name.includes("kundali") ||
    name.includes("compatibility") || name.includes("couple") ||
    desc.includes("compatibility") || desc.includes("boy") || desc.includes("girl")
  ) return "couple";
  return "own";
}

const baseSchema = z.object({
  fullName:    z.string().min(2, "Please enter your name."),
  phoneNumber: z.string().min(10, "Please enter a valid phone number."),
  email:       z.string().email("Please enter a valid email."),
  // own
  dob: z.string().optional(),
  tob: z.string().optional(),
  pob: z.string().optional(),
  // couple — boy
  boyDob: z.string().optional(),
  boyTob: z.string().optional(),
  boyPob: z.string().optional(),
  // couple — girl
  girlDob: z.string().optional(),
  girlTob: z.string().optional(),
  girlPob: z.string().optional(),
  message: z.string().optional(),
});

type BookingFormValues = z.infer<typeof baseSchema>;

export function BookingForm({ config, initialServiceId }: {
  config: SiteConfig; initialServiceId?: string;
}) {
  const [step, setStep] = useState<"form" | "paying" | "success">("form");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    serviceName: string; amount: number; paymentId: string;
    userName: string; whatsappUrl: string;
  } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponItem | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [activeServiceId, setActiveServiceId] = useState<string>(
    initialServiceId ?? config.services[0]?.id ?? ""
  );

  useEffect(() => {
    if (initialServiceId) {
      setActiveServiceId(initialServiceId);
      setAppliedCoupon(null); setCouponCode(""); setCouponError(null);
    }
  }, [initialServiceId]);

  const selectedService = config.services.find((s) => s.id === activeServiceId) ?? config.services[0];
  const formType = getFormType(selectedService);
  const mainAstrologer = config.astrologers[0];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bookingSchema = useMemo(() => baseSchema, []);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      fullName: "", phoneNumber: "", email: "",
      dob: "", tob: "", pob: "",
      boyDob: "", boyTob: "", boyPob: "",
      girlDob: "", girlTob: "", girlPob: "",
      message: "",
    },
  });

  // Price
  const basePrice = selectedService?.price ?? 0;
  const svcDiscount = selectedService?.discountPercent ?? 0;
  const priceAfterSvc = svcDiscount > 0 ? Math.round(basePrice * (1 - svcDiscount / 100)) : basePrice;
  const couponDiscount = appliedCoupon?.discountPercent ?? 0;
  const finalPrice = couponDiscount > 0 ? Math.round(priceAfterSvc * (1 - couponDiscount / 100)) : priceAfterSvc;
  const totalSavings = basePrice - finalPrice;

  const skipDraftRef = useRef(false);

  // Draft restore
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved) as Partial<BookingFormValues & { serviceId: string }>;
      if (d.fullName || d.email || d.phoneNumber) {
        form.reset({ ...d, message: d.message ?? "" });
        if (d.serviceId) setActiveServiceId(d.serviceId);
      }
    } catch { window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draft auto-save
  useEffect(() => {
    const sub = form.watch((values) => {
      if (typeof window === "undefined" || skipDraftRef.current) { skipDraftRef.current = false; return; }
      if (values.fullName || values.email || values.phoneNumber)
        window.localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify({ ...values, serviceId: activeServiceId }));
    });
    return () => sub.unsubscribe();
  }, [form, activeServiceId]);

  // Razorpay script
  useEffect(() => {
    if (document.getElementById("razorpay-script")) return;
    const s = document.createElement("script");
    s.id = "razorpay-script"; s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true;
    document.body.appendChild(s);
  }, []);

  const applyCoupon = () => {
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError("Enter a coupon code first."); return; }
    const match = (config.coupons ?? []).find((c) => c.code.toUpperCase() === code && c.active);
    if (!match) { setAppliedCoupon(null); setCouponError("Invalid or expired coupon code."); return; }
    setAppliedCoupon(match);
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(""); setCouponError(null); };

  const validateFields = (values: BookingFormValues): string | null => {
    if (formType === "own") {
      if (!values.dob) return "Your date of birth is required.";
      if (!values.tob) return "Your time of birth is required.";
      if (!values.pob || values.pob.length < 2) return "Your place of birth is required.";
    }
    if (formType === "couple") {
      if (!values.boyDob) return "Boy's date of birth is required.";
      if (!values.boyTob) return "Boy's time of birth is required.";
      if (!values.boyPob || values.boyPob.length < 2) return "Boy's place of birth is required.";
      if (!values.girlDob) return "Girl's date of birth is required.";
      if (!values.girlTob) return "Girl's time of birth is required.";
      if (!values.girlPob || values.girlPob.length < 2) return "Girl's place of birth is required.";
    }
    return null;
  };

  const buildWhatsAppLines = (values: BookingFormValues, service: ServiceItem, paymentId: string) => {
    const lines = [
      `🙏 *New Booking — AstroVerse*`, ``,
      `✅ Payment confirmed via Razorpay`, ``,
      `*Service:* ${service.name}`,
      `*Amount Paid:* Rs. ${finalPrice}${totalSavings > 0 ? ` _(saved Rs. ${totalSavings})_` : ""}`,
      ...(appliedCoupon ? [`*Coupon:* ${appliedCoupon.code} (${appliedCoupon.discountPercent}% off)`] : []),
      `*Payment ID:* ${paymentId}`, ``,
      `*Client Details*`,
      `Name: ${values.fullName}`,
      `Phone: ${values.phoneNumber}`,
      `Email: ${values.email}`,
    ];
    if (formType === "own") {
      lines.push(``, `*Birth Details*`,
        `Date of Birth: ${values.dob}`,
        `Time of Birth: ${values.tob}`,
        `Place of Birth: ${values.pob}`);
    }
    if (formType === "couple") {
      lines.push(``, `*Boy's Birth Details*`,
        `Date of Birth: ${values.boyDob}`,
        `Time of Birth: ${values.boyTob}`,
        `Place of Birth: ${values.boyPob}`,
        ``, `*Girl's Birth Details*`,
        `Date of Birth: ${values.girlDob}`,
        `Time of Birth: ${values.girlTob}`,
        `Place of Birth: ${values.girlPob}`);
    }
    if (formType === "class") {
      lines.push(``, `_Class enrollment — please add to the WhatsApp group and share class schedule._`);
    } else {
      lines.push(``, `_Payment verified. Please reach out to schedule the consultation._`);
    }
    if (values.message) lines.push(``, `*Message:* ${values.message}`);
    return lines;
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const validErr = validateFields(values);
    if (validErr) { setStatusMsg(validErr); return; }
    const service = selectedService;
    if (!service) return;
    setStep("paying"); setStatusMsg(null);
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalPrice, currency: "INR", receipt: `booking_${Date.now()}` }),
      });
      if (!orderRes.ok) { const e = await orderRes.json(); throw new Error(e.error ?? "Order creation failed."); }
      const order = await orderRes.json();
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId || typeof window.Razorpay === "undefined")
        throw new Error("Razorpay is not loaded. Please refresh and try again.");
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId, amount: order.amount, currency: order.currency,
          name: "AstroVerse", description: service.name, order_id: order.id,
          prefill: { name: values.fullName, email: values.email, contact: values.phoneNumber },
          theme: { color: "#52624f" },
          handler: async (response) => {
            try {
              const vr = await fetch("/api/payments/verify", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
              const verified = await vr.json();
              if (!verified.verified) throw new Error("Payment verification failed.");
              await insertRows("payment_proofs", [{
                customer_name: values.fullName, email: values.email, phone_number: values.phoneNumber,
                service_name: service.name, amount: finalPrice, original_amount: basePrice,
                coupon_code: appliedCoupon?.code ?? null, coupon_discount_percent: appliedCoupon?.discountPercent ?? null,
                razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id,
                notes: values.message || "", status: "paid",
              }]);
              const lines = buildWhatsAppLines(values, service, response.razorpay_payment_id);
              const whatsappUrl = `https://wa.me/${mainAstrologer.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
              window.open(whatsappUrl, "_blank", "noopener,noreferrer");
              skipDraftRef.current = true;
              window.localStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
              setAppliedCoupon(null); setCouponCode("");
              form.reset({ fullName: "", phoneNumber: "", email: "", dob: "", tob: "", pob: "", boyDob: "", boyTob: "", boyPob: "", girlDob: "", girlTob: "", girlPob: "", message: "" });
              setSuccessData({ serviceName: service.name, amount: finalPrice, paymentId: response.razorpay_payment_id, userName: values.fullName, whatsappUrl });
              setStep("success"); resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => { setStep("form"); setStatusMsg("Payment cancelled. Try again."); resolve(); } },
        });
        rzp.open();
      });
    } catch (err) { setStep("form"); setStatusMsg(err instanceof Error ? err.message : "Payment failed."); }
  });

  const inputClass = "mt-2 w-full rounded-2xl border border-sage/12 bg-white px-4 py-3 text-sm text-sage outline-none transition placeholder:text-sage/40 focus:border-gold";

  return (
    <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-5 shadow-glow backdrop-blur sm:p-7">
      <h3 className="font-display text-xl font-semibold text-sage">Booking Details</h3>
      <p className="mt-1 text-sm text-sage/65">Fill your details and pay securely via Razorpay. Astrologer is notified on WhatsApp automatically.</p>

      {/* Service summary */}
      {selectedService && (
        <div className="mt-4 rounded-[1.5rem] border border-gold/25 bg-gold/8 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gold font-medium">{selectedService.type}</p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <p className="font-display text-lg font-semibold text-sage">{selectedService.name}</p>
            <div className="text-right shrink-0">
              {totalSavings > 0 && <p className="text-xs text-sage/40 line-through">Rs. {basePrice}</p>}
              <p className="font-display text-2xl font-semibold text-sage">Rs. {finalPrice}</p>
              {totalSavings > 0 && <p className="text-xs font-medium text-emerald-600">Save Rs. {totalSavings}</p>}
            </div>
          </div>
          <p className="mt-1 text-xs text-sage/60">{selectedService.description}</p>
          {/* Form type hint */}
          <p className="mt-2 text-xs text-gold font-medium">
            {formType === "class" && "📚 Class enrollment — no birth details needed"}
            {formType === "couple" && "💑 Compatibility consultation — both partner details needed"}
            {formType === "own" && "🔮 Personal consultation — your birth details needed"}
          </p>
        </div>
      )}

      {step === "success" && successData ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-7 text-center shadow-glow">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="font-display text-xl font-semibold text-sage">Thank you, {successData.userName.split(" ")[0]}! 🙏</h3>
            <p className="mt-1 text-sm text-sage/70">Booking confirmed for <strong>{successData.serviceName}</strong></p>
            <div className="mt-4 rounded-[1.25rem] border border-sage/10 bg-white/80 px-5 py-3 text-sm text-sage/80">
              <p>Amount paid: <strong className="text-sage">Rs. {successData.amount}</strong></p>
              <p className="mt-0.5 text-xs text-sage/50">Payment ID: {successData.paymentId}</p>
            </div>
            <div className="mt-4 rounded-[1.25rem] border border-gold/20 bg-gold/8 px-5 py-4 text-left">
              <p className="text-sm leading-7 text-sage/80">May the stars guide you toward clarity and purpose. Our astrologer will connect with you shortly. 🙏</p>
              <p className="mt-2 text-sm font-medium text-sage">Wishing you light, wisdom, and positive energy. ✨</p>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a href={successData.whatsappUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5d]">
                <MessageCircle className="h-4 w-4" /> Open WhatsApp
              </a>
              <button type="button" onClick={() => { setStep("form"); setSuccessData(null); setStatusMsg(null); }}
                className="inline-flex items-center justify-center rounded-full border border-sage/20 bg-white px-5 py-2.5 text-sm font-semibold text-sage transition hover:bg-ivory">
                Book Another
              </button>
            </div>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-sage/50">
            <ShieldCheck className="h-4 w-4 text-gold" /> Payment verified by Razorpay
          </p>
        </div>
      ) : (
        <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
          {/* Coupon */}
          <div className="rounded-[1.25rem] border border-sage/10 bg-white/80 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-sage"><Tag className="h-4 w-4 text-gold" /> Have a coupon code?</p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{appliedCoupon.code} — {appliedCoupon.discountPercent}% off</p>
                  {appliedCoupon.description && <p className="text-xs text-emerald-600">{appliedCoupon.description}</p>}
                </div>
                <button type="button" onClick={removeCoupon} className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-white px-3 py-1 text-xs font-medium text-ember">
                  <XCircle className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                  placeholder="Enter coupon code"
                  className="flex-1 rounded-2xl border border-sage/12 bg-white px-4 py-2 text-sm text-sage outline-none placeholder:text-sage/40 focus:border-gold" />
                <button type="button" onClick={applyCoupon} className="inline-flex items-center rounded-full bg-sage px-4 py-2 text-xs font-semibold text-ivory">Apply</button>
              </div>
            )}
            {couponError && <p className="mt-1.5 text-xs text-ember">{couponError}</p>}
          </div>

          {/* Base fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><RequiredInput label="Full Name" placeholder="Your full name" register={form.register("fullName")} className={inputClass} /><FieldError message={form.formState.errors.fullName?.message} /></div>
            <div><RequiredInput label="Phone Number" placeholder="10-digit number" register={form.register("phoneNumber")} className={inputClass} /><FieldError message={form.formState.errors.phoneNumber?.message} /></div>
          </div>
          <RequiredInput label="Email" placeholder="Your email address" register={form.register("email")} className={inputClass} />
          <FieldError message={form.formState.errors.email?.message} />

          {/* Own birth details */}
          {formType === "own" && (
            <div className="rounded-[1.25rem] border border-sage/10 bg-ivory/60 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gold font-medium">Your Birth Details</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><RequiredInput label="Date of Birth" type="date" register={form.register("dob")} className={inputClass} /></div>
                <div><RequiredInput label="Time of Birth" type="time" register={form.register("tob")} className={inputClass} /></div>
                <div><RequiredInput label="Place of Birth" placeholder="City / Town" register={form.register("pob")} className={inputClass} /></div>
              </div>
            </div>
          )}

          {/* Couple birth details */}
          {formType === "couple" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-sage/10 bg-blue-50/60 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-blue-500 font-medium">👦 Boy&apos;s Birth Details</p>
                <div className="grid gap-3">
                  <div><RequiredInput label="Date of Birth" type="date" register={form.register("boyDob")} className={inputClass} /></div>
                  <div><RequiredInput label="Time of Birth" type="time" register={form.register("boyTob")} className={inputClass} /></div>
                  <div><RequiredInput label="Place of Birth" placeholder="City / Town" register={form.register("boyPob")} className={inputClass} /></div>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-sage/10 bg-pink-50/60 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-pink-500 font-medium">👧 Girl&apos;s Birth Details</p>
                <div className="grid gap-3">
                  <div><RequiredInput label="Date of Birth" type="date" register={form.register("girlDob")} className={inputClass} /></div>
                  <div><RequiredInput label="Time of Birth" type="time" register={form.register("girlTob")} className={inputClass} /></div>
                  <div><RequiredInput label="Place of Birth" placeholder="City / Town" register={form.register("girlPob")} className={inputClass} /></div>
                </div>
              </div>
            </div>
          )}

          <label className="text-sm font-medium text-sage">
            Additional Message
            <textarea className={`${inputClass} min-h-20 resize-none`} placeholder="Anything you want to share" {...form.register("message")} />
          </label>

          {statusMsg && step === "form" && (
            <p className="rounded-2xl border border-ember/20 bg-ember/5 px-4 py-3 text-sm text-ember">{statusMsg}</p>
          )}

          <button type="submit" disabled={step === "paying"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 py-4 text-base font-semibold text-ivory shadow-glow transition hover:bg-sage/88 disabled:cursor-not-allowed disabled:opacity-60">
            {step === "paying" ? (<><Loader2 className="h-5 w-5 animate-spin" /> Opening payment…</>) : (<><CreditCard className="h-5 w-5" /> Pay Rs. {finalPrice} via Razorpay</>)}
          </button>
          <p className="text-center text-xs text-sage/50">Secured by Razorpay · UPI · Cards · Net Banking · Wallets</p>
        </form>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-ember">{message}</p>;
}

function RequiredInput({ label, placeholder, type = "text", register, className }: {
  label: string; placeholder?: string; type?: string; register: UseFormRegisterReturn; className: string;
}) {
  return (
    <label className="text-sm font-medium text-sage">
      {label} <span className="text-ember">*</span>
      <input type={type} className={className} placeholder={placeholder} {...register} />
    </label>
  );
}
