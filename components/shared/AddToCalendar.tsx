"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { uploadICSFile } from "@/features/services/api";
import { useLanguageStore } from "@/store/languageStore";

export interface CalendarPayload {
  title_en?: string;
  title_ar?: string;
  location_en?: string;
  location_ar?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
}

const isIPad = () =>
  navigator.userAgent.includes("iPad") ||
  (navigator.userAgent.includes("Macintosh") && "ontouchend" in document);

const formatICSDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

export default function AddToCalendar({
  payload,
}: {
  payload?: CalendarPayload;
}) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const uploadIcsMutation = useMutation({ mutationFn: uploadICSFile });

  const handleDownloadICS = async () => {
    if (!payload) return;

    const title =
      selectedLanguage === "ar" ? payload.title_ar : payload.title_en;
    const location =
      selectedLanguage === "ar" ? payload.location_ar : payload.location_en;

    let startTime = payload.start_time || "";
    let endTime = payload.end_time || "";
    if (startTime.split(":").length === 2) startTime += ":00";
    if (endTime.split(":").length === 2) endTime += ":00";

    const startDate = new Date(`${payload.start_date}T${startTime}`);
    const endDate = new Date(`${payload.end_date}T${endTime}`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      toast.error(t("COMMON.CALENDAR_ERROR_MESSAGE"));
      return;
    }

    const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyApp//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${title}
LOCATION:${location}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
END:VEVENT
END:VCALENDAR
`.trim();

    const filename = `${title?.replace(/\s+/g, "_") || "event"}.ics`;

    if (isIPad()) {
      try {
        const formData = new FormData();
        formData.append(
          "ics_file",
          new File([icsContent], filename, { type: "text/calendar" })
        );

        const data = await uploadIcsMutation.mutateAsync(formData);
        if (!data?.data?.file_url) {
          throw new Error("File URL not returned");
        }
        window.location.href = data.data.file_url;
      } catch (error) {
        console.error("ICS upload failed:", error);
        toast.error(t("COMMON.CALENDAR_ERROR_MESSAGE"));
      }
      return;
    }

    const url = URL.createObjectURL(
      new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("COMMON.CALENDAR_TOAST_MESSAGE"));
  };

  return (
    <button
      type="button"
      className="2xl:text-xl lg:text-base text-base font-bold text-primary-5 border-b border-primary-5 xsmall:text-[13px]"
      onClick={handleDownloadICS}
    >
      {t("COMMON.ADD_TO_CALENDAR")}
    </button>
  );
}
