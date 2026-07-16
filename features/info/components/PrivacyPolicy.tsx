"use client";

import { useTranslation } from "react-i18next";
import Title from "@/components/shared/Title";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px]">
        <h1 className="flex text-start justify-start">
          <Title text={t("PRIVACY.TITLE")} variant="default" />
        </h1>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">1. {t("PRIVACY.DATA_WE_COLLECT")}</h2>
          <div className="mb-4">
            <h3 className="text-[20px] mobilescreen:text-lg font-semibold text-[#29246d] mb-3">{t("PRIVACY.SUBSECTION_A")} {t("PRIVACY.DATA_PROVIDED_DIRECTLY")}</h3>
            <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
              <li>{t("PRIVACY.DATA_PROVIDED_DIRECTLY_1")}</li>
              <li>{t("PRIVACY.DATA_PROVIDED_DIRECTLY_2")}</li>
              <li>{t("PRIVACY.DATA_PROVIDED_DIRECTLY_3")}</li>
            </ul>
          </div>
          <div className="mb-4">
            <h3 className="text-[20px] mobilescreen:text-lg font-semibold text-[#29246d] mb-3">{t("PRIVACY.SUBSECTION_B")} {t("PRIVACY.DATA_COLLECTED_AUTOMATICALLY")}</h3>
            <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
              <li>{t("PRIVACY.DATA_COLLECTED_AUTOMATICALLY_1")}</li>
              <li>{t("PRIVACY.DATA_COLLECTED_AUTOMATICALLY_2")}</li>
              <li>{t("PRIVACY.DATA_COLLECTED_AUTOMATICALLY_3")}</li>
            </ul>
          </div>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">2. {t("PRIVACY.HOW_WE_USE_DATA")}</h2>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">{t("PRIVACY.HOW_WE_USE_DATA_INTRO")}</p>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.HOW_WE_USE_DATA_1")}</li>
            <li>{t("PRIVACY.HOW_WE_USE_DATA_2")}</li>
            <li>{t("PRIVACY.HOW_WE_USE_DATA_3")}</li>
            <li>{t("PRIVACY.HOW_WE_USE_DATA_4")}</li>
            <li>{t("PRIVACY.HOW_WE_USE_DATA_5")}</li>
          </ul>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">3. {t("PRIVACY.DATA_SHARING")}</h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.DATA_SHARING_1")}</li>
            <li>{t("PRIVACY.DATA_SHARING_2")}</li>
            <li>{t("PRIVACY.DATA_SHARING_3")}</li>
            <li>{t("PRIVACY.DATA_SHARING_4")}</li>
          </ul>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">4. {t("PRIVACY.COOKIES_TRACKING")}</h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.COOKIES_TRACKING_1")}</li>
            <li>{t("PRIVACY.COOKIES_TRACKING_2")}</li>
          </ul>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">5. {t("PRIVACY.DATA_SECURITY")}</h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.DATA_SECURITY_1")}</li>
            <li>{t("PRIVACY.DATA_SECURITY_2")}</li>
          </ul>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">6. {t("PRIVACY.DATA_RETENTION")}</h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.DATA_RETENTION_1")}</li>
            <li>{t("PRIVACY.DATA_RETENTION_2")}</li>
          </ul>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">7. {t("PRIVACY.THIRD_PARTY_LINKS")}</h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.THIRD_PARTY_LINKS_1")}</li>
            <li>{t("PRIVACY.THIRD_PARTY_LINKS_2")}</li>
          </ul>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">8. {t("PRIVACY.ADVERTISING_PROMOTIONAL")}</h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.ADVERTISING_PROMOTIONAL_1")}</li>
            <li>{t("PRIVACY.ADVERTISING_PROMOTIONAL_2")}</li>
            <li>{t("PRIVACY.ADVERTISING_PROMOTIONAL_3")}</li>
          </ul>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">9. {t("PRIVACY.PHOTOS_MEDIA")}</h2>
          <p className="text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">{t("PRIVACY.PHOTOS_MEDIA_INTRO")}</p>
          <ul className="list-[circle] pl-14 rtl:pr-14 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal mb-3">
            <li>{t("PRIVACY.PHOTOS_MEDIA_1")}</li>
            <li>{t("PRIVACY.PHOTOS_MEDIA_2")}</li>
            <li>{t("PRIVACY.PHOTOS_MEDIA_3")}</li>
            <li>{t("PRIVACY.PHOTOS_MEDIA_4")}</li>
          </ul>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.PHOTOS_MEDIA_USAGE")}</li>
            <li>{t("PRIVACY.PHOTOS_MEDIA_CONSENT")}</li>
            <li>{t("PRIVACY.PHOTOS_MEDIA_RESPONSIBILITY")}</li>
          </ul>
        </section>
        <section className="mb-5">
          <h2 className="text-[25px] mobilescreen:text-2xl font-bold text-[#29246d] mb-5 mobilescreen:mb-4">10. {t("PRIVACY.POLICY_CHANGES")}</h2>
          <ul className="list-disc pl-7 rtl:pr-7 space-y-2 text-secondary-100 lg:text-lg md:text-base mobilescreen:text-xs font-normal">
            <li>{t("PRIVACY.POLICY_CHANGES_1")}</li>
            <li>{t("PRIVACY.POLICY_CHANGES_2")}</li>
            <li>{t("PRIVACY.POLICY_CHANGES_3")}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
