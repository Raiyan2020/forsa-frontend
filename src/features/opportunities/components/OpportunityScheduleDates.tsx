"use client";

import { useMemo } from "react";
import Image from "next/image";
import DatePicker, { DateObject } from "react-multi-date-picker";
import { useFormikContext } from "formik";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

export type ScheduleMode = "consecutive" | "scattered";

/**
 * The mode switch, rendered *inside* the calendar popup rather than beside the
 * field. It is a `react-multi-date-picker` plugin, which is what lets it sit
 * above the day grid (`position="top"`) instead of in the form's own layout.
 *
 * The library clones every plugin with its internal props — `state`,
 * `setState`, `handleChange`, `nodes` and so on. None of them are needed here,
 * because the mode lives in Formik rather than in the calendar's own state, so
 * they are collected and ignored rather than declared.
 */
const ScheduleModeSwitch = ({
  mode,
  onChange,
  labels,
}: {
  mode: ScheduleMode;
  onChange: (next: ScheduleMode) => void;
  labels: Record<ScheduleMode, string>;
  /** Supplied by the picker; declared so the JSX below type-checks. */
  position?: string;
}) => (
  <div className="flex flex-wrap gap-2 border-b border-[#29246D1A]/10 p-2">
    {(["consecutive", "scattered"] as const).map((option) => (
      <button
        key={option}
        type="button"
        aria-pressed={mode === option}
        onClick={() => onChange(option)}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
          mode === option
            ? "border-primary-5 bg-primary-5 text-white"
            : "border-[#29246D1A]/10 bg-[#29246D]/[0.03] text-primary-5"
        )}
      >
        {labels[option]}
      </button>
    ))}
  </div>
);

export interface ScheduleAwareValues {
  scheduleMode: ScheduleMode;
  /** Every day the opportunity runs, `yyyy-MM-dd`, ascending. */
  scheduleDates: string[];
  startDate: string;
  endDate: string;
}

/** `yyyy-MM-dd` in local time — `toISOString()` shifts the day across UTC. */
const toIsoDay = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseIsoDay = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * `startDate` / `endDate` carry a full ISO timestamp taken from local midnight,
 * which is what the rest of the form and its helpers expect. It matters:
 * `formatDateToYYYYMMDD()` and the `notInPast` rule both build a `new Date()`
 * from these values and then read `.getDate()` off it, and `new Date()` treats
 * a bare `yyyy-MM-dd` as **UTC** while those getters are **local** — so a plain
 * date string lands on the previous day everywhere west of Greenwich, and
 * "today" reads as being in the past. Round-tripping through local midnight
 * keeps the calendar day the organiser clicked.
 */
export const toFormDateValue = (day?: string): string => {
  if (!day) return "";
  const parsed = parseIsoDay(day);
  return parsed ? parsed.toISOString() : "";
};

