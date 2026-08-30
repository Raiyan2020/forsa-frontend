"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import moment from "moment";
import InfiniteScroll from "react-infinite-scroll-component";

import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLanguageStore } from "@/store/languageStore";
import apiClient from "@/lib/api/client";
import {
  getOpportunityButtonLabelKey,
  getOpportunityButtonState,
  isCreatorRepostState,
} from "@/lib/opportunityButtonState";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import OpportunityBadges, {
  OpportunityVisibilityInfo,
} from "./OpportunityBadges";
import DeleteOpportunityModal from "./DeleteOpportunityModal";
import { AllOpportunitiesFiltersData } from "./AllOpportuniteFilterModal";

interface OpportunityImage {
  image: string;
}

interface VolunteerOpportunityData {
  id: number;
  opportunity_images: OpportunityImage[];
  title_en: string;
  title_ar: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  from_age: number;
  to_age?: number;
  format?: string;
  format_display?: { value_en: string; value_ar: string };
  location_en?: string;
  location_ar?: string;
  registered_volunteers_count: number;
  participants_needed: number;
  interest_display?: Array<{ value_en: string; value_ar: string }>;
  created_by?: { id: number };
  opportunity_status?: string;
  action_state?: string;
  approval_status?: string;
  due_date: string;
  all_registered_user?: Array<{ id: number }>;
  is_supports_disabled?: boolean;
  is_urgent?: boolean;
  is_relief?: boolean;
  is_emergency?: boolean;
  is_public?: boolean;
  is_registered?: boolean;
  is_registration_open?: boolean;
  is_registration_closed?: boolean;
}

interface LearnServeOpportunityData {
  id: number;
  opportunity_images: OpportunityImage[];
  title_en: string;
  title_ar: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  from_age: number;
  to_age?: number;
  format?: string;
  format_display?: { value_en: string; value_ar: string };
  learning_type_display?: { value_en: string; value_ar: string };
  registered_volunteers_count: number;
  participants_needed: number;
  interest_display?: Array<{ value_en: string; value_ar: string }>;
  created_by?: { id: number };
  opportunity_status?: string;
  action_state?: string;
  approval_status?: string;
  due_date: string;
  all_registered_user?: Array<{ id: number }>;
  is_supports_disabled?: boolean;
  is_urgent?: boolean;
  is_relief?: boolean;
  is_emergency?: boolean;
  is_public?: boolean;
  is_registered?: boolean;
  is_registration_open?: boolean;
  is_registration_closed?: boolean;
}

interface VolunteerCardProps {
  buttonText?: string;
  isStatic?: boolean;
  isLearnServe?: boolean;
  isOpportunity?: boolean;
  currentUser?: any;
  filters?: AllOpportunitiesFiltersData;
  searchQuery?: string;
  is_homepage?: boolean;
}

function formatDateRange(
  start_date: string,
  end_date: string,
  locale: string,
  t: (key: string) => string
) {
  const start = moment(start_date, "YYYY-MM-DD");
  const end = moment(end_date, "YYYY-MM-DD");

  const startDay = start.format("DD");
  const endDay = end.format("DD");
  const startMonth = start.month() + 1;
  const endMonth = end.month() + 1;

  const monthKeys = {
    1: "COMMON.JANUARY",
    2: "COMMON.FEBRUARY",
    3: "COMMON.MARCH",
    4: "COMMON.APRIL",
    5: "COMMON.MAY",
    6: "COMMON.JUNE",
    7: "COMMON.JULY",
    8: "COMMON.AUGUST",
    9: "COMMON.SEPTEMBER",
    10: "COMMON.OCTOBER",
    11: "COMMON.NOVEMBER",
    12: "COMMON.DECEMBER",
  };

  const startMonthKey = monthKeys[startMonth as keyof typeof monthKeys];
  const endMonthKey = monthKeys[endMonth as keyof typeof monthKeys];

  if (startMonth === endMonth) {
    if (locale === "ar") {
      return `${endDay}-${startDay} ${t(startMonthKey)}`;
    }
    return `${startDay}-${endDay} ${t(startMonthKey)}`;
  } else {
    if (locale === "ar") {
      return `${startDay} ${t(startMonthKey)} - ${endDay} ${t(endMonthKey)}`;
    }
    return `${startDay} ${t(startMonthKey)} - ${endDay} ${t(endMonthKey)}`;
  }
}

