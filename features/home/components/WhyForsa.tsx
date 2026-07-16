"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

const features = [
  {
    id: 1,
    icon: "/assets/homepage/volunteer_recognition.svg",
    titleKey: "COMMON.VOLUNTEER_RECOGNITION",
  },
  {
    id: 2,
    icon: "/assets/homepage/opportunity_matching.svg",
    titleKey: "COMMON.OPPORTUNITY_MATCHING",
  },
  {
    id: 3,
    icon: "/assets/homepage/community.svg",
    titleKey: "COMMON.COMMUNITY_ENGAGEMENT",
  },
  {
    id: 4,
    icon: "/assets/homepage/smartwatch.svg",
    titleKey: "COMMON.SMART_ATTENDANCE_TRACKING",
  },
  {
    id: 5,
    icon: "/assets/homepage/Workshopsbuilding.svg",
    titleKey: "COMMON.WORKSHOPS_SKILL_BUILDING",
  },
];

export default function WhyForsa() {
  const { t } = useTranslation();

  return (
    <div className="bg-[#FAF8F8] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto text-center">
        <h2 className="text-[24px] 2xl:text-[50px] lg:text-[32px] md:text-[38px] font-bold mb-[25px] 2xl:mb-[50px] lg:mb-[24px] md:mb-[50px] text-primary-5">
          {t("COMMON.WHY")}{" "}
          <span className="text-primary-400">{t("COMMON.FORSA")}</span>
          {t("COMMON.?")}
        </h2>

        {/* Desktop */}
        <div className="hidden lg:grid grid-cols-5 gap-6">
          {features.map((feature) => (
            <div key={feature.id} className="flex flex-col items-center">
              <Image
                src={feature.icon}
                alt={t(feature.titleKey)}
                width={64}
                height={64}
                className="w-16 h-16 mb-3"
              />
              <p className="text-primary-5 2xl:text-xl laptopmain:text-xl text-[22px] lg:text-[18px] md:text-[16px] font-bold text-center lg:w-[180px]">
                {t(feature.titleKey)}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile */}
        <div className="block lg:hidden">
          <div className="grid grid-cols-3 gap-6 justify-items-center">
            {features.slice(0, 3).map((feature) => (
              <div key={feature.id} className="flex flex-col items-center">
                <Image
                  src={feature.icon}
                  alt={t(feature.titleKey)}
                  width={64}
                  height={64}
                  className="w-16 h-16 mb-3"
                />
                <p className="text-primary-5 text-[22px] md:text-[16px] mobilescreen:text-[14px] font-bold text-center">
                  {t(feature.titleKey)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 xss:gap-0 mt-6">
            {features.slice(3, 5).map((feature) => (
              <div key={feature.id} className="flex flex-col items-center">
                <Image
                  src={feature.icon}
                  alt={t(feature.titleKey)}
                  width={64}
                  height={64}
                  className="w-16 h-16 mb-3"
                />
                <p className="text-primary-5 text-[22px] md:text-[16px] mobilescreen:text-[14px] font-bold text-center mobilescreen:w-[80%]">
                  {t(feature.titleKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