const formatForDisplay = (value: string, locale: string): string => {
  const parsed = parseIsoDay(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * The whole date question for a volunteer opportunity, asked once.
 *
 * The organiser picks a mode first — consecutive days (a range, the common
 * case and the default) or scattered days (a Saturday clinic across four
 * separate weekends). Both write the same three values:
 *
 *  - `scheduleDates` — every day the opportunity actually runs;
 *  - `startDate` / `endDate` — the first and last of those.
 *
 * Keeping `startDate` / `endDate` populated in both modes is what lets the
 * existing due-date and end-after-start rules, the listing sort and every
 * card that prints a date range keep working untouched. The difference
 * between the two modes lives in `scheduleDates`: for a range it is only the
 * two endpoints, for scattered days it is the exact set, which the form turns
 * into the `time_slots` rows the API uses to record a non-consecutive
 * schedule.
 */
const OpportunityScheduleDates = ({ minDate }: { minDate?: Date }) => {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const isRtl = selectedLanguage === "ar";
  const { values, errors, touched, setFieldValue, setFieldTouched } =
    useFormikContext<ScheduleAwareValues>();

  const mode = values.scheduleMode ?? "consecutive";
  const isScattered = mode === "scattered";
  const selected = useMemo(
    () => values.scheduleDates ?? [],
    [values.scheduleDates]
  );

  const pickerValue = useMemo(
    () =>
      selected
        .map((day) => parseIsoDay(day))
        .filter((date): date is Date => date !== null),
    [selected]
  );

  const showError =
    (touched.startDate || touched.scheduleDates) &&
    (errors.scheduleDates || errors.startDate || errors.endDate);

  const commit = (days: string[]) => {
    const ordered = [...new Set(days)].sort();
    setFieldValue("scheduleDates", ordered);
    setFieldValue("startDate", toFormDateValue(ordered[0]));
    setFieldValue("endDate", toFormDateValue(ordered[ordered.length - 1]));
    setFieldTouched("scheduleDates", true, false);
    setFieldTouched("startDate", true, false);
    setFieldTouched("endDate", true, false);
  };

  /*
   * Switching mode clears the selection rather than converting it. A range
   * reinterpreted as scattered days would silently drop every day between the
   * endpoints, and scattered days reinterpreted as a range would silently add
   * every day between them — both change what the organiser committed to
   * without saying so. Consecutive is the default, so switching is always a
   * deliberate act.
   */
  const changeMode = (next: ScheduleMode) => {
    if (next === mode) return;
    setFieldValue("scheduleMode", next);
    commit([]);
  };

  const handlePicked = (value: DateObject | DateObject[] | null) => {
    if (!value) {
      commit([]);
      return;
    }

    const picked = Array.isArray(value) ? value : [value];
    commit(picked.map((entry) => toIsoDay(entry.toDate())));
  };

  const inputClassName = cn(
    "w-full p-3 border rounded-2xl h-[48px] bg-[#29246D]/[0.03] text-primary-5 focus:outline-none",
    isRtl ? "pr-3 text-right" : "pl-[19px] text-left",
    showError ? "border-red-500" : "border-[#29246D1A]/10"
  );

  const summary = isScattered
    ? selected.length > 0
      ? t("COMMON.SCHEDULE_DAYS_COUNT", { count: selected.length })
      : ""
    : selected.length > 0
      ? selected
          .map((day) => formatForDisplay(day, selectedLanguage))
          .join(isRtl ? " ← " : " → ")
      : "";

  return (
    // The id is the scroll target the form's "jump to first error" helper
    // looks up — this field owns three value keys but has only one place on
    // screen to send the organiser to.
    <div id="scheduleDates" className="mb-4 w-full" dir={isRtl ? "rtl" : "ltr"}>
      <div className="relative flex items-center">
        <DatePicker
          multiple={isScattered}
          range={!isScattered}
          value={pickerValue}
          onChange={handlePicked}
          format="DD-MM-YYYY"
          minDate={minDate}
          calendarPosition="bottom-center"
          zIndex={1100}
          containerClassName="w-full !h-full"
          onOpenPickNewDate={false}
          plugins={[
            <ScheduleModeSwitch
              key="schedule-mode"
              position="top"
              mode={mode}
              onChange={changeMode}
              labels={{
                consecutive: t("COMMON.CONSECUTIVE_DAYS"),
                scattered: t("COMMON.SCATTERED_DAYS"),
              }}
            />,
          ]}
          render={(_value: string, openCalendar: () => void) => (
            <input
              type="text"
              readOnly
              value={summary}
              onClick={openCalendar}
              onFocus={openCalendar}
              className={cn(inputClassName, "cursor-pointer")}
              placeholder={
                isScattered
                  ? t("COMMON.PICK_SCATTERED_DAYS")
                  : t("COMMON.PICK_DATE_RANGE")
              }
            />
          )}
        />
        <Image
          src="/assets/homepage/dateicon.svg"
          alt=""
          width={20}
          height={20}
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2",
            isRtl ? "left-[10px]" : "right-[10px]"
          )}
        />
      </div>

      {showError && (
        <div className="mt-1 text-sm text-red-500">
          {(errors.scheduleDates as string) ||
            (errors.startDate as string) ||
            (errors.endDate as string)}
        </div>
      )}
    </div>
  );
};

export default OpportunityScheduleDates;
