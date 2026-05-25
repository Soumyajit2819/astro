"use client";

import type { ServiceItem } from "@/lib/site-config";
import { insertRows } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Star } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";

const feedbackSchema = z.object({
  fullName: z.string().min(2, "Please enter your name."),
  email: z.string().email("Please enter a valid email."),
  consultationType: z.string().min(2, "Please mention the consultation or service."),
  rating: z.coerce.number().min(1, "Please select a rating.").max(5, "Please select a rating."),
  feedback: z.string().min(10, "Please write a little feedback.")
});

type FeedbackValues = z.infer<typeof feedbackSchema>;
type InsertedFeedbackRow = {
  id?: number;
  full_name?: string;
  consultation_type?: string;
  feedback_text?: string;
  rating?: number;
};

export function FeedbackForm({
  services,
  onSubmitted
}: {
  services: ServiceItem[];
  onSubmitted?: (item: { id: string; name: string; service: string; quote: string; rating: number }) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      fullName: "",
      email: "",
      consultationType: services[0]?.name ?? "",
      rating: 5,
      feedback: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setStatus(null);

    try {
      let insertedRows: InsertedFeedbackRow[] = [];

      try {
        insertedRows = await insertRows("feedback", [
          {
            full_name: values.fullName,
            email: values.email,
            consultation_type: values.consultationType,
            feedback_text: values.feedback,
            rating: values.rating
          }
        ]);
      } catch {
        insertedRows = await insertRows("feedback", [
          {
            full_name: values.fullName,
            email: values.email,
            consultation_type: values.consultationType,
            feedback_text: values.feedback
          }
        ]);
      }

      const inserted = insertedRows[0];
      onSubmitted?.({
        id: String(inserted?.id ?? Date.now()),
        name: inserted?.full_name || values.fullName,
        service: inserted?.consultation_type || values.consultationType,
        quote: inserted?.feedback_text || values.feedback,
        rating: Number(inserted?.rating || values.rating || 5)
      });

      form.reset();
      setStatus("Thank you. Your feedback has been submitted successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit feedback right now.");
    } finally {
      setSaving(false);
    }
  });

  const inputClass =
    "mt-2 w-full rounded-2xl border border-sage/12 bg-white/85 px-4 py-3 text-sm text-sage outline-none transition placeholder:text-sage/40 focus:border-gold";

  return (
    <div className="rounded-[2rem] border border-sage/10 bg-white/80 p-6 shadow-glow">
      <h3 className="font-display text-2xl text-sage">Share Feedback After Consultation</h3>
      <p className="mt-2 text-sm text-sage/75">
        After your reading or class, you can send feedback here for the team.
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <RequiredInput label="Name" placeholder="Your full name" register={form.register("fullName")} className={inputClass} />
        <FieldError message={form.formState.errors.fullName?.message} />

        <RequiredInput label="Email" placeholder="Your email" register={form.register("email")} className={inputClass} />
        <FieldError message={form.formState.errors.email?.message} />

        <label className="text-sm font-medium text-sage">
          Consultation / Service <span className="text-ember">*</span>
          <select className={inputClass} {...form.register("consultationType")}>
            {services.map((service) => (
              <option key={service.id} value={service.name}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
        <FieldError message={form.formState.errors.consultationType?.message} />

        <label className="text-sm font-medium text-sage">
          Rating <span className="text-ember">*</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = form.watch("rating") === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => form.setValue("rating", value, { shouldValidate: true, shouldDirty: true })}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    selected ? "border-gold bg-gold/15 text-sage" : "border-sage/12 bg-white/70 text-sage/75"
                  }`}
                >
                  <Star className={`h-4 w-4 ${selected ? "fill-gold text-gold" : "text-gold"}`} />
                  {value}
                </button>
              );
            })}
          </div>
        </label>
        <FieldError message={form.formState.errors.rating?.message} />

        <label className="text-sm font-medium text-sage">
          Feedback <span className="text-ember">*</span>
          <textarea
            className={`${inputClass} min-h-28 resize-none`}
            placeholder="Share your experience"
            {...form.register("feedback")}
          />
        </label>
        <FieldError message={form.formState.errors.feedback?.message} />

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-sage px-6 py-3 font-semibold text-ivory transition hover:bg-sage/90 disabled:opacity-60"
        >
          {saving ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>

      {status ? (
        <div className="mt-5 flex items-start gap-3 rounded-3xl border border-gold/25 bg-gold/10 p-4 text-sm text-sage">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-gold" />
          <p>{status}</p>
        </div>
      ) : null}
    </div>
  );
}

function RequiredInput({
  label,
  placeholder,
  register,
  className
}: {
  label: string;
  placeholder: string;
  register: UseFormRegisterReturn;
  className: string;
}) {
  return (
    <label className="text-sm font-medium text-sage">
      {label} <span className="text-ember">*</span>
      <input className={className} placeholder={placeholder} {...register} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="-mt-2 text-xs text-ember">{message}</p>;
}
