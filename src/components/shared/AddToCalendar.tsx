"use client";

import { useEffect, useRef, useState } from "react";
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
  /**
   * Deep link back to the item, put in the Google entry's description.
   * Defaults to the current page, resolved at click time so there is no
   * server/client difference to reconcile.
   */
  details_url?: string | null;
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

/** Normalises `HH:mm` to the `HH:mm:ss` both `Date` and ICS expect. */
const withSeconds = (time?: string | null) => {
  const value = time || "";
  return value.split(":").length === 2 ? `${value}:00` : value;
};

interface ResolvedSchedule {
  /** Null when the item has no usable start/end date. */
  startDay: string;
  endDay: string;
  /** Both null for an all-day entry. */
  start: Date | null;
  end: Date | null;
}

/**
 * Times are optional on both events and opportunities — the API returns null
 * for them. Those become all-day entries rather than an error, which is what
 * the old `new Date("2026-08-13T")` produced.
 */
const resolveSchedule = (payload: CalendarPayload): ResolvedSchedule | null => {
  const startDay = payload.start_date;
  const endDay = payload.end_date || payload.start_date;
  if (!startDay || !endDay) return null;

  const startTime = withSeconds(payload.start_time);
  const endTime = withSeconds(payload.end_time);

  if (!startTime || !endTime) {
    return { startDay, endDay, start: null, end: null };
  }

  const start = new Date(`${startDay}T${startTime}`);
  const end = new Date(`${endDay}T${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return { startDay, endDay, start, end };
};

/**
 * Google's "add event" template link. `dates` is either two UTC instants or,
 * for an all-day entry, two plain dates whose end is exclusive — the same rule
 * ICS uses, which is why both paths share `nextDay()`.
 */
const buildGoogleCalendarUrl = (
  schedule: ResolvedSchedule,
  title: string,
  location: string,
  detailsUrl?: string | null
) => {
  const dates =
    schedule.start && schedule.end
      ? `${formatICSDate(schedule.start)}/${formatICSDate(schedule.end)}`
      : `${formatICSDateOnly(schedule.startDay)}/${formatICSDateOnly(
          nextDay(schedule.endDay)
        )}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
  });
  if (location) params.set("location", location);
  if (detailsUrl) params.set("details", detailsUrl);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const buildIcsContent = (
  schedule: ResolvedSchedule,
  title: string,
  location: string
) => {
  const dtStart =
    schedule.start && schedule.end
      ? `DTSTART:${formatICSDate(schedule.start)}`
      : `DTSTART;VALUE=DATE:${formatICSDateOnly(schedule.startDay)}`;
  const dtEnd =
    schedule.start && schedule.end
      ? `DTEND:${formatICSDate(schedule.end)}`
      : `DTEND;VALUE=DATE:${formatICSDateOnly(nextDay(schedule.endDay))}`;

  return `
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
};

const MENU_ITEM_CLASS =
  "w-full whitespace-nowrap px-4 py-2.5 text-start text-base font-medium text-primary-5 transition-colors hover:bg-primary-5/5 2xl:text-lg";

/**
 * "Add to calendar" on an event or opportunity.
 *
 * Two destinations, because they are not interchangeable: Google Calendar is a
 * template link that saves the entry into the signed-in Google account, while
 * the .ics download is what Apple Calendar and Outlook take. A downloaded .ics
 * puts nothing into Google Calendar without a manual import, so offering only
 * that was not the same feature.
 */
export default function AddToCalendar({
  payload,
  className,
}: {
  payload?: CalendarPayload;
  className?: string;
}) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const uploadIcsMutation = useMutation({ mutationFn: uploadICSFile });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!payload?.start_date) return null;

  const title =
    (selectedLanguage === "ar" ? payload.title_ar : payload.title_en) || "";
  const location =
    (selectedLanguage === "ar" ? payload.location_ar : payload.location_en) ||
    "";

  const handleGoogleCalendar = () => {
    setOpen(false);
    const schedule = resolveSchedule(payload);
    if (!schedule) {
      toast.error(t("COMMON.CALENDAR_ERROR_MESSAGE"));
      return;
    }

    window.open(
      buildGoogleCalendarUrl(
        schedule,
        title,
        location,
        payload.details_url ?? window.location.href
      ),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleDownloadICS = async () => {
    setOpen(false);
    const schedule = resolveSchedule(payload);
    if (!schedule) {
      toast.error(t("COMMON.CALENDAR_ERROR_MESSAGE"));
      return;
    }

    const icsContent = buildIcsContent(schedule, title, location);
    const filename = `${title.replace(/\s+/g, "_") || "event"}.ics`;

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
    <div ref={containerRef} className={`relative inline-block ${className || ""}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="border-b border-primary-5 text-base font-bold text-primary-5 lg:text-base 2xl:text-xl xsmall:text-[13px]"
        onClick={() => setOpen((value) => !value)}
      >
        {t("COMMON.ADD_TO_CALENDAR")}
      </button>

      {open && (
        // `start-0` rather than `left-0`: the menu has to hang off the same
        // edge as the trigger in both directions.
        <div
          role="menu"
          className="absolute top-[calc(100%+8px)] z-20 start-0 overflow-hidden rounded-xl border border-primary-5/20 bg-white py-1 shadow-[0px_4px_10px_rgba(0,0,0,0.15)]"
        >
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_CLASS}
            onClick={handleGoogleCalendar}
          >
            {t("COMMON.GOOGLE_CALENDAR")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_CLASS}
            onClick={handleDownloadICS}
          >
            {t("COMMON.DOWNLOAD_ICS")}
          </button>
        </div>
      )}
    </div>
  );
}
