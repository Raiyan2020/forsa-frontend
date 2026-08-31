"use client";

import { useTranslation } from "react-i18next";
import Title from "@/components/shared/Title";

const ForsaCommunity = () => {
  const { t } = useTranslation();

  return (
    <div className="relative volunteercontributions dotlist-white">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
        <div className="flex justify-between items-center mb-[25px] 2xl:mb-[50px] laptop:mb-[40px] lg:mb-[24px] md:mb-[30px] 2xl:px-5 px-3 mobilescreen:px-[13px]">
          <h2 className="mobilescreen:text-start">
            <Title
              className="text-start"
              text={t("COMMON.FORSA.COMMUNITY-")}
              hasMargin={false}
            />
          </h2>
        </div>
      </div>
    </div>
  );
};

export default ForsaCommunity;
