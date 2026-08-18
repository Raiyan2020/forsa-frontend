"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import Loader from "@/components/ui/Loader";
import Link from "next/link";
import { getDefaultProfileImage } from "@/lib/helpers";
import { getAchievementsChartData, getAchievementsTeamsData } from "@/features/services/api";

import DonutChart from "./DonutChart";
import Barchart from "./Barchart";

export type LeaderboardType = "individuals" | "teams" | "companies";

export interface LeaderboardItem {
  user_id?: string;
  organization_id?: string;
  name?: string;
  organization_name?: string;
  profile_pic?: string;
  total_hours?: number;
  executed_opportunities?: number;
  sponsored_count?: number;
  gender_display?: {
    id: number;
    choice_type: string;
    value_en: string;
    value_ar: string;
  };
  user_type?: "volunteer" | "organization";
  is_public?: boolean;
  badge_info?: {
    id: number;
    name: string;
  };
}

export interface LeaderboardPodiumProps {
  data: (LeaderboardItem | null)[];
  type: LeaderboardType;
  t: (key: string) => string;
}

export interface LeaderboardTableProps {
  data: LeaderboardItem[];
  type: LeaderboardType;
  startRank?: number;
  t: (key: string) => string;
}

export interface AchievementSectionProps {
  title: string;
  data: LeaderboardItem[];
  type: LeaderboardType;
  t: (key: string) => string;
}

export interface TableItem {
  user_id?: string;
  organization_id?: string;
  profile_pic?: string;
  name?: string;
  organization_name?: string;
  total_hours?: number;
  executed_opportunities?: number;
  sponsored_count?: number;
  gender_display?: {
    id: number;
    choice_type: string;
    value_en: string;
    value_ar: string;
  };
  user_type?: "volunteer" | "organization";
  is_public?: boolean;
  badge_info?: {
    id: number;
    name: string;
  };
}

const dummyimg = "/assets/profile/female_profile.svg";
const dummyimg2 = "/assets/profile/org_profile.svg";
const dummyimg4 = "/assets/profile/male_profile.svg";
const img2 = "/assets/achivments/i1.svg";

