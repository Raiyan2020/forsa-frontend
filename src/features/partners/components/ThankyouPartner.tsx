"use client";

import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Title from "@/components/shared/Title";
import HomepageBannerClient from "@/features/home/components/HomepageBannerClient";

export default function ThankyouPartner() {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (contentRef.current) {
        const offset = 300;
        const elementPosition =
          contentRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: elementPosition - offset, behavior: "smooth" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <HomepageBannerClient />
      <div>
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:pb-[70px] pb-[40px] mx-auto pt-0">
          <h2 ref={contentRef} className="flex justify-center mobilescreen:justify-center">
            <Title text={t("COMMON.THANK_YOU")} variant="default" />
          </h2>
          <div>
            <p className="text-primary-5 text-lg mobilescreen:text-base 2xl:pb-7 pb-4">
              {t("COMMON.THANK_YOU_SPONSORSHIP_MESSAGE")}
            </p>
            <p className="text-primary-5 text-lg mobilescreen:text-base 2xl:pb-7 pb-4">
              {t("COMMON.APPRECIATE_INTEREST_MESSAGE")}
            </p>
            <p className="text-primary-5 text-lg mobilescreen:text-base 2xl:pb-7 pb-4">
              {t("COMMON.REVIEW_APPLICATION_MESSAGE")}
            </p>
            <p className="text-primary-5 text-lg mobilescreen:text-base 2xl:pb-7 pb-4">
              {t("COMMON.SUPPORT_JOURNEY_MESSAGE")}
            </p>
          </div>
          <div className="font-bold text-primary-5 text-[25px] 2xl:pt-16 pt-8 mobilescreen:pt-6">
            {t("COMMON.FORSA_TEAM")}
          </div>
        </div>
      </div>
    </>
  );
}
