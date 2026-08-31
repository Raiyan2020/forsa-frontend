"use client";

/**
 * Static, translated terms of use — the fallback used when the CMS has no
 * published `terms` page (`GET /pages/terms/` returns 404). Ported from the
 * legacy React app (`fursa_frontend/src/components/TermsOfUse.tsx`).
 */
import { useTranslation } from "react-i18next";
import Title from "@/components/shared/Title";

export default function TermsOfUse() {
  const { t } = useTranslation();

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px]">
        <h1 className="flex text-start justify-start">
          <Title text={t("TERMS.TITLE")} variant="default" />
        </h1>

        {/* Welcome Message */}
        <section className="mb-5">
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            {t("TERMS.WELCOME_MESSAGE")}
          </p>
        </section>

        {/* Definitions */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            {t("TERMS.DEFINITIONS")}
          </h2>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">
            {t("TERMS.DEFINITIONS_INTRO")}
          </p>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.DEFINITIONS_1")}</li>
            <li>{t("TERMS.DEFINITIONS_2")}</li>
            <li>{t("TERMS.DEFINITIONS_3")}</li>
            <li>{t("TERMS.DEFINITIONS_4")}</li>
            <li>{t("TERMS.DEFINITIONS_5")}</li>
            <li>{t("TERMS.DEFINITIONS_6")}</li>
          </ul>
        </section>

        {/* 1. Acceptance & Changes */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            1. {t("TERMS.ACCEPTANCE_CHANGES")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.ACCEPTANCE_CHANGES_1")}</li>
            <li>{t("TERMS.ACCEPTANCE_CHANGES_2")}</li>
          </ul>
        </section>

        {/* 2. Registration & Accounts */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            2. {t("TERMS.REGISTRATION_ACCOUNTS")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.REGISTRATION_ACCOUNTS_1")}</li>
            <li>{t("TERMS.REGISTRATION_ACCOUNTS_2")}</li>
            <li>{t("TERMS.REGISTRATION_ACCOUNTS_3")}</li>
            <li>{t("TERMS.REGISTRATION_ACCOUNTS_4")}</li>
            <li>{t("TERMS.REGISTRATION_ACCOUNTS_5")}</li>
            <li>{t("TERMS.REGISTRATION_ACCOUNTS_6")}</li>
          </ul>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mt-3 font-semibold">
            {t("TERMS.CHILD_DISABILITY_NOTE")}
          </p>
        </section>

        {/* 3. About the Platform & Its Role */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            3. {t("TERMS.ABOUT_PLATFORM")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.ABOUT_PLATFORM_1")}</li>
            <li>{t("TERMS.ABOUT_PLATFORM_2")}</li>
            <li>{t("TERMS.ABOUT_PLATFORM_3")}</li>
            <li>{t("TERMS.ABOUT_PLATFORM_4")}</li>
          </ul>
        </section>

        {/* 4. Volunteers' Obligations */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            4. {t("TERMS.VOLUNTEERS_OBLIGATIONS")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.VOLUNTEERS_OBLIGATIONS_1")}</li>
            <li>{t("TERMS.VOLUNTEERS_OBLIGATIONS_2")}</li>
            <li>{t("TERMS.VOLUNTEERS_OBLIGATIONS_3")}</li>
          </ul>
        </section>

        {/* 5. Creating Volunteer Opportunities */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            5. {t("TERMS.CREATING_OPPORTUNITIES")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.CREATING_OPPORTUNITIES_1")}</li>
            <li>{t("TERMS.CREATING_OPPORTUNITIES_2")}</li>
            <li>{t("TERMS.CREATING_OPPORTUNITIES_3")}</li>
            <li>{t("TERMS.CREATING_OPPORTUNITIES_4")}</li>
            <li>{t("TERMS.CREATING_OPPORTUNITIES_5")}</li>
            <li>{t("TERMS.CREATING_OPPORTUNITIES_7")}</li>
          </ul>
        </section>

        {/* 6. Obligations of Organizations & Volunteer Teams */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            6. {t("TERMS.ORGANIZATIONS_OBLIGATIONS")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.ORGANIZATIONS_OBLIGATIONS_1")}</li>
            <li>{t("TERMS.ORGANIZATIONS_OBLIGATIONS_2")}</li>
            <li>{t("TERMS.ORGANIZATIONS_OBLIGATIONS_3")}</li>
            <li>{t("TERMS.ORGANIZATIONS_OBLIGATIONS_4")}</li>
            <li>{t("TERMS.ORGANIZATIONS_OBLIGATIONS_5")}</li>
            <li>{t("TERMS.ORGANIZATIONS_OBLIGATIONS_6")}</li>
          </ul>
        </section>

        {/* 7. Financial Rewards & Allowances */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            7. {t("TERMS.FINANCIAL_REWARDS")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.FINANCIAL_REWARDS_1")}</li>
            <li>{t("TERMS.FINANCIAL_REWARDS_2")}</li>
            <li>{t("TERMS.FINANCIAL_REWARDS_3")}</li>
          </ul>
        </section>

        {/* 8. Content & Interactions */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            8. {t("TERMS.CONTENT_INTERACTIONS")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.CONTENT_INTERACTIONS_1")}</li>
            <li>{t("TERMS.CONTENT_INTERACTIONS_2")}</li>
            <li>{t("TERMS.CONTENT_INTERACTIONS_3")}</li>
            <li>{t("TERMS.CONTENT_INTERACTIONS_4")}</li>
          </ul>
        </section>

        {/* 9. Ads & Non-Volunteer Events */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            9. {t("TERMS.ADS_NON_VOLUNTEER")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.ADS_NON_VOLUNTEER_1")}</li>
            <li>{t("TERMS.ADS_NON_VOLUNTEER_2")}</li>
            <li>{t("TERMS.ADS_NON_VOLUNTEER_3")}</li>
          </ul>
        </section>

        {/* 10. Photos, Media & Media Coverage */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            10. {t("TERMS.PHOTOS_MEDIA")}
          </h2>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">
            {t("TERMS.PHOTOS_MEDIA_INTRO")}
          </p>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">
            {t("TERMS.PHOTOS_MEDIA_USAGE_INTRO")}
          </p>
          <ul className="list-[circle] pl-14 rtl:pr-14 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">
            <li>{t("TERMS.PHOTOS_MEDIA_USAGE_1")}</li>
            <li>{t("TERMS.PHOTOS_MEDIA_USAGE_2")}</li>
            <li>{t("TERMS.PHOTOS_MEDIA_USAGE_3")}</li>
            <li>{t("TERMS.PHOTOS_MEDIA_USAGE_4")}</li>
          </ul>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.PHOTOS_MEDIA_CONSENT")}</li>
            <li>{t("TERMS.PHOTOS_MEDIA_RESPONSIBILITY")}</li>
          </ul>
        </section>

        {/* 11. Third-Party Apps & Services */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            11. {t("TERMS.THIRD_PARTY")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.THIRD_PARTY_1")}</li>
            <li>{t("TERMS.THIRD_PARTY_2")}</li>
          </ul>
        </section>

        {/* 12. Intellectual Property */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            12. {t("TERMS.INTELLECTUAL_PROPERTY")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.INTELLECTUAL_PROPERTY_1")}</li>
            <li>{t("TERMS.INTELLECTUAL_PROPERTY_2")}</li>
          </ul>
        </section>

        {/* 13. Limitation of Liability */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            13. {t("TERMS.LIMITATION_LIABILITY")}
          </h2>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">
            {t("TERMS.LIMITATION_LIABILITY_INTRO")}
          </p>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">
            {t("TERMS.LIMITATION_LIABILITY_NOT_LIABLE")}
          </p>
          <ul className="list-[circle] pl-14 rtl:pr-14 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">
            <li>{t("TERMS.LIMITATION_LIABILITY_1")}</li>
            <li>{t("TERMS.LIMITATION_LIABILITY_2")}</li>
            <li>{t("TERMS.LIMITATION_LIABILITY_3")}</li>
            <li>{t("TERMS.LIMITATION_LIABILITY_4")}</li>
            <li>{t("TERMS.LIMITATION_LIABILITY_5")}</li>
          </ul>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            {t("TERMS.LIMITATION_LIABILITY_CONCLUSION")}
          </p>
        </section>

        {/* 14. Indemnity */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            14. {t("TERMS.INDEMNITY")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.INDEMNITY_1")}</li>
          </ul>
        </section>

        {/* 15. Governing Law & Jurisdiction */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            15. {t("TERMS.GOVERNING_LAW")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.GOVERNING_LAW_1")}</li>
            <li>{t("TERMS.GOVERNING_LAW_2")}</li>
            <li>{t("TERMS.GOVERNING_LAW_3")}</li>
          </ul>
        </section>

        {/* 16. Termination */}
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">
            16. {t("TERMS.TERMINATION")}
          </h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("TERMS.TERMINATION_1")}</li>
            <li>{t("TERMS.TERMINATION_2")}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}