export default function Achievements() {
  const { t } = useTranslation();

  const { data: apiResponseForChart, isLoading: chartLoading } = useQuery({
    queryKey: ["achievementsChartData"],
    queryFn: getAchievementsChartData,
  });

  const { data: apiResponseForTop, isLoading: topLoading } = useQuery({
    queryKey: ["achievementsTeamsData"],
    queryFn: getAchievementsTeamsData,
  });

  const chartData = apiResponseForChart?.data;
  const topData = apiResponseForTop?.data;
  const totalVolunteerHours = chartData?.grand_total_hours;
  const vol_opp_completed = chartData?.volunteer_opportunities_completed;
  // The backend renamed both counters and kept the old keys as aliases:
  // learn & share → development, relief → outside Kuwait.
  const learnserve_opp_completed =
    chartData?.development_opportunities_completed ??
    chartData?.learn_serve_opportunities_completed;
  const relief_trips = chartData?.outside_kuwait_trips ?? chartData?.relief_trips;

  // Economic impact = volunteer hours × the backend's KWD rate (6 by default).
  // Prefer the computed value from the API and only fall back to the formula.
  const economicImpactRate = chartData?.economic_impact_rate_kwd ?? 6;
  const economicImpact =
    chartData?.economic_impact_kwd ??
    (typeof totalVolunteerHours === "number"
      ? totalVolunteerHours * economicImpactRate
      : 0);

  const buildLeaderboardTitle = (
    section: LeaderboardType,
    cycleType?: string,
    cycleYear?: number,
    cycleIndex?: number,
    startDate?: string
  ) => {
    let year = cycleYear;
    let index = cycleIndex;

    if (startDate && (!year || !index)) {
      const startMoment = moment(startDate);
      year = startMoment.year();

      switch (cycleType?.toLowerCase()) {
        case "monthly":
          index = startMoment.month() + 1;
          break;
        case "quarterly":
          index = Math.floor(startMoment.month() / 3) + 1;
          break;
        case "semi_annual":
          index = startMoment.month() < 6 ? 1 : 2;
          break;
        case "annual":
        default:
          index = 1;
          break;
      }
    }

    year = year || moment().year();
    index = index || 1;

    const getMonthName = (monthIndex: number) => {
      const monthKeys = [
        "COMMON.JANUARY", "COMMON.FEBRUARY", "COMMON.MARCH", "COMMON.APRIL",
        "COMMON.MAY", "COMMON.JUNE", "COMMON.JULY", "COMMON.AUGUST",
        "COMMON.SEPTEMBER", "COMMON.OCTOBER", "COMMON.NOVEMBER", "COMMON.DECEMBER"
      ];
      return t(monthKeys[monthIndex - 1] || monthKeys[0]);
    };

    const getQuarterName = (quarterIndex: number) => {
      return t(`COMMON.Q${quarterIndex}`);
    };

    const getHalfName = (halfIndex: number) => {
      return halfIndex === 1 ? t("COMMON.FIRST_HALF") : t("COMMON.SECOND_HALF");
    };

    let periodLabel = "";
    let translationKey = "";

    switch (cycleType?.toLowerCase()) {
      case "monthly":
        periodLabel = `${getMonthName(index)}\u00A0\u00A0${year}`;
        translationKey = "MONTHLY";
        break;
      case "quarterly":
        periodLabel = `${getQuarterName(index)}\u00A0\u00A0${year}`;
        translationKey = "QUARTERLY";
        break;
      case "semi_annual":
        periodLabel = `${getHalfName(index)}\u00A0\u00A0${year}`;
        translationKey = "SEMI_ANNUAL";
        break;
      case "annual":
      default:
        periodLabel = `${year}`;
        translationKey = "ANNUAL";
        break;
    }

    switch (section) {
      case "individuals":
        return t(`ACHIEVEMENTS.VOLUNTEER_HEROES_${translationKey}`, { period: periodLabel });
      case "teams":
        return t(`ACHIEVEMENTS.MOST_ACTIVE_TEAMS_${translationKey}`, { period: periodLabel });
      case "companies":
        return t(`ACHIEVEMENTS.ENTITIES_MADE_DIFFERENCE_${translationKey}`, { period: periodLabel });
      default:
        return t("COMMON.NO_DATA");
    }
  };

  return (
    <div className="w-full border-t border-[#000]">
      <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] md:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px]">
        {/* Area of volunteering section */}
        <section className="">
          <div className="grid lg:grid-cols-[65%_35%] md:grid-rows-[65%_35%] miniscreen2:block items-start lg:flex md:block md:justify-between w-full lg:mb-[93px] md:mb-[40px] mb-1">
            {/* Event organization */}
            <div className="w-full lg:md:w-[65%] md:w-[100%] miniscreen2:w-full">
              <h2 className="2xl:text-[50px] lg:text-[40px] miniscreen2:mb-10 md:text-[40px] text-[40px] font-bold text-primary-5 lg:mb-[85px] md:mb-[40px] mb-[40px] 2xl:leading-[65px] lg:leading-[50px] leading-[50px]">
                {t("ACHIEVEMENTS.AREA_VOLUNTEERING_TITLE")}
              </h2>
              <div className="relative flex items-center justify-center hidden mobilescreen:block xss:mb-1">
                <DonutChart
                  totalVolunteerHours={totalVolunteerHours}
                  volOppCompleted={vol_opp_completed}
                  learnserveOppCompleted={learnserve_opp_completed}
                  reliefTrips={relief_trips}
                />
              </div>
              <div className="grid gap-[15px] lg:grid-cols-4 md:grid-cols-2 xss:grid-cols-1">
                <div className="bg-[#9F6DEE4D]/30 rounded-[20px] 2xl:p-5 p-5 laptopmain:p-2 lg:p-2 text-center w-full md:w-auto h-[137px] flex flex-col justify-center">
                  <div className="text-xl font-semibold text-[#9F6DEE] pb-3 h-[40px]">
                    {vol_opp_completed || 0}
                  </div>
                  <div className="2xl:h-[100px] laptop:h-[50px] laptopmain:h-[40px] lg:h-[50px] h-auto 2xl:text-base laptop:text-base laptopmain:text-sm text-[#9F6DEE] font-semibold flex items-start justify-center">
                    {t("ACHIEVEMENTS.VOL_OPP_COMPLETED")}
                  </div>
                </div>
                <div className="bg-[#7A92FF] rounded-[20px] 2xl:p-5 p-5 laptopmain:p-2 lg:p-2 text-center w-full md:w-auto h-[137px] flex flex-col justify-center">
                  <div className="text-xl text-[#29246D] font-semibold pb-3 h-[40px]">
                    {learnserve_opp_completed || 0}
                  </div>
                  <div className="2xl:h-[100px] laptop:h-[50px] laptopmain:h-[40px] lg:h-[50px] h-auto 2xl:text-base laptop:text-base laptopmain:text-sm text-[#29246D] font-semibold flex items-start justify-center">
                    {t("ACHIEVEMENTS.LEARN_SERVE_COMPLETED")}
                  </div>
                </div>
                <div className="bg-[#D9EF61] rounded-[20px] 2xl:p-5 p-5 laptopmain:p-2 lg:p-2 text-center w-full md:w-auto h-[137px] flex flex-col justify-center">
                  <div className="text-xl text-[#4E5B08] font-semibold pb-3 h-[40px]">
                    {relief_trips || 0}
                  </div>
                  <div className="2xl:h-[100px] laptop:h-[50px] laptopmain:h-[40px] lg:h-[50px] h-auto 2xl:text-base laptop:text-base laptopmain:text-sm text-[#4E5B08] font-semibold flex items-start justify-center">
                    {t("ACHIEVEMENTS.RELIEF_TRIP")}
                  </div>
                </div>
                <div className="bg-[#FC95554D]/30 rounded-[20px] 2xl:p-5 p-5 laptopmain:p-2 lg:p-2 text-center w-full md:w-auto h-[137px] flex flex-col justify-center">
                  <div className="text-xl text-[#B4531C] font-semibold pb-3 h-[40px]">
                    {economicImpact.toLocaleString()} {t("COMMON.KWD")}
                  </div>
                  <div className="2xl:h-[100px] laptop:h-[50px] laptopmain:h-[40px] lg:h-[50px] h-auto 2xl:text-base laptop:text-base laptopmain:text-sm text-[#B4531C] font-semibold flex items-start justify-center">
                    {t("ACHIEVEMENTS.ECONOMIC_IMPACT")}
                  </div>
                </div>
              </div>
            </div>

            {/* Donut chart */}
            <div className="relative miniscreen2:justify-center miniscreen2:w-full miniscreen2:pt-5 w-full lg:w-[35%] md:w-[100%] flex items-center lg:justify-end md:justify-center justify-center mt-8 md:mt-0 lg:pt-0 md:pt-10">
              <div className="relative items-center justify-center flex mobilescreen:hidden">
                <DonutChart
                  totalVolunteerHours={totalVolunteerHours}
                  volOppCompleted={vol_opp_completed}
                  learnserveOppCompleted={learnserve_opp_completed}
                  reliefTrips={relief_trips}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Volunteer hours over the past years */}
        <div>
          {chartLoading ? (
            <Loader />
          ) : (
            <Barchart data={chartData?.yearly_hours || []} />
          )}
        </div>

        {/* Top Leaders sections */}
        {topLoading ? (
          <Loader />
        ) : (
          <>
            <AchievementSection
              title={buildLeaderboardTitle(
                "individuals",
                topData?.cycle_type,
                topData?.cycle_year,
                topData?.cycle_index,
                topData?.start_date
              )}
              data={topData?.top_individuals}
              type="individuals"
              t={t}
            />
            <AchievementSection
              title={buildLeaderboardTitle(
                "teams",
                topData?.cycle_type,
                topData?.cycle_year,
                topData?.cycle_index,
                topData?.start_date
              )}
              data={topData?.top_volunteer_teams}
              type="teams"
              t={t}
            />
          </>
        )}

        <AchievementSection
          title={buildLeaderboardTitle(
            "companies",
            topData?.cycle_type,
            topData?.cycle_year,
            topData?.cycle_index,
            topData?.start_date
          )}
          data={topData?.top_companies_and_government}
          type="companies"
          t={t}
        />
      </div>
    </div>
  );
}

