"use client";

import { useCallback, useEffect, useState } from "react";
import { defaultSiteConfig, type AstrologerItem, type FaqItem, type ScheduleItem, type ServiceItem, type SiteConfig } from "./site-config";
import { deleteAllRows, insertRows, selectRows } from "./supabase";

type SaveResult = {
  ok: boolean;
  warning?: string;
  error?: string;
};

type AstrologerRow = {
  name?: string;
  title?: string;
  bio?: string;
  experience?: string;
  phone?: string;
  whatsapp?: string;
  photo_url?: string;
  upi_id?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  address?: string;
};

type ServiceRow = {
  title?: string;
  description?: string;
  price?: number | string;
  type?: string;
  payment_qr_url?: string;
  payment_url?: string;
};

type ScheduleRow = {
  class_name?: string;
  teacher?: string;
  class_date?: string;
  class_time?: string;
  course_duration?: string;
  type?: string;
  mode?: string;
  platform?: string;
};

type FaqRow = {
  question?: string;
  answer?: string;
};

function toSlug(value: string, fallback: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function mapAstrologers(rows: AstrologerRow[]): AstrologerItem[] {
  if (rows.length === 0) {
    return defaultSiteConfig.astrologers;
  }

  return rows.map((row, index) => ({
    id: `astrologer-${index + 1}-${toSlug(row.name ?? "", `${index + 1}`)}`,
    name: row.name || defaultSiteConfig.astrologers[0].name,
    title: row.title || defaultSiteConfig.astrologers[0].title,
    bio: row.bio || "",
    experience: row.experience || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || row.phone || "",
    photoUrl: row.photo_url || "",
    upiId: row.upi_id || defaultSiteConfig.astrologers[0].upiId,
    instagram: row.instagram || defaultSiteConfig.astrologers[0].instagram,
    youtube: row.youtube || defaultSiteConfig.astrologers[0].youtube,
    facebook: row.facebook || defaultSiteConfig.astrologers[0].facebook,
    address: row.address || defaultSiteConfig.astrologers[0].address
  }));
}

function mapServices(rows: ServiceRow[]): ServiceItem[] {
  if (rows.length === 0) {
    return defaultSiteConfig.services;
  }

  return rows.map((row, index) => ({
    id: `service-${index + 1}-${toSlug(row.title ?? "", `${index + 1}`)}`,
    name: row.title || `Service ${index + 1}`,
    description: row.description || "",
    price: Number(row.price || 0),
    type: row.type === "class" ? "class" : "consultation",
    paymentQrUrl: row.payment_qr_url || "",
    paymentUrl: row.payment_url || ""
  }));
}

function mapSchedule(rows: ScheduleRow[]): ScheduleItem[] {
  if (rows.length === 0) {
    return defaultSiteConfig.schedule;
  }

  return rows.map((row, index) => ({
    id: `schedule-${index + 1}-${toSlug(row.class_name ?? "", `${index + 1}`)}`,
    className: row.class_name || `Class ${index + 1}`,
    teacher: row.teacher || "",
    classDate: row.class_date || "",
    classTime: row.class_time || "",
    courseDuration: row.course_duration || "",
    type: row.type || "",
    mode: row.mode || "",
    platform: row.platform || ""
  }));
}

function mapFaq(rows: FaqRow[]): FaqItem[] {
  if (rows.length === 0) {
    return defaultSiteConfig.faqs;
  }

  return rows.map((row, index) => ({
    id: `faq-${index + 1}`,
    question: row.question || `Question ${index + 1}`,
    answer: row.answer || ""
  }));
}

function buildConfig(data: {
  astrologers: AstrologerRow[];
  services: ServiceRow[];
  schedule: ScheduleRow[];
  faqs: FaqRow[];
}): SiteConfig {
  return {
    ...defaultSiteConfig,
    astrologers: mapAstrologers(data.astrologers),
    services: mapServices(data.services),
    schedule: mapSchedule(data.schedule),
    faqs: mapFaq(data.faqs)
  };
}

function astrologerRowsBase(astrologers: AstrologerItem[]) {
  return astrologers.map((item) => ({
    name: item.name,
    bio: item.bio,
    experience: item.experience,
    phone: item.phone,
    whatsapp: item.whatsapp,
    photo_url: item.photoUrl
  }));
}

function astrologerRowsExtended(astrologers: AstrologerItem[]) {
  return astrologers.map((item) => ({
    name: item.name,
    title: item.title,
    bio: item.bio,
    experience: item.experience,
    phone: item.phone,
    whatsapp: item.whatsapp,
    photo_url: item.photoUrl,
    upi_id: item.upiId,
    instagram: item.instagram,
    youtube: item.youtube,
    facebook: item.facebook,
    address: item.address
  }));
}

function serviceRowsBase(services: ServiceItem[]) {
  return services.map((item) => ({
    title: item.name,
    description: item.description,
    price: item.price
  }));
}

function serviceRowsExtended(services: ServiceItem[]) {
  return services.map((item) => ({
    title: item.name,
    description: item.description,
    price: item.price,
    type: item.type,
    payment_qr_url: item.paymentQrUrl,
    payment_url: item.paymentUrl
  }));
}

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(defaultSiteConfig);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [astrologers, services, schedule, faqs] = await Promise.all([
        selectRows<AstrologerRow>("astrologers"),
        selectRows<ServiceRow>("services"),
        selectRows<ScheduleRow>("schedule"),
        selectRows<FaqRow>("faq")
      ]);

      setConfig(
        buildConfig({
          astrologers,
          services,
          schedule,
          faqs
        })
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Supabase content.");
      setConfig(defaultSiteConfig);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(
    async (nextConfig: SiteConfig): Promise<SaveResult> => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          deleteAllRows("astrologers", "name"),
          deleteAllRows("services", "title"),
          deleteAllRows("schedule", "class_name"),
          deleteAllRows("faq", "question")
        ]);

        let warning: string | undefined;
        try {
          await insertRows("astrologers", astrologerRowsExtended(nextConfig.astrologers));
        } catch {
          await insertRows("astrologers", astrologerRowsBase(nextConfig.astrologers));
          warning =
            "Astrologer base details saved. To save UPI, title, address, and social links too, add those columns to the astrologers table.";
        }

        try {
          await insertRows("services", serviceRowsExtended(nextConfig.services));
        } catch {
          await insertRows("services", serviceRowsBase(nextConfig.services));
          warning = warning
            ? `${warning} Services saved without the type field. Add a type column to the services table if you want consultation/class separation stored in Supabase.`
            : "Services saved without the type field. Add a type column to the services table if you want consultation/class separation stored in Supabase.";
        }

        await Promise.all([
          insertRows(
            "schedule",
            nextConfig.schedule.map((item) => ({
              class_name: item.className,
              teacher: item.teacher,
              class_date: item.classDate,
              class_time: item.classTime,
              course_duration: item.courseDuration,
              type: item.type,
              mode: item.mode,
              platform: item.platform
            }))
          ),
          insertRows(
            "faq",
            nextConfig.faqs.map((item) => ({
              question: item.question,
              answer: item.answer
            }))
          )
        ]);

        setConfig(nextConfig);
        return { ok: true, warning };
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : "Unable to save to Supabase.";
        setError(message);
        return { ok: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetConfig = useCallback(async () => {
    await saveConfig(defaultSiteConfig);
  }, [saveConfig]);

  return { config, saveConfig, resetConfig, ready, loading, error, reload: loadConfig };
}
