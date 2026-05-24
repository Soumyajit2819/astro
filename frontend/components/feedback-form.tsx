"use client";

import { insertRows } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";

const feedbackSchema = z.object({
  fullName: z.string().min(2, "Please enter your name."),
  email: z.string().email("Please enter a valid email."),
  consultationType: z.string().min(2, "Please mention the consultation or service."),
  feedback: z.string().min(10, "Please write a little feedback.")
});

type FeedbackValues = z.infer<typeof feedbackSchema>;

export function FeedbackForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      fullName: "",
      email: "",
      consultationType: "",
      feedback: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setStatus(null);

    try {
      await insertRows("feedback", [
        {
          full_name: values.fullName,
          email: values.email,
          consultation_type: values.consultationType,
          feedback_text: values.feedback
        }
      ]);

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

        <RequiredInput
          label="Consultation / Service"
          placeholder="Example: Career Consultation"
          register={form.register("consultationType")}
          className={inputClass}
        />
        <FieldError message={form.formState.errors.consultationType?.message} />

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
