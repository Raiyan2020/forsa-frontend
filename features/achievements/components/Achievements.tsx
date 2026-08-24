"use client";

import React from "react";
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

  // Economic impact = volunteer hours × the backend's KWD rate. The rate is
  // admin-editable, so it is always read from the payload; the literal is only a
  // last resort for a response that predates the field.
  const economicImpactRate = chartData?.economic_impact_rate_kwd ?? 6;
  const economicImpact =
    chartData?.economic_impact_kwd ??
    (typeof totalVolunteerHours === "number"
      ? totalVolunteerHours * economicImpactRate
      : 0);

  /**
   * Beneficiaries = people helped by charity volunteer opportunities plus
   * learners who actually attended a course. The backend does the arithmetic;
   * `beneficiaries_breakdown` is offered as the tooltip detail.
   */
  const beneficiariesCount = chartData?.beneficiaries_count;
  const beneficiariesBreakdown = chartData?.beneficiaries_breakdown;
  const beneficiariesTooltip = beneficiariesBreakdown
    ? [
        `${t("ACHIEVEMENTS.VOL_OPP_COMPLETED")}: ${
          beneficiariesBreakdown.volunteer_opportunities ?? 0
        }`,
        `${t("ACHIEVEMENTS.COURSE_LEARNERS")}: ${
          beneficiariesBreakdown.course_learners ?? 0
        }`,
      ].join("\n")
    : undefined;

  /**
   * The backend flags which counters to show via `counter_visibility` on the
   * statistics payload — volunteer hours/opportunities are always true there,
   * the rest true only once they have a value (confirmed live 2026-08-24).
   * Falls back to the previous zero-value heuristic for a payload that
   * predates the field.
   */
  const counterVisibility = chartData?.counter_visibility as
    | Record<string, boolean>
    | undefined;

  const showCounter = (key: string, hasValue: boolean) =>
    counterVisibility ? counterVisibility[key] === true : hasValue;

  const statCards: Array<{
    key: string;
    value: string;
    label: string;
    tooltip?: string;
    className: string;
    valueClassName: string;
  }> = [
    {
      key: "volunteer-opportunities",
      value: String(vol_opp_completed || 0),
      label: t("ACHIEVEMENTS.VOL_OPP_COMPLETED"),
      className: "bg-[#9F6DEE4D]/30 text-[#9F6DEE]",
      valueClassName: "text-[#9F6DEE]",
    },
    ...(showCounter("development", Boolean(learnserve_opp_completed))
      ? [
          {
            key: "development",
            value: String(learnserve_opp_completed || 0),
            label: t("ACHIEVEMENTS.LEARN_SERVE_COMPLETED"),
            className: "bg-[#7A92FF] text-[#29246D]",
            valueClassName: "text-[#29246D]",
          },
        ]
      : []),
    ...(showCounter("outside_kuwait", Boolean(relief_trips))
      ? [
          {
            key: "outside-kuwait",
            value: String(relief_trips || 0),
            label: t("ACHIEVEMENTS.RELIEF_TRIP"),
            className: "bg-[#D9EF61] text-[#4E5B08]",
            valueClassName: "text-[#4E5B08]",
          },
        ]
      : []),
    ...(showCounter("beneficiaries", Boolean(beneficiariesCount))
      ? [
          {
            key: "beneficiaries",
            value: Number(beneficiariesCount || 0).toLocaleString(),
            label: t("ACHIEVEMENTS.BENEFICIARIES"),
            tooltip: beneficiariesTooltip,
            className: "bg-[#70B4C24D]/30 text-[#1F6675]",
            valueClassName: "text-[#1F6675]",
          },
        ]
      : []),
    ...(showCounter("economic_impact", Boolean(economicImpact))
      ? [
          {
            key: "economic-impact",
            value: `${economicImpact.toLocaleString()} ${t("COMMON.KWD")}`,
            label: t("ACHIEVEMENTS.ECONOMIC_IMPACT"),
            className: "bg-[#FC95554D]/30 text-[#B4531C]",
            valueClassName: "text-[#B4531C]",
          },
        ]
      : []),
  ];

  // Keeps the row on one line whatever survived the zero-filter above.
  const statGridColumns =
    {
      1: "lg:grid-cols-1",
      2: "lg:grid-cols-2",
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
      5: "lg:grid-cols-5",
    }[statCards.length] ?? "lg:grid-cols-4";

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
              {/* Mobile keeps all the surviving counters on one row rather than
                  stacking them, so it scrolls sideways instead of downwards. */}
              <div
                className={`grid gap-[15px] ${statGridColumns} md:grid-cols-2 grid-flow-col auto-cols-[minmax(140px,1fr)] md:grid-flow-row md:auto-cols-auto overflow-x-auto md:overflow-visible pb-2 md:pb-0`}
              >
                {statCards.map((card) => (
                  <div
                    key={card.key}
                    className={`${card.className} rounded-[20px] 2xl:p-5 p-5 laptopmain:p-2 lg:p-2 text-center w-full md:w-auto h-[137px] flex flex-col justify-center`}
                    title={card.tooltip}
                  >
                    <div
                      className={`text-xl font-semibold ${card.valueClassName} pb-3 h-[40px]`}
                    >
                      {card.value}
                    </div>
                    <div
                      className={`2xl:h-[100px] laptop:h-[50px] laptopmain:h-[40px] lg:h-[50px] h-auto 2xl:text-base laptop:text-base laptopmain:text-sm ${card.valueClassName} font-semibold flex items-start justify-center`}
                    >
                      {card.label}
                    </div>
                  </div>
                ))}
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

