"use client";

/* eslint-disable @next/next/no-img-element -- static SVG icons */

import moment from "moment";
import { useTranslation } from "react-i18next";
import AddToCalendar from "@/components/shared/AddToCalendar";
import { formatSingleDate } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";
import FactRow, { FACT_PRIMARY, FACT_SECONDARY } from "./FactRow";
import type { VolunteerOpportunityDetail } from "./types";
import { parseIsoUtcDate, scheduledDaysOf } from "./volunteerEventView";

const DATE_ICON = "/assets/homepage/dateicn.svg";

/**
 * "hh:mm" plus the localized AM/PM, for a strict `HH:mm:ss`. `prefix` shares
 * the time's own element, so "- 09:00" keeps a single space rather than
 * picking up the row's flex gap.
 */
function TimeOfDay({ value, prefix = "" }: { value: string; prefix?: string }) {
  const { t } = useTranslation();
  const time = moment(value, "HH:mm:ss");
  return (
    <>
      <p className="text-secondary-102 font-bold">
        {prefix}
        {time.format("hh:mm")}
      </p>
      <p className="text-primary-5">
        {time.format("a") === "am" ? t("COMMON.AM") : t("COMMON.PM")}
      </p>
    </>
  );
}

/**
 * When: the registration deadline, the category, the date range (and the exact
 * days, for a separate-days opportunity), the daily hours, and Add to Calendar.
 */
export default function OpportunitySchedule({
  data,
}: {
  data: VolunteerOpportunityDetail;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);

  const dueDate = parseIsoUtcDate(data.due_date);
  const endDate = parseIsoUtcDate(data.end_date);
  const scheduledDays = scheduledDaysOf(data);
  const hasValidTimes =
    Boolean(data.start_time && data.end_time) &&
    moment(data.start_time, "HH:mm:ss", true).isValid() &&
    moment(data.end_time, "HH:mm:ss", true).isValid();

  const format = (day: string) => formatSingleDate(day, language, t);

  return (
    <>
      <div className="flex items-center text-gray-600 text-sm pb-5 mobilescreen:pb-3.5 gap-2">
        <p className={FACT_PRIMARY}>
          {t("COMMON.DUE_DATE")} :
          <span className="text-secondary-102 font-bold">
            {" "}
            {/*
              No due date is a real answer, not missing data: registration
              stays open to the last day. "No data" would read as a broken
              record and tell a volunteer nothing about whether they can join.
            */}
            {dueDate
              ? format(dueDate.format("YYYY-MM-DD"))
              : endDate
                ? t("COMMON.OPEN_UNTIL_END_DATE", {
                    date: format(endDate.format("YYYY-MM-DD")),
                  })
                : t("COMMON.NO_DATA_AVAILABLE")}
          </span>
        </p>
      </div>

      {/* Volunteering category. */}
      {data.volunteer_category_display && (
        <FactRow icon="/assets/homepage/conclution.svg">
          <p className={FACT_PRIMARY}>{t("COMMON.TYPE")} :</p>
          <p className={FACT_SECONDARY}>
            {data.volunteer_category_display[language === "ar" ? "ar" : "en"]}
          </p>
        </FactRow>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2">
        <FactRow icon={DATE_ICON} spacing="padding">
          <p className={FACT_PRIMARY}>{t("COMMON.START.DATE")} :</p>
          <p className={FACT_SECONDARY}>{format(data.start_date || "")}</p>
        </FactRow>
        <FactRow icon={DATE_ICON} spacing="padding">
          <p className={FACT_PRIMARY}>{t("COMMON.END.DATE")} :</p>
          <p className={FACT_SECONDARY}>{format(data.end_date || "")}</p>
        </FactRow>

        {/*
          Start and end are the first and last day either way. For a
          separate-days opportunity that is not the whole story — the range
          spans days it does not run on — so the exact days are spelled out.
        */}
        {scheduledDays.length > 0 && (
          <div className="col-span-1 flex flex-wrap items-center gap-2 pb-5 mobilescreen:pb-3.5 md:col-span-2">
            <img className="me-3 w-5 h-5 object-contain" src={DATE_ICON} alt="" />
            <p className={FACT_PRIMARY}>{t("COMMON.SCATTERED_DAYS")} :</p>
            {scheduledDays.map((day) => (
              <span
                key={day}
                className="rounded-full bg-[#29246D]/[0.06] px-3 py-1 text-sm font-bold text-secondary-102"
              >
                {format(day)}
              </span>
            ))}
          </div>
        )}

        {hasValidTimes && (
          <div className="flex items-center gap-2 pb-2 font-bold mobilescreen:pb-1.5 2xl:text-xl lg:text-base text-base">
            <img
              className="me-3 w-5 h-5 object-contain"
              src="/assets/homepage/timeicn.svg"
              alt=""
            />
            <TimeOfDay value={data.start_time} />
            <TimeOfDay value={data.end_time} prefix="- " />
          </div>
        )}
      </div>

      {/* Sits with the dates it copies — Google Calendar, or an .ics for
          Apple Calendar / Outlook. */}
      <div className="flex">
        <AddToCalendar
          payload={{
            title_en: data.title_en,
            title_ar: data.title_ar,
            location_en: data.location_en || data.map_desc,
            location_ar: data.location_ar || data.map_desc,
            start_date: data.start_date,
            end_date: data.end_date,
            start_time: data.start_time,
            end_time: data.end_time,
          }}
        />
      </div>
    </>
  );
}
