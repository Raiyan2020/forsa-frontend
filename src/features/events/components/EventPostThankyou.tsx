"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Title from "@/components/shared/Title";
import HomepageBannerClient from "@/features/home/components/HomepageBannerClient";

export default function EventPostThankyou() {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (contentRef.current) {
        const offset = 300; // Adjust based on your header height
        const elementPosition =
          contentRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: elementPosition - offset, behavior: "smooth" });
      }
    }, 100); // Small delay for content rendering

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <HomepageBannerClient />
      <div>
        <div className="2xl:w-[880px] laptopmain:w-[1300px] laptop:w-[1359px] lg:w-[90%] 2xl:pb-[70px] pb-[40px] w-[90%] mx-auto pt-0">
          <h2
            ref={contentRef}
            className="flex justify-center mobilescreen:justify-center"
          >
            <Title text={t("COMMON.THANK_YOU")} variant="default" />
          </h2>
          <div className="text-start">
            <p className="text-primary-5 text-lg mobilescreen:text-base 2xl:pb-7 pb-4">
              {t("COMMON.EVENT.POSTING.THANKYOU.TITLE1")}
            </p>
            <p className="text-primary-5 text-lg mobilescreen:text-base 2xl:pb-7 pb-4">
              {t("COMMON.EVENT.POSTING.THANKYOU.TITLE2")}
            </p>
            <p className="text-primary-5 text-lg mobilescreen:text-base 2xl:pb-7 pb-4">
              {t("COMMON.EVENT.POSTING.THANKYOU.TITLE3")}
            </p>
          </div>

          <div className="font-bold text-primary-5 text-[25px] 2xl:pt-8 pt-4 mobilescreen:pt-6">
            {t("COMMON.FORSA_TEAM")}
          </div>
        </div>
      </div>
    </>
  );
}
