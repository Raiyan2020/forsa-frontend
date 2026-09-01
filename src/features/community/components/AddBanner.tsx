"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { getAchievementsTeamsData } from "@/features/achievements/services/achievementsApi";
import { useTranslation } from "react-i18next";

function AddBanner() {
  const { t } = useTranslation();

  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ["achievementsTeamsData"],
    queryFn: getAchievementsTeamsData,
  });

  const topIndividual = achievementsData?.data?.top_individuals?.[0];

  if (isLoading) {
    return (
      <div className="bg-[#f0eeff] lg:py-[70px] md:py-[40px] py-[40px] lg:my-[70px] md:my-[40px] my-[40px] animate-pulse">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
          <div className="flex mobilescreen:flex-col 2xl:gap-24 lg:gap-5 md:gap-5 gap-5 items-center">
            <div className="2xl:w-1/3 lg:w-1/2 md:w-1/2 mobilescreen:w-1/2 mobilescreen:flex mobilescreen:justify-center">
              <div className="w-[150px] h-[150px] mobilescreen:w-[100px] mobilescreen:h-[100px] bg-white/30 rounded-lg"></div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-white/30 rounded w-3/4"></div>
              <div className="h-8 bg-white/30 rounded w-full"></div>
              <div className="h-8 bg-white/30 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!topIndividual) {
    return (
      <div>
        <div className="bg-[#f0eeff] lg:py-[70px] md:py-[40px] py-[40px] lg:my-[70px] md:my-[40px] my-[40px]">
          <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
            <div className="flex mobilescreen:flex-col 2xl:gap-24 lg:gap-5 md:gap-5 gap-5 items-center">
              <div className="w-1/2 flex justify-center">
                <div className="relative w-[100px] h-[100px]">
                  <Image
                    src="/assets/achivments/dimond.svg"
                    alt="Diamond"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
              <div>
                <p className="text-[#29246d] 2xl:text-[45px] lg:text-[34px] md:text-[34px] text-[29px] mobilescreen:text-center 2xl:leading-[61px] lg:leading-[40px] md:leading-[40px] leading-[40px] font-semibold xss:text-2xl">
                  {t("COMMON.CONGRATULATIONS_MESSAGE_NO_RECORD")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-[#f0eeff] lg:py-[70px] md:py-[40px] py-[40px] lg:my-[70px] md:my-[40px] my-[40px]">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
          <div className="flex mobilescreen:flex-col 2xl:gap-24 lg:gap-5 md:gap-5 gap-5 items-center">
            <div className="2xl:w-1/3 lg:w-1/2 md:w-1/2 mobilescreen:w-1/2 mobilescreen:flex mobilescreen:justify-center">
              <div className="relative w-[150px] h-[150px] mobilescreen:w-[100px] mobilescreen:h-[100px]">
                <Image
                  src="/assets/achivments/dimond.svg"
                  alt="Diamond"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
            <div>
              <p className="text-[#29246d] 2xl:text-[45px] lg:text-[34px] md:text-[34px] text-[29px] mobilescreen:text-center 2xl:leading-[61px] lg:leading-[40px] md:leading-[40px] leading-[40px] font-semibold xss:text-2xl">
                {t("COMMON.CONGRATULATIONS_MESSAGE")}{" "}
                <span className="text-[#5271ff]">
                  {topIndividual.nickname || topIndividual.name}
                </span>{" "}
                <span className="text-[#000000]">
                  {t("COMMON.JUST_RECORDED")}
                </span>{" "}
                <span className="text-[#5271ff]">
                  {topIndividual.total_hours} {t("COMMON.NEW_HOURS")}
                </span>{" "}
                <span className="text-[#000000]">
                  {t("COMMON.GOODNESS_RECORD")}
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddBanner;
