"use client";

import { useTranslation } from "react-i18next";
import {
  opportunityNationalityFrom,
  opportunityNationalityLabel,
} from "@/data/Constants";
import { openLocation } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";
import FactRow, { FACT_PRIMARY, FACT_SECONDARY } from "./FactRow";
import type { VolunteerOpportunityDetail } from "./types";
import {
  remainingPlaces,
  resolveLocationUrl,
  totalCommitment,
} from "./volunteerEventView";

/**
 * Who and where: total hours, age range, places left, gender and address in
 * the first column; audience, accessibility and the priority flags in the
 * second.
 */
export default function OpportunityFacts({
  data,
}: {
  data: VolunteerOpportunityDetail;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);

  const duration = totalCommitment(data);
  const locationUrl = resolveLocationUrl(data);
  /*
   * With only a maps link there is no address text, so the label says "open
   * the link" rather than "address not found", which reads as broken.
   */
  const address =
    (language === "ar" ? data.location_ar : data.location_en) ||
    data.map_desc ||
    (locationUrl ? t("COMMON.OPEN_LOCATION_LINK") : t("COMMON.ADDRESS_NOT_FOUND"));

  return (
    <div className="flex mt-5 mobilescreen:mt-3.5 xss:flex-col">
      <div className="w-1/2 xss:w-full">
        {data.start_time && data.end_time && (
          <FactRow icon="/assets/homepage/hours.svg">
            {duration.hrs > 0 && (
              <>
                <p className={FACT_PRIMARY}>{duration.hrs}</p>
                <p className={FACT_SECONDARY}>{t("COMMON.HR")}</p>
              </>
            )}
            {duration.mins > 0 && (
              <>
                <p className={FACT_PRIMARY}>{duration.mins}</p>
                <p className={FACT_SECONDARY}>{t("COMMON.MIN")}</p>
              </>
            )}
            {duration.hrs === 0 && duration.mins === 0 && (
              <>
                <p className={FACT_PRIMARY}>0</p>
                <p className={FACT_SECONDARY}>{t("COMMON.MIN")}</p>
              </>
            )}
          </FactRow>
        )}

        <FactRow icon="/assets/voluneteerevent/age.svg">
          <p className={FACT_SECONDARY}>{t("COMMON.AGE")} :</p>
          <p className={FACT_PRIMARY}>
            {data.from_age}
            {data.to_age ? (
              <>
                <span className="text-secondary-102 font-bold"> - </span>
                {data.to_age}
              </>
            ) : (
              <span className="text-primary-5 font-bold"> + </span>
            )}
          </p>
        </FactRow>

        <FactRow icon="/assets/homepage/person.svg">
          <p className={FACT_PRIMARY}>{remainingPlaces(data)}</p>
          <p className={FACT_SECONDARY}>{t("COMMON.NEEDED")}</p>
        </FactRow>

        <FactRow icon="/assets/voluneteerevent/gender.svg">
          <p className={FACT_PRIMARY}>{t("COMMON.GENDER")} :</p>
          <p className={FACT_SECONDARY}>
            {data.gender_display?.[language === "ar" ? "value_ar" : "value_en"]}
          </p>
        </FactRow>

        {/* The pin nudges three pixels towards the text to sit on its line. */}
        <FactRow
          icon="/assets/homepage/locations.svg"
          iconClassName="relative ltr:left-[3px] rtl:right-[3px]"
        >
          <div>
            <p
              onClick={() => openLocation(locationUrl, data.latitude, data.longitude)}
              className="text-secondary-102 2xl:text-xl lg:text-base text-base font-bold cursor-pointer hover:underline"
              title={address}
            >
              {address}
            </p>
          </div>
        </FactRow>
      </div>

      <div className="w-1/2 xss:w-full">
        <FactRow icon="/assets/voluneteerevent/nationality.svg">
          <p className={FACT_PRIMARY}>
            {opportunityNationalityLabel(opportunityNationalityFrom(data), language)}
          </p>
        </FactRow>

        <FactRow icon="/assets/voluneteerevent/peoplewithdisabilities.svg">
          <p className={FACT_PRIMARY}>{t("COMMON.SUPPORTS_PEOPLE_WITH_DISABILITIES")}</p>
          <p className={FACT_SECONDARY}>
            {data.is_supports_disabled === true ? t("COMMON.YES") : t("COMMON.NO")}
          </p>
        </FactRow>

        {/* Relief first, then urgent — each on its own row when both are set. */}
        {data.is_relief && (
          <FactRow icon="/assets/voluneteerevent/airplane_logo_vector.svg">
            <p className={FACT_PRIMARY}>{t("COMMON.RELIEF.DETAILS")}</p>
            <p className={FACT_SECONDARY}>{t("COMMON.YES")}</p>
          </FactRow>
        )}
        {data.is_urgent && (
          <FactRow icon="/assets/voluneteerevent/urgent.svg">
            <p className={FACT_PRIMARY}>{t("COMMON.URGENT")}</p>
            <p className={FACT_SECONDARY}>{t("COMMON.YES")}</p>
          </FactRow>
        )}

        {/* Emergency priority is independent of the "Outside Kuwait"
            classification, so it gets its own row. */}
        {data.is_emergency && (
          <FactRow>
            <span className="bg-[#D32F2F] text-white text-xs font-bold rounded-full px-3 py-1 leading-tight">
              {t("COMMON.EMERGENCY_PRIORITY_BADGE")}
            </span>
            <p className={FACT_PRIMARY}>{t("COMMON.EMERGENCY_PRIORITY")}</p>
          </FactRow>
        )}

        {/* Only charity opportunities count beneficiaries. */}
        {data.supports_beneficiaries_count && data.beneficiaries_count != null && (
          <FactRow icon="/assets/homepage/person.svg">
            <p className={FACT_PRIMARY}>{t("COMMON.BENEFICIARIES_COUNT")}</p>
            <p className={FACT_SECONDARY}>{data.beneficiaries_count}</p>
          </FactRow>
        )}
      </div>
    </div>
  );
}
