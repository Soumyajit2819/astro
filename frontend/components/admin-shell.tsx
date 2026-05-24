"use client";

import type { ReactNode } from "react";
import type { AstrologerItem, SiteConfig } from "@/lib/site-config";
import { selectRows, updateRow, uploadPublicFile } from "@/lib/supabase";
import { useSiteConfig } from "@/lib/use-site-config";
import { AlertCircle, CheckCircle2, ExternalLink, LogOut, Plus, RefreshCcw, RotateCcw, Save, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type PaymentProofRow = {
  id?: number;
  customer_name?: string;
  email?: string;
  phone_number?: string;
  service_name?: string;
  amount?: number | string;
  payment_screenshot_url?: string;
  notes?: string;
  status?: string;
  created_at?: string;
};

export function AdminShell() {
  const { config, saveConfig, resetConfig, ready, loading, error, reload } = useSiteConfig();
  const [draft, setDraft] = useState<SiteConfig | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<PaymentProofRow[]>([]);
  const [paymentProofError, setPaymentProofError] = useState<string | null>(null);
  const [paymentProofLoading, setPaymentProofLoading] = useState(false);
  const [proofActionId, setProofActionId] = useState<number | null>(null);

  const workingConfig = draft ?? config;

  const loadPaymentProofs = async () => {
    setPaymentProofLoading(true);
    setPaymentProofError(null);

    try {
      const rows = await selectRows<PaymentProofRow>("payment_proofs");
      const sortedRows = [...rows].sort((left, right) => (right.created_at || "").localeCompare(left.created_at || ""));
      setPaymentProofs(sortedRows);
    } catch (loadError) {
      setPaymentProofError(
        loadError instanceof Error
          ? `${loadError.message} Create the payment_proofs table to review uploaded screenshots here.`
          : "Unable to load payment proofs."
      );
      setPaymentProofs([]);
    } finally {
      setPaymentProofLoading(false);
    }
  };

  useEffect(() => {
    void loadPaymentProofs();
  }, []);

  const handlePaymentProofDecision = async (proofId: number | undefined, nextStatus: "accepted" | "rejected") => {
    if (!proofId) {
      return;
    }

    setProofActionId(proofId);
    setPaymentProofError(null);

    try {
      const updatedRows = await updateRow<PaymentProofRow>("payment_proofs", "id", proofId, { status: nextStatus });
      if (updatedRows.length === 0) {
        throw new Error("Supabase did not update this row. Apply the payment_proofs UPDATE policy in SQL, then try again.");
      }

      setPaymentProofs((current) => current.filter((proof) => proof.id !== proofId));
      setStatus(`Payment proof ${nextStatus}. It has been removed from the pending list.`);
    } catch (actionError) {
      setPaymentProofError(actionError instanceof Error ? actionError.message : "Unable to update payment proof status.");
    } finally {
      setProofActionId(null);
    }
  };

  if (!ready) {
    return <div className="min-h-screen bg-ivory" />;
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
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "astrologer-images";
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

  const handleServiceQrUpload = async (index: number, file: File | null) => {
    if (!file) {
      return;
    }

    setStatus(null);
    try {
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || "astrologer-images";
      const extension = file.name.split(".").pop() || "png";
      const path = `service-qr/${Date.now()}-${index}.${extension}`;
      const publicUrl = await uploadPublicFile(bucket, path, file);
      updateService(index, {
        ...workingConfig.services[index],
        paymentQrUrl: publicUrl
      });
      setStatus("Payment QR uploaded to Supabase Storage. Click Save to Supabase to store it for this service.");
    } catch (uploadError) {
      setStatus(uploadError instanceof Error ? uploadError.message : "QR upload failed.");
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-sage">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-sage/10 bg-white/85 p-6 shadow-glow lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-3xl text-sage">Admin Content Manager</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-sage/75">
              This page edits live Supabase data. After saving here, the public website updates for every user, not
              just this browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-sage/15 bg-ivory/60 px-5 py-3 text-sm font-medium text-sage">
              View Public Site
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-3 text-sm font-semibold text-ivory disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save to Supabase
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-sage/15 bg-white/70 px-5 py-3 text-sm font-medium text-sage disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-sage/15 bg-white/70 px-5 py-3 text-sm font-medium text-sage"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>

        {status ? (
          <div className="mt-6 rounded-3xl border border-gold/25 bg-gold/10 p-4 text-sm font-medium text-sage">{status}</div>
        ) : null}

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-3xl border border-ember/20 bg-ember/10 p-4 text-sm text-ember">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-sage/10 bg-white/85 p-6 shadow-glow">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl text-sage">Payment Proofs</h2>
                  <p className="mt-2 text-sm leading-6 text-sage/75">
                    Uploaded user screenshots appear here so the astrologer or admin can manually check the customer
                    name, selected service, amount, and proof image.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadPaymentProofs()}
                  className="inline-flex items-center gap-2 rounded-full border border-sage/15 bg-ivory/70 px-4 py-2 text-sm font-medium text-sage"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh Proofs
                </button>
              </div>

              {paymentProofLoading ? <p className="mt-4 text-sm text-sage/65">Loading uploaded payment proofs...</p> : null}
              {paymentProofError ? <p className="mt-4 text-sm text-ember">{paymentProofError}</p> : null}
              {!paymentProofLoading && !paymentProofError && paymentProofs.filter((proof) => (proof.status || "pending") === "pending").length === 0 ? (
                <p className="mt-4 text-sm text-sage/65">No payment proofs have been uploaded yet.</p>
              ) : null}

              {!paymentProofLoading && !paymentProofError && paymentProofs.length > 0 ? (
                <div className="mt-6 grid gap-4">
                  {paymentProofs
                    .filter((proof) => (proof.status || "pending") === "pending")
                    .map((proof, index) => (
                    <div key={proof.id ?? index} className="rounded-3xl border border-sage/10 bg-ivory/60 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-sage">{proof.customer_name || "Unnamed customer"}</p>
                          <p className="text-sm text-sage/70">{proof.service_name || "Unknown service"}</p>
                        </div>
                        <span className="inline-flex rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                          {proof.status || "pending"}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-sage/80">
                        <p>Email: {proof.email || "N/A"}</p>
                        <p>Phone: {proof.phone_number || "N/A"}</p>
                        <p>Amount: Rs. {proof.amount ?? "N/A"}</p>
                        <p>Uploaded: {proof.created_at ? new Date(proof.created_at).toLocaleString() : "N/A"}</p>
                        <p>Notes: {proof.notes || "N/A"}</p>
                      </div>
                      {proof.payment_screenshot_url ? (
                        <a
                          href={proof.payment_screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-ivory"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Screenshot
                        </a>
                      ) : null}
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          disabled={proofActionId === proof.id}
                          onClick={() => void handlePaymentProofDecision(proof.id, "accepted")}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-ivory disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={proofActionId === proof.id}
                          onClick={() => void handlePaymentProofDecision(proof.id, "rejected")}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-ember/25 bg-white/70 px-4 py-2 text-xs font-semibold text-ember disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

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
                <div className="grid gap-3 rounded-3xl border border-sage/10 bg-ivory/60 p-4">
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
                      className="mt-2 block w-full rounded-2xl border border-sage/10 bg-white px-4 py-3 text-sm text-sage file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sage"
                    />
                  </label>
                  <p className="text-xs leading-5 text-sage/65">
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
                      type: "consultation",
                      paymentQrUrl: "",
                      paymentUrl: ""
                    }
                  ]
                })
              }
              renderItem={(item, index) => (
                <div className="grid gap-3 rounded-3xl border border-sage/10 bg-ivory/60 p-4">
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
                  <EditorInput
                    label="Payment QR URL"
                    value={item.paymentQrUrl}
                    onChange={(value) => updateService(index, { ...item, paymentQrUrl: value })}
                  />
                  <EditorInput
                    label="Payment URL"
                    value={item.paymentUrl}
                    onChange={(value) => updateService(index, { ...item, paymentUrl: value })}
                  />
                  <label className="text-sm text-slate-300">
                    Upload payment QR
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void handleServiceQrUpload(index, event.target.files?.[0] ?? null)}
                      className="mt-2 block w-full rounded-2xl border border-sage/10 bg-white px-4 py-3 text-sm text-sage file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sage"
                    />
                  </label>
                  <label className="text-sm font-medium text-sage">
                    Type
                    <select
                      value={item.type}
                      onChange={(event) => updateService(index, { ...item, type: event.target.value as "consultation" | "class" })}
                      className="mt-2 w-full rounded-2xl border border-sage/10 bg-white px-4 py-3 text-sm text-sage outline-none"
                    >
                      <option value="consultation">
                        consultation
                      </option>
                      <option value="class">
                        class
                      </option>
                    </select>
                  </label>
                  <DeleteButton onClick={() => removeService(index)} />
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
                <div className="grid gap-3 rounded-3xl border border-sage/10 bg-ivory/60 p-4">
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

        <div className="mt-8 rounded-[2rem] border border-sage/10 bg-white/85 p-6 text-sm leading-6 text-sage/75 shadow-glow">
          <p className="font-semibold text-sage">Important note for UPI and social links</p>
          <p className="mt-2">
            If your current <code>astrologers</code> table only has <code>name</code>, <code>bio</code>, <code>experience</code>, <code>phone</code>, <code>whatsapp</code>, and <code>photo_url</code>, those fields will save immediately.
          </p>
          <p className="mt-2">
            To also save <code>title</code>, <code>upi_id</code>, <code>instagram</code>, <code>youtube</code>, <code>facebook</code>, and <code>address</code>, add those columns in Supabase.
          </p>
          <p className="mt-2">
            To save service-wise QR images for different prices, add <code>payment_qr_url</code> to the <code>services</code> table.
          </p>
          <p className="mt-2">
            To save direct per-service payment links, add <code>payment_url</code> to the <code>services</code> table.
          </p>
          <p className="mt-2">
            To review uploaded payment screenshots in admin, create a <code>payment_proofs</code> table using the new SQL setup file.
          </p>
        </div>
      </div>
    </div>
  );
}

function EditorCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-sage/10 bg-white/85 p-6 shadow-glow">
      <h2 className="font-display text-2xl text-sage">{title}</h2>
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
    <section className="rounded-[2rem] border border-sage/10 bg-white/85 p-6 shadow-glow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-sage">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-sage/75">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-full border border-sage/15 bg-ivory/70 px-4 py-2 text-sm font-medium text-sage"
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
    <label className="text-sm font-medium text-sage">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-sage/10 bg-white px-4 py-3 text-sm text-sage outline-none placeholder:text-sage/40"
      />
    </label>
  );
}

function EditorTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-sage">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-28 w-full rounded-2xl border border-sage/10 bg-white px-4 py-3 text-sm text-sage outline-none placeholder:text-sage/40"
      />
    </label>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-ember/30 bg-ember/5 px-4 py-2 text-sm font-medium text-ember">
      Delete
    </button>
  );
}