/**
 * Podium slots, keyed by rank. Every dimension is a plain size class — the old
 * layout stacked negative percentage offsets on absolutely positioned heads,
 * which drifted at every breakpoint and pushed the Arabic labels out of their
 * pedestals. Here the head sits *above* the pedestal in normal flow and only
 * the rank pill is absolute, so the columns can never overlap.
 */
const PODIUM_SLOTS = {
  1: {
    rank: "1",
    bar: "bg-[#29246D]",
    ring: "ring-[#29246D]",
    pillText: "text-[#29246D]",
    valueColor: "text-[#D9EF61]",
    labelColor: "text-[#D9EF61]/85",
    shadow: "shadow-[0_20px_45px_-22px_rgba(41,36,109,0.75)]",
    height: "h-[132px] xsl:h-[210px] md:h-[280px] lg:h-[330px] 2xl:h-[400px]",
    avatar: "w-[68px] h-[68px] xsl:w-24 xsl:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32",
    initials: "bg-[#29246D] text-[#D9EF61]",
  },
  2: {
    rank: "2",
    bar: "bg-[#D9EF61]",
    ring: "ring-[#C4DC3F]",
    pillText: "text-[#4E5B08]",
    valueColor: "text-[#29246D]",
    labelColor: "text-[#29246D]/70",
    shadow: "shadow-[0_18px_40px_-24px_rgba(78,91,8,0.55)]",
    height: "h-[96px] xsl:h-[160px] md:h-[215px] lg:h-[255px] 2xl:h-[310px]",
    avatar: "w-[56px] h-[56px] xsl:w-20 xsl:h-20 md:w-24 md:h-24 lg:w-[104px] lg:h-[104px]",
    initials: "bg-[#D9EF61] text-[#4E5B08]",
  },
  3: {
    rank: "3",
    bar: "bg-[#70B4C2]",
    ring: "ring-[#5AA0AF]",
    pillText: "text-[#1F6675]",
    valueColor: "text-white",
    labelColor: "text-white/85",
    shadow: "shadow-[0_18px_40px_-24px_rgba(31,102,117,0.55)]",
    height: "h-[76px] xsl:h-[130px] md:h-[180px] lg:h-[215px] 2xl:h-[260px]",
    avatar: "w-[56px] h-[56px] xsl:w-20 xsl:h-20 md:w-24 md:h-24 lg:w-[104px] lg:h-[104px]",
    initials: "bg-[#70B4C2] text-white",
  },
} as const;

type PodiumSlot = (typeof PODIUM_SLOTS)[keyof typeof PODIUM_SLOTS];

const CrownIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="w-5 h-5 xsl:w-6 xsl:h-6 md:w-7 md:h-7 text-[#E8B10D] drop-shadow-sm"
    fill="currentColor"
  >
    <path d="M3 8.2a1.2 1.2 0 0 1 1.94-.94l3.1 2.48 2.86-4.77a1.28 1.28 0 0 1 2.2 0l2.86 4.77 3.1-2.48A1.2 1.2 0 0 1 21 8.2l-1.36 8.15A1.6 1.6 0 0 1 18.06 17.7H5.94a1.6 1.6 0 0 1-1.58-1.35L3 8.2Z" />
    <rect x="5.6" y="19" width="12.8" height="2.2" rx="1.1" />
  </svg>
);

const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  data,
  type,
  t,
}) => {
  const topThree: (LeaderboardItem | null)[] = [
    ...(data || []).slice(0, 3),
    null,
    null,
    null,
  ].slice(0, 3);

  // Rendered left-to-right as 2 – 1 – 3; the grid mirrors itself under `dir=rtl`.
  const podiumOrder = [
    { item: topThree[1], slot: PODIUM_SLOTS[2] },
    { item: topThree[0], slot: PODIUM_SLOTS[1] },
    { item: topThree[2], slot: PODIUM_SLOTS[3] },
  ];

  const getDisplayValue = (item: LeaderboardItem) => {
    switch (type) {
      case "individuals":
        return item.total_hours || 0;
      case "teams":
        return item.executed_opportunities || 0;
      case "companies":
        return item.sponsored_count || 0;
      default:
        return 0;
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

  const getProfileImage = (item: LeaderboardItem) => {
    if (item.profile_pic) return item.profile_pic;
    if (type === "individuals") {
      return getDefaultProfileImage(
        item.gender_display?.value_en,
        dummyimg4,
        dummyimg,
        dummyimg2
      );
    }
    return dummyimg2;
  };

  const getName = (item: LeaderboardItem | null) => {
    if (!item) return t("COMMON.NO_DATA");
    return (
      (item as { nickname?: string }).nickname ||
      item.name ||
      item.organization_name ||
      t("COMMON.NO_DATA")
    );
  };

  const getProfileHref = (item: LeaderboardItem) =>
    item.user_type === "volunteer" && !item.is_public
      ? `/volunteer-private-profile/${item.user_id}`
      : `/public-profile/${item.user_id || item.organization_id}`;

  const renderAvatar = (item: LeaderboardItem, slot: PodiumSlot) => {
    const profilePic = getProfileImage(item);
    const name = getName(item);
    const shared = `${slot.avatar} rounded-full object-cover bg-white ring-2 ${slot.ring} ring-offset-2 ring-offset-white shadow-[0_10px_25px_-12px_rgba(41,36,109,0.45)] transition-transform duration-200 group-hover:-translate-y-1`;

    if (profilePic) {
      return <img src={profilePic} alt={name} className={shared} />;
    }

    return (
      <div
        className={`${shared} ${slot.initials} flex items-center justify-center text-xl md:text-2xl font-bold`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#D5D2E8] bg-[#FAFAFD] py-12 text-center">
        <p className="text-[#8B87A6] text-base md:text-lg">
          {t("COMMON.NO_DATA_AVAILABLE")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 md:mt-12 mb-6 grid grid-cols-3 items-end gap-2 xsl:gap-4 md:gap-5">
      {podiumOrder.map(({ item, slot }) => {
        const name = getName(item);
        const isEmpty = !item || name === t("COMMON.NO_DATA");

        const head = isEmpty ? (
          <div className="flex flex-col items-center gap-2 pb-4 md:pb-6">
            <div
              className={`${slot.avatar} rounded-full border border-dashed border-[#D5D2E8] bg-[#FAFAFD]`}
            />
            <span className="text-[11px] xsl:text-sm md:text-base font-semibold text-[#A8A4C0]">
              {t("COMMON.NO_DATA")}
            </span>
          </div>
        ) : (
          <Link
            href={getProfileHref(item)}
            className="group flex flex-col items-center gap-2 pb-4 md:pb-6 outline-none focus-visible:ring-2 focus-visible:ring-[#29246D]/40 rounded-2xl px-1"
          >
            {slot.rank === "1" && <CrownIcon />}
            {renderAvatar(item, slot)}
            <span className="max-w-full text-center text-[11px] xsl:text-sm md:text-base lg:text-lg font-bold text-primary-5 leading-snug line-clamp-2 break-words group-hover:underline decoration-2 underline-offset-4">
              {name}
            </span>
          </Link>
        );

        return (
          <div key={slot.rank} className="flex flex-col items-center justify-end">
            {head}

            <div
              className={`relative w-full ${slot.height} rounded-t-[18px] xsl:rounded-t-[26px] md:rounded-t-[32px] flex items-center justify-center px-1 ${
                isEmpty
                  ? "bg-[#F4F3F9] border border-b-0 border-dashed border-[#D5D2E8]"
                  : `${slot.bar} ${slot.shadow}`
              }`}
            >
              {/* Rank pill straddles the pedestal edge — a fixed translate, so it
                  never drifts the way the old percentage offsets did. */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white ring-1 ${slot.ring} ${slot.pillText} shadow-[0_6px_16px_-6px_rgba(41,36,109,0.35)] w-8 h-8 xsl:w-11 xsl:h-11 md:w-14 md:h-14 lg:w-16 lg:h-16 text-sm xsl:text-xl md:text-2xl lg:text-3xl font-bold`}
              >
                {slot.rank}
              </span>

              {!isEmpty && (
                <div className="flex flex-col items-center justify-center gap-0.5 md:gap-1 pt-3 md:pt-5 text-center">
                  <span
                    className={`${slot.valueColor} font-bold leading-none text-xl xsl:text-4xl md:text-5xl lg:text-[56px] 2xl:text-[64px] tabular-nums`}
                  >
                    {getDisplayValue(item).toLocaleString()}
                  </span>
                  <span
                    className={`${slot.labelColor} font-medium leading-snug text-[10px] xsl:text-sm md:text-base lg:text-lg`}
                  >
                    {getDisplayLabel()}
                  </span>
                </div>
              )}
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

  /**
   * One row body, shared by the linked and the unlinked variant so the two can
   * never drift apart the way the duplicated markup used to.
   */
  const renderRow = (item: TableItem, rank: number) => (
    <>
      <div className="flex items-center gap-3 md:gap-5 min-w-0">
        <span className="w-7 md:w-9 shrink-0 text-center text-base md:text-xl font-bold text-[#A8A4C0] tabular-nums">
          {rank}
        </span>
        <img
          src={getProfileImage(item)}
          alt={getName(item)}
          className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full object-cover bg-white ring-1 ring-[#E7E5FF]"
        />
        <span className="min-w-0 truncate text-sm md:text-lg font-semibold text-[#4A4665]">
          {getName(item)}
        </span>
      </div>
      <div className="shrink-0 rounded-full bg-[#E7E5FF] px-3 md:px-5 py-2 md:py-2.5">
        <span className="text-xs md:text-base font-bold text-[#5A5380] whitespace-nowrap">
          {getDisplayValue(item)}
        </span>
      </div>
    </>
  );

  return (
    <ul className="flex flex-col gap-3 md:gap-4">
      {tableData.map((item: TableItem, index) => {
        const rank = startRank + index;
        const isLinked = getName(item) !== t("COMMON.NO_DATA");
        const rowClass =
          "flex items-center justify-between gap-3 rounded-[18px] border border-[#E4E2F0] bg-white px-4 md:px-7 py-3 md:py-4 min-h-[72px] md:min-h-[88px]";

        return (
          <li key={item.user_id || item.organization_id || index}>
            {isLinked ? (
              <Link
                href={
                  item?.user_type === "volunteer" && !item?.is_public
                    ? `/volunteer-private-profile/${item?.user_id}`
                    : `/public-profile/${item?.user_id || item?.organization_id}`
                }
                className={`${rowClass} transition-all duration-200 hover:border-[#C9C4E6] hover:shadow-[0_10px_28px_-18px_rgba(41,36,109,0.45)]`}
              >
                {renderRow(item, rank)}
              </Link>
            ) : (
              <div className={rowClass}>{renderRow(item, rank)}</div>
            )}
          </li>
        );
      })}
    </ul>
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