const volunteerStaticData = [
  {
    id: 1,
    image: "/assets/homepage/treeplanting.png",
    title: "Tree planting drive",
    date: "26-27 December",
    time: "10:00 AM - 2:00 PM",
    hours: "4 hrs/day",
    location: "Central park, green",
    spots: "15/20",
    category: "Health",
  },
  {
    id: 2,
    image: "/assets/homepage/treeplanting.png",
    title: "Tree planting drive",
    date: "26-27 December",
    time: "10:00 AM - 2:00 PM",
    hours: "4 hrs/day",
    location: "Central park, green",
    spots: "15/20",
    category: "Health",
  },
  {
    id: 3,
    image: "/assets/homepage/treeplanting.png",
    title: "Tree planting drive",
    date: "26-27 December",
    time: "10:00 AM - 2:00 PM",
    hours: "4 hrs/day",
    location: "Central park, green",
    spots: "15/20",
    category: "Health",
  },
];

export default function OpportunitiesListCard({
  buttonText,
  isStatic = false,
  filters,
  searchQuery = "",
  isLearnServe = false,
  isOpportunity = false,
  currentUser,
  is_homepage = false,
}: VolunteerCardProps) {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();
  const router = useRouter();

  const [deleteModalInfo, setDeleteModalInfo] = useState<{
    isOpen: boolean;
    opportunityId?: string;
    opportunityTitle?: { title_en: string; title_ar: string };
  }>({ isOpen: false });

  // For infinite scroll
  const [currentPage, setCurrentPage] = useState(1);
  const [allOpportunities, setAllOpportunities] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  // `meta.pagination.total` is the count across every page, not just the ones
  // loaded so far — that's the number the result line has to show.
  const [totalResults, setTotalResults] = useState<number | null>(null);

  // Calculate optimal limit based on grid columns
  const calculateOptimalLimit = useCallback((cols: number): number => {
    if (cols === 1) return 9;
    if (cols === 2) return 8;
    if (cols === 3) return 9;
    return 9;
  }, []);

  const [limit, setLimit] = useState(calculateOptimalLimit(1));

  const updateGridColumns = useCallback(() => {
    const width = window.innerWidth;
    let cols = 1;

    if (width >= 1200) cols = 3;
    else if (width >= 768) cols = 2;
    else cols = 1;

    setLimit(calculateOptimalLimit(cols));
  }, [calculateOptimalLimit]);

  useEffect(() => {
    updateGridColumns();
    window.addEventListener("resize", updateGridColumns);
    return () => window.removeEventListener("resize", updateGridColumns);
  }, [updateGridColumns]);

  const getButtonText = (item: VolunteerOpportunityData | LearnServeOpportunityData) => {
    if (buttonText) return buttonText;
    if (!item) return t("COMMON.REGISTER");

    // The creator manages rather than joins: edit while it is still upcoming,
    // repost once it has started or finished.
    if (currentUser && item.created_by?.id === currentUser.id) {
      // Resubmission is only wired up for volunteer opportunities so far.
      if (!isLearnServe && item.approval_status === "rejected") {
        return t("COMMON.EDIT_AND_RESUBMIT");
      }
      if (isCreatorRepostState(item)) {
        return t("COMMON.REPOST");
      }
      return t("COMMON.EDIT_TEXT");
    }

    // `is_registered` is only present for the authenticated viewer, so fall
    // back to scanning the registered list when the flag is absent.
    const isRegistered =
      item.is_registered ??
      (currentUser && Array.isArray(item.all_registered_user)
        ? item.all_registered_user.some((user) => user.id === currentUser.id)
        : undefined);

    const state = getOpportunityButtonState({ ...item, is_registered: isRegistered });

    // Organizations browse other creators' opportunities read-only.
    if (
      state === "register" &&
      currentUser &&
      currentUser.user_type === "organization"
    ) {
      return t("COMMON.VIEW");
    }

    return t(getOpportunityButtonLabelKey(state));
  };

  // The creator's own button manages the opportunity directly rather than
  // opening the detail page first — everyone else keeps the card's default
  // behaviour of navigating through to the detail page.
  const handleActionClick = (
    item: VolunteerOpportunityData | LearnServeOpportunityData
  ) => {
    const detailHref = isLearnServe
      ? `/learn-share-event-detail/${item.id}`
      : `/volunteer-event-detail/${item.id}`;

    if (!currentUser || item.created_by?.id !== currentUser.id) {
      router.push(detailHref);
      return;
    }
    setNavState(
      isLearnServe ? NAV_STATE_KEYS.learnServeForm : NAV_STATE_KEYS.volunteerForm,
      { id: String(item.id), isRepublish: isCreatorRepostState(item) }
    );
    router.push(isLearnServe ? "/learn-and-share-form" : "/volunteer-form");
  };

  const fetchOpportunities = useCallback(
    async (page: number, isReset: boolean) => {
      setIsLoading(true);
      try {
        const endpoint = isLearnServe
          ? "/learn-serve-opportunities/"
          : "/list-volunteer-opportunities/";

        const params = isLearnServe
          ? {
              page,
              limit,
              search: searchQuery,
              start_date: filters?.startDate
                ? moment(filters.startDate).format("YYYY-MM-DD")
                : undefined,
              end_date: filters?.endDate
                ? moment(filters.endDate).format("YYYY-MM-DD")
                : undefined,
              tags: filters?.tags,
              location: filters?.location,
              gender: filters?.gender,
              min_age: typeof filters?.age?.[0] === "number" ? filters.age[0] : undefined,
              max_age: typeof filters?.age?.[1] === "number" ? filters.age[1] : undefined,
              opportunity_nationality: filters?.opportunity_nationality,
              type: filters?.type,
              in_person: filters?.isInPerson || undefined,
              online: filters?.isOnline || undefined,
              match_my_interest: filters?.matchMyInterest || undefined,
              status: filters?.status,
            }
          : {
              page,
              limit,
              search: searchQuery,
              start_date: filters?.startDate
                ? moment(filters.startDate).format("YYYY-MM-DD")
                : undefined,
              end_date: filters?.endDate
                ? moment(filters.endDate).format("YYYY-MM-DD")
                : undefined,
              tags: filters?.tags,
              location: filters?.location,
              gender: filters?.gender,
              min_age: typeof filters?.age?.[0] === "number" ? filters.age[0] : undefined,
              max_age: typeof filters?.age?.[1] === "number" ? filters.age[1] : undefined,
              opportunity_nationality: filters?.opportunity_nationality,
              type: filters?.type,
              is_relief: filters?.isRelief || undefined,
              is_urgent: filters?.isUrgent || undefined,
              is_supports_disabled: filters?.isSpecialNeed || undefined,
              match_my_interest: filters?.matchMyInterest || undefined,
              status: filters?.status,
            };

        const response = await apiClient.get(endpoint, { params });
        const responseData = response.data;
        const newList = responseData?.data || [];

        if (isReset) {
          setAllOpportunities(newList);
        } else {
          setAllOpportunities((prev) => [...prev, ...newList]);
        }

        setHasMore(page < (responseData?.meta?.pagination?.total_pages || 1));

        const total = responseData?.meta?.pagination?.total;
        setTotalResults(typeof total === "number" ? total : null);
      } catch (error) {
        console.error("Error fetching opportunities", error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLearnServe, limit, searchQuery, filters]
  );

  const triggerResetFetch = useRef(true);

  useEffect(() => {
    setCurrentPage(1);
    fetchOpportunities(1, true);
    triggerResetFetch.current = false;
  }, [filters, searchQuery, limit, fetchOpportunities]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchOpportunities(nextPage, false);
      // Trigger a page change event to let parent scroll if needed
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("learn-serve-page-change"));
      }
    }
  };

  const refetch = () => {
    setCurrentPage(1);
    fetchOpportunities(1, true);
  };

  if (isLoading && allOpportunities.length === 0) {
    return <Loader />;
  }

  const hasNoOpportunities = allOpportunities.length === 0;

  return (
    <>
      {deleteModalInfo.isOpen && (
        <Modal
          title={t("COMMON.DELETE_OPPORTUNITY")}
          open={deleteModalInfo.isOpen}
          onClose={() => setDeleteModalInfo({ isOpen: false })}
          size="small"
        >
          <DeleteOpportunityModal
            opportunityId={deleteModalInfo.opportunityId!}
            type={isLearnServe ? "learnserve" : "volunteer"}
            setOpenModal={() => setDeleteModalInfo({ isOpen: false })}
            refetch={refetch}
            opportunityTitle={deleteModalInfo.opportunityTitle}
          />
        </Modal>
      )}

      {hasNoOpportunities ? (
        <div className="text-center py-8 text-secondary-102 text-lg font-medium">
          {isLearnServe
            ? t("COMMON.NO_LEARN_SERVE_OPPORTUNITIES_AVAILABLE")
            : t("COMMON.NO_OPPORTUNITIES_AVAILABLE")}
        </div>
      ) : isStatic ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[25px] mobilescreen:gap-0">
          {volunteerStaticData.map((item) => (
            <div key={item.id} className="">
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-[300px] border border-[#484848] border-b-0 rounded-t-[20px] object-cover"
                />
                <div className="grid grid-cols-2 text-sm text-gray-600 bg-[#484848] absolute w-full bottom-0 h-[39px] items-center">
                  <span className="flex text-white justify-center gap-2 items-center text-sm">
                    <img
                      className="w-4 h-4"
                      src="/assets/homepage/dateicn.svg"
                      alt="Date Icon"
                    />
                    {item.date}
                  </span>
                  <div className="h-[60%] w-[1px] bg-white absolute left-1/2 top-[8px]"></div>
                  <span className="flex text-white justify-center gap-2 items-center text-sm">
                    <img
                      src="/assets/homepage/timeicn.svg"
                      className="w-4 h-4"
                      alt="Time Icon"
                    />
                    {item.time}
                  </span>
                </div>
              </div>
              <div className="learnserve-boxshaow rounded-b-[20px] border border-primary-5 pb-10 relative bg-[#F7F7F7] min-h-[230px] px-5">
                <h3 className="text-lg text-secondary-100 pb-3 font-bold pt-[19px]">{item.title}</h3>
                <div className="grid grid-cols-2 justify-between pb-[22px]">
                  <p className="flex items-center text-secondary-102 text-sm gap-2 leading-tight">
                    <img
                      src="/assets/homepage/hours.svg"
                      className="w-5 h-5 object-contain"
                      alt="Hours"
                    />
                    {item.hours}
                  </p>
                  <p className="flex items-center text-secondary-102 text-sm gap-2 leading-tight">
                    <img
                      src="/assets/homepage/locations.svg"
                      className="w-5 h-5 object-contain"
                      alt="Location"
                    />
                    <span className="line-clamp-1">{item.location}</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 justify-between text-secondary-102 text-lg">
                  <p className="flex items-center text-secondary-102 text-sm gap-2 leading-tight">
                    <img
                      src="/assets/homepage/health.svg"
                      className="w-5 h-5 object-contain"
                      alt="Category"
                    />
                    {item.category}
                  </p>
                </div>
              </div>
              <Button
                className="bg-primary-5 relative mx-auto flex justify-center border-0 bottom-[25px]"
                variant="primary"
                size="medium"
              >
                {buttonText || t("COMMON.REGISTER")}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <>
        {totalResults !== null && (
          <p className="pb-4 text-secondary-102 text-base mobilescreen:text-sm">
            {t("COMMON.RESULTS_COUNT", { total: totalResults })}
          </p>
        )}
        <InfiniteScroll
          dataLength={allOpportunities.length}
          next={loadMore}
          hasMore={hasMore}
          hasChildren={allOpportunities.length > 0}
          loader={<Loader inline />}
          endMessage={
            <p className="text-center py-4 text-secondary-102">
              {t("COMMON.NO_MORE_OPPORTUNITIES")}
            </p>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[25px] mobilescreen:gap-0">
            {allOpportunities.map(
              (item: VolunteerOpportunityData | LearnServeOpportunityData) => (
                <div key={item.id} className="relative">
                  {currentUser &&
                    item.created_by?.id === currentUser.id &&
                    item.opportunity_status !== "completed" &&
                    item.opportunity_status !== "inprogress" && (
                      <div className="absolute -left-3 -top-3 z-10">
                        <img
                          src={
                            isLearnServe && is_homepage
                              ? "/assets/voluneteerevent/card_delete_icon_organized.svg"
                              : isOpportunity && is_homepage
                                ? "/assets/voluneteerevent/card_delete_icon_blue.svg"
                                : "/assets/voluneteerevent/card_delete_icon.svg"
                          }
                          alt="Delete"
                          className="w-[27px] h-[27px] cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteModalInfo({
                              isOpen: true,
                              opportunityId: String(item.id),
                              opportunityTitle: {
                                title_en: item.title_en,
                                title_ar: item.title_ar,
                              },
                            });
                          }}
                        />
                      </div>
                    )}
                  <div className="relative">
                    <Link
                      href={
                        isLearnServe
                          ? `/learn-share-event-detail/${item.id}`
                          : `/volunteer-event-detail/${item.id}`
                      }
                    >
                      {/* Square (1:1) crop — matches the ratio the upload form
                          crops to, so the card never letterboxes or stretches. */}
                      <img
                        src={item.opportunity_images[0]?.image}
                        alt={selectedLanguage === "ar" ? item.title_ar : item.title_en}
                        className="w-full aspect-square border border-[#484848] border-b-0 rounded-t-[20px] object-cover"
                      />
                      <OpportunityBadges item={item} />
                      <div className="grid grid-cols-2 text-sm text-gray-600 bg-[#000000B2]/70 absolute w-full bottom-0 h-[39px] items-center">
                        <span className="flex text-white justify-center gap-2 items-center text-sm">
                          <img
                            className="w-4 h-4"
                            src="/assets/homepage/dateicn.svg"
                            alt="Date Icon"
                          />
                          {formatDateRange(
                            item.start_date,
                            item.end_date,
                            selectedLanguage,
                            t
                          )}
                        </span>
                        <div className="h-[60%] w-[1px] bg-white absolute left-1/2 top-[8px]"></div>
                        <span className="flex text-white justify-center gap-2 items-center text-sm">
                          <img
                            src="/assets/homepage/timeicn.svg"
                            className="w-4 h-4"
                            alt="Time Icon"
                          />
                          {item.start_time && item.end_time ? (
                            <>
                              {moment(item.start_time, "HH:mm:ss").format("hh:mm")}{" "}
                              {moment(item.start_time, "HH:mm:ss").format("a") === "am"
                                ? t("COMMON.AM")
                                : t("COMMON.PM")}{" "}
                              -{" "}
                              {moment(item.end_time, "HH:mm:ss").format("hh:mm")}{" "}
                              {moment(item.end_time, "HH:mm:ss").format("a") === "am"
                                ? t("COMMON.AM")
                                : t("COMMON.PM")}
                            </>
                          ) : item.start_time ? (
                            <>
                              {moment(item.start_time, "HH:mm:ss").format("hh:mm")}{" "}
                              {moment(item.start_time, "HH:mm:ss").format("a") === "am"
                                ? t("COMMON.AM")
                                : t("COMMON.PM")}
                            </>
                          ) : item.end_time ? (
                            <>
                              {moment(item.end_time, "HH:mm:ss").format("hh:mm")}{" "}
                              {moment(item.end_time, "HH:mm:ss").format("a") === "am"
                                ? t("COMMON.AM")
                                : t("COMMON.PM")}
                            </>
                          ) : null}
                        </span>
                      </div>
                    </Link>
                  </div>
                  <div
                    className={`learnserve-boxshaow px-5 rounded-b-[20px] border pb-10 relative bg-[#F7F7F7] min-h-[230px] ${
                      isLearnServe && is_homepage
                        ? "border-primary-803"
                        : isOpportunity && is_homepage
                          ? "border-primary-802"
                          : "border-primary-5"
                    }`}
                  >
                    <Link
                      href={
                        isLearnServe
                          ? `/learn-share-event-detail/${item.id}`
                          : `/volunteer-event-detail/${item.id}`
                      }
                    >
                      <div className="flex items-start gap-2 pb-3 pt-[19px]">
                        <h3 className="text-lg text-secondary-100 font-bold truncate">
                          {selectedLanguage === "ar" ? item.title_ar : item.title_en}
                        </h3>
                        <OpportunityVisibilityInfo
                          isPublic={item.is_public}
                          className="mt-1 shrink-0"
                        />
                      </div>
                      <div className="grid grid-cols-2 justify-between pb-[22px]">
                        <div className="flex items-center text-secondary-102 text-sm gap-2 leading-tight">
                          {isLearnServe ? (
                            <>
                              <img
                                src="/assets/homepage/learn_type.svg"
                                className="w-5 h-5 object-contain"
                                alt="Learning Type"
                              />
                              <span className="line-clamp-1">
                                {(() => {
                                  const val =
                                    (item as LearnServeOpportunityData).learning_type_display?.[
                                      selectedLanguage === "ar" ? "value_ar" : "value_en"
                                    ] ?? "";
                                  return val.length > 12 ? val.slice(0, 12) + ".." : val;
                                })()}
                              </span>
                            </>
                          ) : (
                            <>
                              <img
                                src="/assets/voluneteerevent/age.svg"
                                className="w-5 h-5 object-contain"
                                alt="Age"
                              />
                              {(item as VolunteerOpportunityData).from_age}
                              {(item as VolunteerOpportunityData).to_age ? (
                                <> - {(item as VolunteerOpportunityData).to_age}</>
                              ) : (
                                <> +</>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center text-secondary-102 text-sm gap-2 leading-tight">
                          <img
                            src={
                              (item as LearnServeOpportunityData).format === "ONLINE" ||
                              ((item as LearnServeOpportunityData).format_display?.value_en?.toLowerCase() === "online" ||
                               (item as LearnServeOpportunityData).format_display?.value_ar?.toLowerCase() === "عن بعد")
                                ? "/assets/voluneteerevent/online.svg"
                                : "/assets/homepage/locations.svg"
                            }
                            className="w-5 h-5 object-contain"
                            alt="Location"
                          />
                          <span className="line-clamp-1">
                            {(() => {
                              const isOnline =
                                (item as LearnServeOpportunityData).format === "ONLINE" ||
                                ((item as LearnServeOpportunityData).format_display?.value_en?.toLowerCase() === "online" ||
                                 (item as LearnServeOpportunityData).format_display?.value_ar?.toLowerCase() === "عن بعد");

                              if (isOnline) return t("COMMON.ONLINE");
                              if (isLearnServe) return t("COMMON.IN_PERSON");

                              const locationText =
                                (item as VolunteerOpportunityData)[
                                  selectedLanguage === "ar" ? "location_ar" : "location_en"
                                ] || t("COMMON.LOADING_LOCATION");

                              return locationText.length > 12
                                ? locationText.slice(0, 12).concat("...")
                                : locationText;
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 justify-between text-secondary-102 text-sm">
                        <p className="flex items-center text-secondary-102 gap-2 leading-tight">
                          <img
                            src={
                              isLearnServe && is_homepage
                                ? "/assets/homepage/person_icon_organized.svg"
                                : isOpportunity && is_homepage
                                  ? "/assets/homepage/person_icon_blue.svg"
                                  : "/assets/homepage/person.svg"
                            }
                            className="w-5 h-5 object-contain"
                            alt="Spots"
                          />
                          {`${item.registered_volunteers_count}/${item.participants_needed}`}
                        </p>
                        <p className="flex items-center text-secondary-102 gap-2 leading-tight">
                          <img
                            src="/assets/homepage/health.svg"
                            className="w-5 h-5 object-contain"
                            alt="Category"
                          />
                          <span
                            className="line-clamp-1 cursor-pointer hover:text-primary-5 hover:underline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const interestValue =
                                item.interest_display?.[0]?.[
                                  selectedLanguage === "ar" ? "value_ar" : "value_en"
                                ];
                              if (interestValue) {
                                router.push(
                                  isLearnServe
                                    ? `/learn-and-share-list?tags=${encodeURIComponent(
                                        interestValue
                                      )}`
                                    : `/volunteer-opportunities-list?tags=${encodeURIComponent(
                                        interestValue
                                      )}`
                                );
                              }
                            }}
                          >
                            {item.interest_display?.[0]?.[
                              selectedLanguage === "ar" ? "value_ar" : "value_en"
                            ] ?? ""}
                          </span>
                        </p>
                      </div>
                    </Link>
                  </div>
                  <Button
                    className={`${
                      isLearnServe && is_homepage
                        ? "bg-primary-803"
                        : isOpportunity && is_homepage
                          ? "bg-primary-802"
                          : "bg-primary-5"
                    } relative mx-auto flex justify-center border-0 bottom-[25px]`}
                    variant="primary"
                    size="medium"
                    onClick={() => handleActionClick(item)}
                  >
                    {getButtonText(item)}
                  </Button>
                </div>
              )
            )}
          </div>
        </InfiniteScroll>
        </>
      )}
    </>
  );
}
