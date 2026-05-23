"use client";

import type { ReactNode } from "react";
import type { AstrologerItem, SiteConfig } from "@/lib/site-config";
import { uploadPublicFile } from "@/lib/supabase";
import { useSiteConfig } from "@/lib/use-site-config";
import { AlertCircle, LogOut, Plus, RotateCcw, Save, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AdminShell() {
  const { config, saveConfig, resetConfig, ready, loading, error, reload } = useSiteConfig();
  const [draft, setDraft] = useState<SiteConfig | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const workingConfig = draft ?? config;

  if (!ready) {
    return <div className="min-h-screen bg-midnight" />;
  }

  const updateRootField = (
    field: keyof Pick<SiteConfig, "brandName" | "heroTagline" | "heroTitle" | "heroDescription">,
    value: string
  ) => {
    setDraft({
      ...workingConfig,
      [field]: value
    });
  };

  const updateAstrologer = (index: number, nextItem: AstrologerItem) => {
    const next = [...workingConfig.astrologers];
    next[index] = nextItem;
    setDraft({ ...workingConfig, astrologers: next });
  };

  const removeAstrologer = (index: number) => {
    setDraft({
      ...workingConfig,
      astrologers: workingConfig.astrologers.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const updateService = (index: number, nextItem: SiteConfig["services"][number]) => {
    const next = [...workingConfig.services];
    next[index] = nextItem;
    setDraft({ ...workingConfig, services: next });
  };

  const removeService = (index: number) => {
    setDraft({
      ...workingConfig,
      services: workingConfig.services.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const updateSchedule = (index: number, nextItem: SiteConfig["schedule"][number]) => {
    const next = [...workingConfig.schedule];
    next[index] = nextItem;
    setDraft({ ...workingConfig, schedule: next });
  };

  const removeSchedule = (index: number) => {
    setDraft({
      ...workingConfig,
      schedule: workingConfig.schedule.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const updateFaq = (index: number, nextItem: SiteConfig["faqs"][number]) => {
    const next = [...workingConfig.faqs];
    next[index] = nextItem;
    setDraft({ ...workingConfig, faqs: next });
  };

  const removeFaq = (index: number) => {
    setDraft({
      ...workingConfig,
      faqs: workingConfig.faqs.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const handleSave = async () => {
    setStatus(null);
    const result = await saveConfig(workingConfig);
    if (result.ok) {
      setDraft(null);
      setStatus(result.warning ?? "Saved to Supabase successfully. All users will now see the updated content.");
      await reload();
      return;
    }

    setStatus(result.error ?? "Unable to save changes.");
  };

  const handleReset = async () => {
    setStatus(null);
    await resetConfig();
    setDraft(null);
    setStatus("Reset to default content and pushed to Supabase.");
    await reload();
  };

  const handleLogout = async () => {
    await fetch("/api/admin-auth", { method: "DELETE" });
    window.location.href = "/admin-login";
  };

  const handleImageUpload = async (index: number, file: File | null) => {
    if (!file) {
      return;
    }

    setStatus(null);
    try {
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "astrologer-images";
      const extension = file.name.split(".").pop() || "jpg";
      const path = `astrologers/${Date.now()}-${index}.${extension}`;
      const publicUrl = await uploadPublicFile(bucket, path, file);
      updateAstrologer(index, {
        ...workingConfig.astrologers[index],
        photoUrl: publicUrl
      });
      setStatus("Image uploaded to Supabase Storage. Click Save to Supabase to store the image URL in the astrologers table.");
    } catch (uploadError) {
      setStatus(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    }
  };

  return (
    <div className="min-h-screen bg-midnight text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-3xl">Admin Content Manager</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              This page edits live Supabase data. After saving here, the public website updates for every user, not
              just this browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-white/10 px-5 py-3 text-sm text-white">
              View Public Site
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-stardust px-5 py-3 text-sm font-semibold text-midnight disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save to Supabase
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-white disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-white"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>

        {status ? (
          <div className="mt-6 rounded-3xl border border-stardust/20 bg-stardust/10 p-4 text-sm text-stardust">{status}</div>
        ) : null}

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-3xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <EditorCard title="Brand & Hero">
              <EditorInput label="Brand name" value={workingConfig.brandName} onChange={(value) => updateRootField("brandName", value)} />
              <EditorInput label="Hero tagline" value={workingConfig.heroTagline} onChange={(value) => updateRootField("heroTagline", value)} />
              <EditorInput label="Hero title" value={workingConfig.heroTitle} onChange={(value) => updateRootField("heroTitle", value)} />
              <EditorTextarea
                label="Hero description"
                value={workingConfig.heroDescription}
                onChange={(value) => updateRootField("heroDescription", value)}
              />
            </EditorCard>

            <CollectionEditor
              title="Astrologers"
              description="These rows are saved to the Supabase astrologers table. The first astrologer is shown as the main featured profile on the homepage."
              items={workingConfig.astrologers}
              onAdd={() =>
                setDraft({
                  ...workingConfig,
                  astrologers: [
                    ...workingConfig.astrologers,
                    {
                      id: `astrologer-${Date.now()}`,
                      name: "New Astrologer",
                      title: "Astrologer",
                      bio: "",
                      experience: "",
                      phone: "",
                      whatsapp: "",
                      photoUrl: "",
                      upiId: "",
                      instagram: "",
                      youtube: "",
                      facebook: "",
                      address: ""
                    }
                  ]
                })
              }
              renderItem={(item, index) => (
                <div className="grid gap-3 rounded-3xl border border-white/10 bg-midnight/30 p-4">
                  <EditorInput label="Name" value={item.name} onChange={(value) => updateAstrologer(index, { ...item, name: value })} />
                  <EditorInput label="Title" value={item.title} onChange={(value) => updateAstrologer(index, { ...item, title: value })} />
                  <EditorTextarea label="Bio" value={item.bio} onChange={(value) => updateAstrologer(index, { ...item, bio: value })} />
                  <EditorInput
                    label="Experience"
                    value={item.experience}
                    onChange={(value) => updateAstrologer(index, { ...item, experience: value })}
                  />
                  <EditorInput label="Phone" value={item.phone} onChange={(value) => updateAstrologer(index, { ...item, phone: value })} />
                  <EditorInput
                    label="WhatsApp"
                    value={item.whatsapp}
                    onChange={(value) => updateAstrologer(index, { ...item, whatsapp: value })}
                  />
                  <EditorInput
                    label="Photo URL"
                    value={item.photoUrl}
                    onChange={(value) => updateAstrologer(index, { ...item, photoUrl: value })}
                  />
                  <label className="text-sm text-slate-300">
                    Upload astrologer photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handleImageUpload(index, event.target.files?.[0] ?? null)}
                      className="mt-2 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-stardust file:px-4 file:py-2 file:text-sm file:font-semibold file:text-midnight"
                    />
                  </label>
                  <p className="text-xs text-slate-400">
                    This uploads to the Supabase Storage bucket in <code>NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET</code>.
                  </p>
                  <EditorInput label="UPI ID" value={item.upiId} onChange={(value) => updateAstrologer(index, { ...item, upiId: value })} />
                  <EditorInput
                    label="Instagram"
                    value={item.instagram}
                    onChange={(value) => updateAstrologer(index, { ...item, instagram: value })}
                  />
                  <EditorInput
                    label="YouTube"
                    value={item.youtube}
                    onChange={(value) => updateAstrologer(index, { ...item, youtube: value })}
                  />
                  <EditorInput
                    label="Facebook"
                    value={item.facebook}
                    onChange={(value) => updateAstrologer(index, { ...item, facebook: value })}
                  />
                  <EditorTextarea
                    label="Address"
                    value={item.address}
                    onChange={(value) => updateAstrologer(index, { ...item, address: value })}
                  />
                  <DeleteButton onClick={() => removeAstrologer(index)} />
                </div>
              )}
            />
          </div>

          <div className="space-y-8">
            <CollectionEditor
              title="Services and Prices"
              description="These rows are saved to the services table."
              items={workingConfig.services}
              onAdd={() =>
                setDraft({
                  ...workingConfig,
                  services: [
                    ...workingConfig.services,
                    {
                      id: `service-${Date.now()}`,
                      name: "New Service",
                      price: 1000,
                      description: "",
                      type: "consultation"
                    }
                  ]
                })
              }
              renderItem={(item, index) => (
                <div className="grid gap-3 rounded-3xl border border-white/10 bg-midnight/30 p-4">
                  <EditorInput label="Name" value={item.name} onChange={(value) => updateService(index, { ...item, name: value })} />
                  <EditorTextarea
                    label="Description"
                    value={item.description}
                    onChange={(value) => updateService(index, { ...item, description: value })}
                  />
                  <EditorInput
                    label="Price"
                    value={String(item.price)}
                    onChange={(value) => updateService(index, { ...item, price: Number(value) || 0 })}
                  />
                  <label className="text-sm text-slate-300">
                    Type
                    <select
                      value={item.type}
                      onChange={(event) => updateService(index, { ...item, type: event.target.value as "consultation" | "class" })}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="consultation" className="bg-nebula">
                        consultation
                      </option>
                      <option value="class" className="bg-nebula">
                        class
                      </option>
                    </select>
                  </label>
                  <DeleteButton onClick={() => removeService(index)} />
                </div>
              )}
            />

            <CollectionEditor
              title="Class Schedule"
              description="These rows are saved to the schedule table."
              items={workingConfig.schedule}
              onAdd={() =>
                setDraft({
                  ...workingConfig,
                  schedule: [
                    ...workingConfig.schedule,
                    {
                      id: `schedule-${Date.now()}`,
                      className: "New Batch",
                      teacher: "",
                      classDate: "",
                      classTime: "",
                      courseDuration: "",
                      type: "Theory",
                      mode: "",
                      platform: ""
                    }
                  ]
                })
              }
              renderItem={(item, index) => (
                <div className="grid gap-3 rounded-3xl border border-white/10 bg-midnight/30 p-4">
                  <EditorInput
                    label="Class name"
                    value={item.className}
                    onChange={(value) => updateSchedule(index, { ...item, className: value })}
                  />
                  <EditorInput label="Teacher" value={item.teacher} onChange={(value) => updateSchedule(index, { ...item, teacher: value })} />
                  <EditorInput
                    label="Class date / day"
                    value={item.classDate}
                    onChange={(value) => updateSchedule(index, { ...item, classDate: value })}
                  />
                  <EditorInput
                    label="Class time"
                    value={item.classTime}
                    onChange={(value) => updateSchedule(index, { ...item, classTime: value })}
                  />
                  <EditorInput
                    label="Course duration"
                    value={item.courseDuration}
                    onChange={(value) => updateSchedule(index, { ...item, courseDuration: value })}
                  />
                  <EditorInput label="Type" value={item.type} onChange={(value) => updateSchedule(index, { ...item, type: value })} />
                  <EditorInput label="Mode" value={item.mode} onChange={(value) => updateSchedule(index, { ...item, mode: value })} />
                  <EditorInput
                    label="Platform"
                    value={item.platform}
                    onChange={(value) => updateSchedule(index, { ...item, platform: value })}
                  />
                  <DeleteButton onClick={() => removeSchedule(index)} />
                </div>
              )}
            />

            <CollectionEditor
              title="FAQ"
              description="These rows are saved to the faq table."
              items={workingConfig.faqs}
              onAdd={() =>
                setDraft({
                  ...workingConfig,
                  faqs: [...workingConfig.faqs, { id: `faq-${Date.now()}`, question: "", answer: "" }]
                })
              }
              renderItem={(item, index) => (
                <div className="grid gap-3 rounded-3xl border border-white/10 bg-midnight/30 p-4">
                  <EditorInput
                    label="Question"
                    value={item.question}
                    onChange={(value) => updateFaq(index, { ...item, question: value })}
                  />
                  <EditorTextarea label="Answer" value={item.answer} onChange={(value) => updateFaq(index, { ...item, answer: value })} />
                  <DeleteButton onClick={() => removeFaq(index)} />
                </div>
              )}
            />
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          <p className="font-semibold text-white">Important note for UPI and social links</p>
          <p className="mt-2">
            If your current <code>astrologers</code> table only has <code>name</code>, <code>bio</code>, <code>experience</code>, <code>phone</code>, <code>whatsapp</code>, and <code>photo_url</code>, those fields will save immediately.
          </p>
          <p className="mt-2">
            To also save <code>title</code>, <code>upi_id</code>, <code>instagram</code>, <code>youtube</code>, <code>facebook</code>, and <code>address</code>, add those columns in Supabase.
          </p>
        </div>
      </div>
    </div>
  );
}

function EditorCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <div className="mt-6 grid gap-4">{children}</div>
    </section>
  );
}

function CollectionEditor<T>({
  title,
  description,
  items,
  onAdd,
  renderItem
}: {
  title: string;
  description: string;
  items: T[];
  onAdd: () => void;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white"
        >
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>
      <div className="mt-6 grid gap-4">
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    </section>
  );
}

function EditorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
      />
    </label>
  );
}

function EditorTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
      />
    </label>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-rose-400/30 px-4 py-2 text-sm text-rose-200">
      Delete
    </button>
  );
}