const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  data,
  type,
  t,
}) => {
  const getTopThree = () => {
    const topThree = [...(data || [])].slice(0, 3);
    while (topThree.length < 3) {
      topThree.push(null);
    }
    return topThree;
  };
  const { i18n } = useTranslation();

  const topThree = getTopThree();
  const podiumOrder = [topThree[1], topThree[0], topThree[2]];

  const getPodiumConfig = (position: 0 | 1 | 2) => {
    const configs = {
      0: {
        bg: "bg-[#D9EF61]",
        border: "border-[#d9ef61]",
        rank: "2",
        height: "lg:h-[395px] xsl:h-[200px] md:h-[300px] xss:h-[92px]",
        topOffset: "lg:top-[-65%] xsl:top-[-80%] md:top-[-65%] xss:top-[-155%]",
        textColor: "text-primary-5",
      },
      1: {
        bg: "bg-[#29246D]",
        border: "border-[#29246D]",
        rank: "1",
        height: "lg:h-[508px] xsl:h-[350px] md:h-[450px] xss:h-[125px]",
        topOffset: "lg:top-[-50%] md:top-[-45%] xsl:top-[-45%] xss:top-[-116%]",
        textColor: "text-primary-505",
      },
      2: {
        bg: "bg-[#70B4C2]",
        border: "border-[#70B4C2]",
        rank: "3",
        height: "lg:h-[395px] xsl:h-[200px] md:h-[300px] xss:h-[92px]",
        topOffset: "lg:top-[-65%] xsl:top-[-80%] md:top-[-65%] xss:top-[-155%]",
        textColor: "text-white",
      },
    } as const;
    return configs[position];
  };

  const getDisplayValue = (item: {
    total_hours?: number;
    executed_opportunities?: number;
    sponsored_count?: number;
  }) => {
    if (!item) return "0";
    switch (type) {
      case "individuals":
        return item.total_hours || 0;
      case "teams":
        return item.executed_opportunities || 0;
      case "companies":
        return item.sponsored_count || 0;
      default:
        return "0";
    }
  };

  const getDisplayLabel = () => {
    switch (type) {
      case "individuals":
        return t("ACHIEVEMENTS.VOLUNTEER_HOUR");
      case "teams":
        return t("COMMON.OPPORTUNITY");
      case "companies":
        return t("COMMON.SPONSORED_OPPORTUNITIES");
      default:
        return "";
    }
  };

  const getProfileImage = (item: {
    profile_pic?: string;
    gender_display?: { value_en: string };
  }) => {
    if (!item) return null;

    if (type === "individuals" && !item.profile_pic) {
      return getDefaultProfileImage(
        item.gender_display?.value_en,
        dummyimg4,
        dummyimg,
        dummyimg2
      );
    } else if ((type === "teams" || type === "companies") && !item.profile_pic) {
      return dummyimg2;
    }

    return item.profile_pic || null;
  };

  const getName = (item: {
    nickname?: string;
    name?: string;
    organization_name?: string;
  }) => {
    if (!item) return t("COMMON.NO_DATA");
    return (
      item.nickname ||
      item.name ||
      item.organization_name ||
      t("COMMON.NO_DATA")
    );
  };

  const renderProfileImage = (
    item: {
      nickname?: string;
      organization_name?: string;
      profile_pic?: string;
      gender_display?: { value_en: string };
    },
    config: { border: string }
  ) => {
    const profilePic = getProfileImage(item);
    if (profilePic) {
      return (
        <img
          src={profilePic}
          alt={getName(item)}
          className={`object-cover border ${config.border} rounded-[100px] p-[3px] xss:w-20 xss:h-20 xsl:w-24 xsl:h-24 lg:w-[142px] lg:h-[142px] md:w-24 md:h-24 mobilescreen:w-18 mobilescreen:h-18`}
        />
      );
    } else {
      return (
        <div
          className={`p-[3px] lg:w-[150px] lg:h-[150px] md:w-[110px] md:h-[110px] xsl:w-[80px] xsl:h-[80px] xss:w-[40px] xss:h-[40px] border ${config.border} rounded-[100px]`}
        >
          <div
            className={`flex flex-cols items-center justify-center object-cover bg-primary-5 lg:w-[142px] lg:h-[142px] md:h-[102px] md:w-[102px] w-[100px] h-[100px] xss:w-[33px] xsl:w-[72px] xsl:h-[72px] xss:h-[33px] m-auto rounded-[100px]`}
          >
            <p className="text-base font-bold mobilescreen:text-[5px]">
              {getName(item).charAt(0).toUpperCase()}
            </p>
          </div>
        </div>
      );
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-lg">{t("COMMON.NO_DATA_AVAILABLE")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 items-end gap-0 mb-4 lg:pt-[290px] xsl:pt-[200px] md:pt-[210px] xss:pt-[180px]">
      {podiumOrder?.map((item: LeaderboardItem | null, index) => {
        const config = getPodiumConfig(index as 0 | 1 | 2);
        const displayValue = item ? getDisplayValue(item) : 0;
        const name = item ? getName(item) : t("COMMON.NO_DATA");

        return (
          <div
            key={index}
            className={`${config.bg} relative rounded-t-[30px] ${config.height} text-white border border-gray-100 flex items-center justify-between`}
          >
            {item && name !== t("COMMON.NO_DATA") ? (
              <Link
                href={
                  item?.user_type === "volunteer" && !item?.is_public
                    ? `/volunteer-private-profile/${item?.user_id}`
                    : `/public-profile/${item?.user_id || item?.organization_id}`
                }
                className="w-full h-full"
              >
                <div
                  className={`overflow-hidden absolute ${config.topOffset} flex justify-center mx-auto w-full pb-[100px]`}
                >
                  <div className="relative flex justify-center flex-col items-center">
                    {item && (
                      <div className="i01 relative">
                        {renderProfileImage(item, config)}
                      </div>
                    )}

                    <h3 className="text-center text-secondary-100 2xl:text-xl lg:text-lg md:text-base font-bold pt-4 xss:text-xs xsl:text-sm">
                      {name}
                    </h3>
                  </div>
                </div>
              </Link>
            ) : (
              <div
                className={`overflow-hidden absolute ${config.topOffset} flex justify-center mx-auto w-full pb-[100px]`}
              >
                <div className="relative flex justify-center flex-col items-center">
                  {item && <div>{renderProfileImage(item, config)}</div>}
                  <h3 className="text-center text-secondary-100 2xl:text-xl lg:text-lg md:text-base font-bold pt-4 xss:text-xs xsl:text-sm">
                    {name}
                  </h3>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center font-bold absolute md:top-[-40px] lg:top-[-40px] xsl:top-[-20px] xss:top-[-10px] w-full">
              <span
                className={`lg:w-[177px] xsl:w-[100px] xsl:h-[40px] md:w-[150px] xss:w-[42px] xss:h-[19px] lg:h-[76px] md:h-[76px] bg-[#E7E5FF] border ${config.border} rounded-[40px] text-[#29246D] text-center flex justify-center flex-col font-bold lg:text-[40px] md:text-[40px] xss:text-xs`}
              >
                <p className={`relative ${i18n.language === "ar" ? "top-[0px]" : "top-0"}`}>
                  {config.rank}
                </p>
              </span>
            </div>

            <div className="flex flex-col justify-center mx-auto 2xl:gap-12 lg:gap-6 xss:gap-2">
              <h3 className={`${config.textColor} font-bold 2xl:text-[70px] xsl:text-[50px] lg:text-[40px] md:text-[40px] xss:text-base text-center`}>
                {displayValue}
              </h3>
              <p
                className={`2xl:text-[40px] lg:text-[24px] md:text-2xl xsl:text-lg ${config.textColor} xss:text-xs text-center`}
                style={{ lineHeight: "normal" }}
              >
                {getDisplayLabel()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  data,
  type,
  startRank = 4,
  t,
}) => {
  if (!data || data.length <= 3) {
    return null;
  }

  const tableData = data.slice(3);

  const getDisplayValue = (item: {
    total_hours?: number;
    executed_opportunities?: number;
    sponsored_count?: number;
  }) => {
    switch (type) {
      case "individuals":
        return `${item.total_hours || 0} ${t("ACHIEVEMENTS.HOURS")}`;
      case "teams":
        return `${item.executed_opportunities || 0} ${t("COMMON.OPPORTUNITY")}`;
      case "companies":
        return `${item.sponsored_count || 0} ${t("COMMON.SPONSORED_OPPORTUNITIES")}`;
      default:
        return "0";
    }
  };

  const getName = (item: {
    nickname?: string;
    name?: string;
    organization_name?: string;
  }) => {
    return (
      item.nickname ||
      item.name ||
      item.organization_name ||
      t("COMMON.NO_DATA")
    );
  };

  const getProfileImage = (item: {
    profile_pic?: string;
    gender_display?: { value_en: string };
  }) => {
    if (type === "individuals" && !item.profile_pic) {
      return getDefaultProfileImage(
        item.gender_display?.value_en,
        dummyimg4,
        dummyimg,
        dummyimg2
      );
    } else if ((type === "teams" || type === "companies") && !item.profile_pic) {
      return dummyimg2;
    }
    return item.profile_pic || img2;
  };

  return (
    <div className="overflow-x-auto mobilescreen:pr-0">
      <table className="table-auto w-full border-separate border-spacing-y-4">
        <tbody>
          {tableData.map((item: TableItem, index) => {
            return (
              <tr key={item.user_id || item.organization_id || index}>
                {getName(item) !== t("COMMON.NO_DATA") ? (
                  <td className="p-0">
                    <Link
                      href={
                        item?.user_type === "volunteer" && !item?.is_public
                          ? `/volunteer-private-profile/${item?.user_id}`
                          : `/public-profile/${item?.user_id || item?.organization_id}`
                      }
                      className="flex items-center justify-between py-4 mobilescreen:py-2 px-7 mobilescreen:px-3 rounded-[15px] border border-[#A6A6A6] h-[95px] w-full cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center overflow-hidden max-w-full">
                        <span className="text-[#696969] text-xl font-bold min-w-[1.5rem]">
                          {startRank + index}
                        </span>
                        <div className="ml-[49px] mobilescreen:ml-2 mobilescreen:mr-2 mr-[13px]">
                          <img
                            src={getProfileImage(item)}
                            alt={getName(item)}
                            className="w-12 h-12 object-cover xss:w-[34px] xss:h-[34px] rounded-full overflow-hidden"
                          />
                        </div>
                        <div className="xs:truncate xs:overflow-hidden xs:max-w-[60px] max-w-none">
                          <span className="text-[#696969] text-xl xss:text-xs font-medium xss:truncate xss:whitespace-nowrap xss:overflow-hidden truncate-none block">
                            {getName(item)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-[13px] rounded-[10px] text-sm font-medium bg-[#E7E5FF] px-3 xss:gap-1 h-[60px] xss:h-[45px] justify-center">
                        <span className="text-[#988FA0] font-bold lg:text-lg md:text-lg xss:text-xs">
                          {getDisplayValue(item)}
                        </span>
                      </div>
                    </Link>
                  </td>
                ) : (
                  <td className="flex items-center justify-between py-4 mobilescreen:py-2 px-7 mobilescreen:px-[13px] rounded-[15px] border border-[#A6A6A6] h-[95px] w-full">
                    <div className="flex items-center overflow-hidden max-w-full">
                      <span className="text-[#696969] text-xl font-bold min-w-[1.5rem]">
                        {startRank + index}
                      </span>
                      <div className="ml-[49px] mobilescreen:ml-2 mobilescreen:mr-2 mr-[13px]">
                        <img
                          src={getProfileImage(item)}
                          alt={getName(item)}
                          className="w-12 h-12 object-cover xss:w-[34px] xss:h-[34px] rounded-full overflow-hidden"
                        />
                      </div>
                      <div className="xs:truncate xs:overflow-hidden xs:max-w-[60px] max-w-none">
                        <span className="text-[#696969] text-xl xss:text-xs font-medium xss:truncate xss:whitespace-nowrap xss:overflow-hidden truncate-none block">
                          {getName(item)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-[13px] rounded-[10px] text-sm font-medium bg-[#E7E5FF] px-3 xss:gap-[10px] h-[60px] xss:h-[45px] justify-center">
                      <span className="text-[#988FA0] font-bold lg:text-lg md:text-lg xss:text-xs">
                        {getDisplayValue(item)}
                      </span>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const AchievementSection: React.FC<AchievementSectionProps> = ({
  title,
  data,
  type,
  t,
}) => {
  return (
    <section className="2xl:mt-[70px] laptopmain:mt-[50px] mt-[40px]">
      <h2 className="2xl:text-[50px] lg:text-[40px] md:text-[40px] text-[40px] xss:text-2xl font-bold text-primary-5">
        {title}
      </h2>
      <LeaderboardPodium data={data} type={type} t={t} />
      <LeaderboardTable data={data} type={type} t={t} />
    </section>
  );
};
