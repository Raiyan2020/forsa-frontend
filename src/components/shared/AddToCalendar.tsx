"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { uploadICSFile } from "@/features/calendar/services/calendarApi";
import { useLanguageStore } from "@/store/languageStore";

/** Every field is nullable — the API omits times and locations freely. */
export interface CalendarPayload {
  title_en?: string | null;
  title_ar?: string | null;
  location_en?: string | null;
  location_ar?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

const isIPad = () =>
  navigator.userAgent.includes("iPad") ||
  (navigator.userAgent.includes("Macintosh") && "ontouchend" in document);

const formatICSDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

/** `2026-08-13` → `20260813`, the ICS form of a date-only value. */
const formatICSDateOnly = (isoDate: string) => isoDate.replace(/-/g, "");

/**
 * An all-day `DTEND` is exclusive, so a one-day event ends on the next day.
 * The arithmetic is done in UTC to keep it away from timezone drift — these
 * are calendar dates, not instants.
 */
const nextDay = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

/**
 * Backslashes, commas and newlines are delimiters in an ICS property value —
 * an unescaped comma in a location ("Kuwait City, Kuwait") truncates the line.
 */
const escapeICSText = (value?: string | null) =>
  // `?? ""` rather than a default parameter: the API sends null, not undefined,
  // and a default only fills in for undefined.
  (value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,");

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

    const startDay = payload.start_date;
    const endDay = payload.end_date || payload.start_date;

    if (!startDay || !endDay) {
      toast.error(t("COMMON.CALENDAR_ERROR_MESSAGE"));
      return;
    }

    let startTime = payload.start_time || "";
    let endTime = payload.end_time || "";
    if (startTime.split(":").length === 2) startTime += ":00";
    if (endTime.split(":").length === 2) endTime += ":00";

    /*
     * Times are optional on both events and opportunities — the API returns
     * null for them. Those become all-day entries rather than an error, which
     * is what the old `new Date("2026-08-13T")` produced.
     */
    let dtStart: string;
    let dtEnd: string;

    if (startTime && endTime) {
      const startDate = new Date(`${startDay}T${startTime}`);
      const endDate = new Date(`${endDay}T${endTime}`);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        toast.error(t("COMMON.CALENDAR_ERROR_MESSAGE"));
        return;
      }

      dtStart = `DTSTART:${formatICSDate(startDate)}`;
      dtEnd = `DTEND:${formatICSDate(endDate)}`;
    } else {
      dtStart = `DTSTART;VALUE=DATE:${formatICSDateOnly(startDay)}`;
      dtEnd = `DTEND;VALUE=DATE:${formatICSDateOnly(nextDay(endDay))}`;
    }

    const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyApp//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${escapeICSText(title)}
LOCATION:${escapeICSText(location)}
${dtStart}
${dtEnd}
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
