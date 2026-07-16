"use client";

import { useTranslation } from "react-i18next";
import Image from "next/image";

export default function HowForsaWork() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: "/assets/sponser/createprofile.svg",
      title: t("ABOUT.HOW_WORKS.REGISTER.TITLE"),
      description: t("ABOUT.HOW_WORKS.REGISTER.DESCRIPTION"),
    },
    {
      icon: "/assets/sponser/exploreopportunities.svg",
      title: t("ABOUT.HOW_WORKS.EXPLORE.TITLE"),
      description: t("ABOUT.HOW_WORKS.EXPLORE.DESCRIPTION"),
    },
    {
      icon: "/assets/sponser/recognized.svg",
      title: t("ABOUT.HOW_WORKS.RECOGNIZED.TITLE"),
      description: t("ABOUT.HOW_WORKS.RECOGNIZED.DESCRIPTION"),
    },
    {
      icon: "/assets/sponser/contributuion.svg",
      title: t("ABOUT.HOW_WORKS.PARTICIPATE.TITLE"),
      description: t("ABOUT.HOW_WORKS.PARTICIPATE.DESCRIPTION"),
    },
  ];

  return (
    <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] laptopmain:py-[50px] py-[40px] relative">
      <h2 className="text-center text-[24px] 2xl:text-[50px] laptop:text-[40px] lg:text-[32px] md:text-[38px] font-bold mb-[20px] 2xl:mb-[50px] laptop:mb-[40px] lg:mb-[24px] md:mb-[50px]">
        <span className="text-primary-5">
          {t("ABOUT.HOW_WORKS.TITLE_START")}
        </span>{" "}
        <span className="text-primary-300">{t("COMMON.FORSA")}</span>{" "}
        <span className="text-primary-5">{t("ABOUT.HOW_WORKS.TITLE_END")}</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-[#FAF8F8] border border-primary-5 rounded-2xl shadow-sm p-6"
          >
            <div className="mb-4">
              <div>
                <Image
                  src={step.icon}
                  alt={step.title}
                  width={64}
                  height={64}
                  className="object-contain 2xl:w-16 2xl:h-16 lg:w-12 lg:h-12 md:w-12 md:h-12 xss:w-10 xss:h-10"
                />
              </div>
            </div>
            <h3 className="2xl:text-[25px] laptopmain:text-xl laptop:text-lg text-lg font-bold text-primary-5 mb-3">
              {step.title}
            </h3>
            <p className="text-primary-5 2xl:text-lg laptopmain:text-base laptop:text-base text-sm">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
