"use client";

import { useTranslation } from "react-i18next";
import Title from "@/components/shared/Title";
import { useLanguageStore } from "@/store/languageStore";
import Image from "next/image";

export default function AboutForsa() {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const goals = [
    t("ABOUT.GOALS.EMPOWER_INDIVIDUALS"),
    t("ABOUT.GOALS.SUPPORT_ORGANIZATIONS"),
    t("ABOUT.GOALS.FOSTER_COLLABORATION"),
    t("ABOUT.GOALS.BUILD_DATABASE"),
  ];

  return (
    <div className="2xl:w-[75%] 2xl:px-5 px-3 mobilescreen:px-[13px] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:pb-[70px] pb-[40px] relative">
      <h1>
        <Title text={t("ABOUT.TITLE")} variant="default" />
      </h1>
      <div className="space-y-8 xss:space-y-5">
        <div>
          <h2 className="2xl:text-[30px] xss:text-base text-[24px] font-bold text-primary-600 mb-7 xss:mb-2">
            {t("ABOUT.WHO_WE_ARE.TITLE")}
          </h2>
          <p className="text-secondary-100 2xl:text-xl text-lg leading-8 xss:text-sm xss:leading-7">
            {t("ABOUT.WHO_WE_ARE.DESCRIPTION")}
          </p>
        </div>

        <div>
          <h2 className="2xl:text-[30px] xss:text-base text-[24px] font-bold text-primary-10 mb-7 xss:mb-2">
            {t("ABOUT.VISION.TITLE")}
          </h2>
          <p className="text-secondary-100 2xl:text-xl text-lg leading-8 xss:text-sm xss:leading-7">
            {t("ABOUT.VISION.DESCRIPTION")}
          </p>
        </div>

        <div>
          <h2 className="2xl:text-[30px] xss:text-base text-[24px] font-bold text-primary-300 mb-7 xss:mb-2">
            {t("ABOUT.MISSION.TITLE")}
          </h2>
          <p className="text-secondary-100 2xl:text-xl text-lg leading-8 xss:text-sm xss:leading-7">
            {t("ABOUT.MISSION.DESCRIPTION")}
          </p>
        </div>

        <div>
          <h2 className="2xl:text-[30px] xss:text-base text-[24px] font-bold text-primary-501 mb-7 xss:mb-2">
            {t("ABOUT.GOALS.TITLE")}
          </h2>
          <ul className="space-y-2">
            {goals.map((goal, index) => (
              <li key={index} className="flex items-start gap-4">
                <Image
                  src="/assets/sponser/Doublearrow.svg"
                  alt="Arrow"
                  width={16}
                  height={16}
                  className={`${selectedLanguage === "ar" ? "rotate-rtl" : ""} object-contain mt-2`}
                />
                <span className="text-secondary-100 2xl:text-xl text-lg pb-5 xss:text-sm xss:leading-5">
                  {goal}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
