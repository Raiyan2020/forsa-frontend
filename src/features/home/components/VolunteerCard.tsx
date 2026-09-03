"use client";

import React, { useEffect, useRef, useState } from "react";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useLanguageStore } from "@/store/languageStore";
import Loader from "@/components/ui/Loader";
import Image from "next/image";
import {
  getOpportunityButtonLabelKey,
  getOpportunityButtonState,
  isCreatorRepostState,
} from "@/features/shared/opportunityButtonState";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import OpportunityBadges, {
  OpportunityVisibilityInfo,
} from "@/features/opportunities/components/OpportunityBadges";


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

interface AllOpportunitiesFiltersData {
  startDate: string;
  endDate: string;
  tags: string[];
  location: string;
  gender: string;
  age: [number | null, number | null];
  opportunity_nationality: string;
  type: string;
  isRelief: boolean;
  isUrgent: boolean;
  isSpecialNeed: boolean;
  isInPerson: boolean;
  isOnline: boolean;
  matchMyInterest: boolean;
  status: string;
  sortBy: string;
}

interface VolunteerCardProps {
  isOpportunity?: boolean;
  isLearnServe?: boolean;
  currentUser?: any;
  buttonText?: string;
  is_homepage?: boolean;
  filters?: AllOpportunitiesFiltersData;
  searchQuery?: string;
  /** Pre-fetched initial data from the server — avoids a client fetch on first paint */
  initialData?: Array<VolunteerOpportunityData | LearnServeOpportunityData>;
}

const responsive = {
  superLargeDesktop: { breakpoint: { max: 4000, min: 1200 }, items: 4 },
  desktop: { breakpoint: { max: 1200, min: 800 }, items: 2 },
  tablet: { breakpoint: { max: 800, min: 464 }, items: 1 },
  mobile: { breakpoint: { max: 464, min: 0 }, items: 1 },
};

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

export default function VolunteerCard({
  isOpportunity,
  isLearnServe,
  currentUser,
  buttonText,
  is_homepage = false,
  filters,
  searchQuery = "",
  initialData,
}: VolunteerCardProps) {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [maxVisibleItems, setMaxVisibleItems] = useState(3);
  const carouselRef = useRef<Carousel>(null);
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const queryParamsForOpportunity = {
    page: 1,
    limit: 6,
    search: searchQuery,
    start_date: filters?.startDate ? moment(filters.startDate).format("YYYY-MM-DD") : undefined,
    end_date: filters?.endDate ? moment(filters.endDate).format("YYYY-MM-DD") : undefined,
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
    sort_by: filters?.sortBy || undefined,
  };

  const queryParamsForLearnServe = {
    page: 1,
    limit: 6,
    search: searchQuery,
    start_date: filters?.startDate ? moment(filters.startDate).format("YYYY-MM-DD") : undefined,
    end_date: filters?.endDate ? moment(filters.endDate).format("YYYY-MM-DD") : undefined,
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
    sort_by: filters?.sortBy || undefined,
  };

  const { data: volunteerResponse, isLoading: volunteerLoading } = useQuery({
    queryKey: ["volunteer-opportunities", queryParamsForOpportunity],
    queryFn: async () => {
      const { data } = await apiClient.get("/list-volunteer-opportunities/", {
        params: queryParamsForOpportunity,
      });
      return data;
    },
    enabled: !!isOpportunity && !isLearnServe,
    // Seed with server data so no client fetch is needed on first paint. An
    // EMPTY server list is not seeded — `initialData` counts as fresh for
    // `staleTime`, so it would pin the section empty instead of retrying.
    initialData: is_homepage && initialData?.length && !isLearnServe
      ? { data: initialData }
      : undefined,
    staleTime: is_homepage ? 2 * 60 * 1000 : 0,
    // A search or filter change rewrites the query key. Keeping the previous
    // page's results means `isLoading` stays false, so the section is not
    // replaced by the full-screen loader on every keystroke.
    placeholderData: keepPreviousData,
  });

  const { data: learnServeResponse, isLoading: learnServeLoading } = useQuery({
    queryKey: ["learn-serve-opportunities", queryParamsForLearnServe],
    queryFn: async () => {
      const { data } = await apiClient.get("/learn-serve-opportunities/", {
        params: queryParamsForLearnServe,
      });
      return data;
    },
    enabled: !!isLearnServe,
    // Same as above — only a non-empty server list is treated as seeded data.
    initialData: is_homepage && initialData?.length && isLearnServe
      ? { data: initialData }
      : undefined,
    staleTime: is_homepage ? 2 * 60 * 1000 : 0,
    placeholderData: keepPreviousData,
  });

  const data = isLearnServe ? learnServeResponse?.data : volunteerResponse?.data;
  const isLoading = isLearnServe ? learnServeLoading : volunteerLoading;

  useEffect(() => {
    if (data) {
      setTotalItems(data.length);
    }
    const updateMaxVisibleItems = () => {
      if (window.innerWidth >= 1200) {
        setMaxVisibleItems(responsive.superLargeDesktop.items);
      } else if (window.innerWidth >= 800) {
        setMaxVisibleItems(responsive.desktop.items);
      } else {
        setMaxVisibleItems(responsive.tablet.items);
      }
    };
    updateMaxVisibleItems();
    window.addEventListener("resize", updateMaxVisibleItems);
    return () => window.removeEventListener("resize", updateMaxVisibleItems);
  }, [data]);

  const goToPrevious = () => {
    if (carouselRef.current && currentSlide > 0) {
      carouselRef.current.previous(1);
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  };

  const goToNext = () => {
    const maxSlideIndex = Math.max(0, totalItems - maxVisibleItems);
    if (carouselRef.current && currentSlide < maxSlideIndex) {
      carouselRef.current.next(1);
      setCurrentSlide((prev) => Math.min(prev + 1, maxSlideIndex));
    }
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

  const getButtonText = (
    item: VolunteerOpportunityData | LearnServeOpportunityData
  ) => {
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

  // Inline: this is one section of a page, not the page itself. Re-searches
  // never reach here — `keepPreviousData` holds the previous list on screen and
  // the search bar shows the in-flight spinner instead.
  if (isLoading || !isMounted) {
    return <Loader inline />;
  }

  const hasNoOpportunities = !data || data?.length === 0;

  return (
    <div className="relative">
      {hasNoOpportunities ? (
        <div className="text-center py-8 text-secondary-102 text-lg font-medium">
          {isLearnServe
            ? t("COMMON.NO_LEARN_SERVE_OPPORTUNITIES_AVAILABLE")
            : t("COMMON.NO_VOLUNTEER_OPPORTUNITIES_AVAILABLE")}
        </div>
      ) : (
        <>
          <Carousel
            rtl={selectedLanguage === "ar"}
            ref={carouselRef}
            responsive={responsive}
            infinite={false}
            showDots={data?.length > maxVisibleItems}
            autoPlay={false}
            autoPlaySpeed={3000}
            arrows={false}
            containerClass={`overflow-hidden pt-[25px] 2xl:pt-[50px] laptop:pt-[40px] lg:pt-[24px] md:pt-[30px] ${
              is_homepage
                ? isLearnServe
                  ? "custom-learn-colour"
                  : "custom-volunteer-colour"
                : ""
            }`}
            afterChange={(_, { currentSlide }) => {
              const maxSlideIndex = Math.max(0, totalItems - maxVisibleItems);
              setCurrentSlide(Math.min(currentSlide, maxSlideIndex));
            }}
          >
            {data?.map(
              (
                item: VolunteerOpportunityData | LearnServeOpportunityData,
                index: number
              ) => (
                <div
                  key={`${isLearnServe ? "learn" : "volunteer"}-${item.id}-${index}`}
                  className="2xl:px-5 px-3 mobilescreen:px-[13px] mb-[5px] mobilescreen:pb-8"
                >
                  <Link
                    href={
                      isLearnServe
                        ? `/learn-share-event-detail/${item.id}`
                        : `/volunteer-event-detail/${item.id}`
                    }
                  >
                    <div className="relative">
                      {/* Main Image Container */}
                      {/* Square (1:1) crop — matches the ratio the upload form
                          crops to, so the card never letterboxes or stretches. */}
                      <div className="relative w-full aspect-square border border-[#484848] border-b-0 rounded-t-[20px] overflow-hidden">
                        <Image
                          src={item?.opportunity_images?.[0]?.image || "/assets/homepage/baner_img.png"}
                          alt={selectedLanguage === "ar" ? item.title_ar : item.title_en}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                      {/* Status Icons */}
                      <OpportunityBadges item={item} />
                      {/* Date and Time Overlay */}
                      <div className="grid grid-cols-2 text-sm text-gray-600 bg-[#000000B2]/70 absolute w-full bottom-0 h-[39px] items-center">
                        <span className="flex miniscreen3:text-[12px] smallscreen:text-[10px] laptopitms:text-xs text-white justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs:text-xs">
                          <Image
                            className="smallscreen:w-3 2xl:w-5 2xl:h-5 w-4 h-4"
                            src="/assets/homepage/dateicn.svg"
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
                            aria-hidden="true"
                          />
                          {formatDateRange(item.start_date, item.end_date, selectedLanguage, t)}
                        </span>
                        <div className="h-[60%] w-[1px] bg-white absolute left-1/2 top-[8px]"></div>
                        <span className="text-white miniscreen3:text-[12px] smallscreen:text-[10px] laptopitms:text-xs flex justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs:text-xs">
                          <Image
                            src="/assets/homepage/timeicn.svg"
                            className="smallscreen:w-3 2xl:w-5 2xl:h-5 w-4 h-4"
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
                            aria-hidden="true"
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
                    </div>
                  </Link>
                  {/* Card Content */}
                  <Link
                    href={
                      isLearnServe
                        ? `/learn-share-event-detail/${item.id}`
                        : `/volunteer-event-detail/${item.id}`
                    }
                  >
                    <div
                      className={`boxshadowsitm 2xl:px-7 px-3 xss:px-3 rounded-b-[20px] border border-t-0 pb-10 relative bg-[#F7F7F7] ${
                        isLearnServe && is_homepage
                          ? "border-primary-803"
                          : isOpportunity && is_homepage
                          ? "border-primary-802"
                          : "border-primary-5"
                      }`}
                    >
                      <div className="flex items-start gap-2 2xl:pb-7 pb-3 pt-[19px]">
                        <h3 className="2xl:text-[25px] text-lg text-secondary-100 font-bold truncate whitespace-nowrap overflow-hidden">
                          {selectedLanguage === "ar" ? item.title_ar : item.title_en}
                        </h3>
                        <OpportunityVisibilityInfo
                          isPublic={item.is_public}
                          className="mt-1 shrink-0"
                        />
                      </div>
                      <div>
                        <div className="grid grid-cols-2 extrasmall:flex-col justify-between pb-[22px]">
                          <div className="flex items-center text-secondary-102 2xl:text-lg lg:text-base text-sm xss:text-base gap-2 leading-tight">
                            <Image
                              src={
                                isLearnServe && "learning_type_display" in item
                                  ? "/assets/homepage/learn_type.svg"
                                  : "/assets/voluneteerevent/age.svg"
                              }
                              className="w-5 h-5 object-contain"
                              width={20}
                              height={20}
                              unoptimized
                              alt=""
                              aria-hidden="true"
                            />
                            <span className="line-clamp-1">
                              {isLearnServe && "learning_type_display" in item ? (
                                (() => {
                                  const val =
                                    item.learning_type_display?.[
                                      selectedLanguage === "ar" ? "value_ar" : "value_en"
                                    ] ?? "";
                                  return val.length > 12 ? val.slice(0, 12) + ".." : val;
                                })()
                              ) : (
                                <>
                                  {item?.from_age}
                                  {item?.to_age ? (
                                    <>
                                      <span className="text-secondary-102"> - </span>
                                      {item?.to_age}
                                    </>
                                  ) : (
                                    <span className="text-secondary-102"> + </span>
                                  )}
                                </>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center text-secondary-102 2xl:text-lg lg:text-base text-sm xss:text-base gap-2 leading-tight">
                            <Image
                              src={
                                item.format === "ONLINE" ||
                                (item.format_display &&
                                  (item.format_display.value_en.toLowerCase() === "online" ||
                                    item.format_display.value_ar.toLowerCase() === "عن بعد"))
                                  ? "/assets/voluneteerevent/online.svg"
                                  : "/assets/homepage/locations.svg"
                              }
                              className="w-5 h-5 object-contain"
                              width={20}
                              height={20}
                              unoptimized
                              alt=""
                              aria-hidden="true"
                            />
                            <span className="flex-1 overflow-hidden line-clamp-1 text-ellipsis">
                              {(() => {
                                const isOnline =
                                  item.format === "ONLINE" ||
                                  (item.format_display &&
                                    (item.format_display.value_en?.toLowerCase() === "online" ||
                                      item.format_display.value_ar?.toLowerCase() === "عن بعد"));

                                if (isOnline) {
                                  return t("COMMON.ONLINE");
                                }

                                if (isLearnServe) {
                                  return t("COMMON.IN_PERSON");
                                }

                                // For volunteer opportunities, show location
                                const volItem = item as VolunteerOpportunityData;
                                const locationText =
                                  (selectedLanguage === "ar"
                                    ? volItem.location_ar
                                    : volItem.location_en) || t("COMMON.LOADING_LOCATION");

                                return typeof locationText === "string" && locationText.length > 12
                                  ? locationText.slice(0, 12).concat("...")
                                  : locationText;
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 extrasmall:flex-col justify-between text-secondary-102 text-lg">
                          <div className="flex items-center text-secondary-102 2xl:text-lg lg:text-base text-sm xss:text-base gap-2 leading-tight">
                            <Image
                              src={
                                isLearnServe && is_homepage
                                  ? "/assets/homepage/person_icon_organized.svg"
                                  : isOpportunity && is_homepage
                                  ? "/assets/homepage/person_icon_blue.svg"
                                  : "/assets/homepage/person.svg"
                              }
                              className="w-5 h-5 object-contain"
                              width={20}
                              height={20}
                              unoptimized
                              alt=""
                              aria-hidden="true"
                            />
                            {`${item.registered_volunteers_count}/${item.participants_needed}`}
                          </div>
                          <div className="flex items-center text-secondary-102 2xl:text-lg lg:text-base text-sm xss:text-base gap-2 leading-tight overflow-hidden">
                            <Image
                              src="/assets/homepage/health.svg"
                              className="w-5 h-5 object-contain"
                              width={20}
                              height={20}
                              unoptimized
                              alt=""
                              aria-hidden="true"
                            />
                            <p className="line-clamp-1 text-ellipsis overflow-hidden">
                              {item?.interest_display?.[0]?.[
                                selectedLanguage === "ar" ? "value_ar" : "value_en"
                              ] ?? ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {/* Button */}
                  <button
                    className={`${
                      isLearnServe && is_homepage
                        ? "bg-primary-803"
                        : isOpportunity && is_homepage
                        ? "bg-primary-802"
                        : "bg-primary-5"
                    } relative mx-auto flex justify-center bottom-[25px] text-white font-bold py-2 px-6 rounded-md hover:opacity-90 transition duration-200`}
                    onClick={() => handleActionClick(item)}
                  >
                    <span className="leading-tight">{getButtonText(item)}</span>
                  </button>
                </div>
              )
            )}
          </Carousel>
          {data?.length > maxVisibleItems && (
            <div className="flex justify-center mobilescreen:hidden">
              <button
                onClick={selectedLanguage === "ar" ? goToNext : goToPrevious}
                aria-label={t("COMMON.PREVIOUS") || "Previous"}
                disabled={
                  selectedLanguage === "ar"
                    ? currentSlide >= totalItems - maxVisibleItems
                    : currentSlide === 0
                }
                className={`${
                  isLearnServe && is_homepage
                    ? "bg-primary-803 hover:bg-[#70b4c27d]"
                    : isOpportunity && is_homepage
                    ? "bg-primary-802 hover:bg-secondary-106"
                    : "bg-primary-5 hover:bg-secondary-103"
                } text-white p-3 rounded-full shadow-lg transition absolute left-[-60px] 2xl:left-[-75px] xl:left-[-50px] laptop:left-[-75px] lg:left-[-50px] md:left-[-45px] top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={selectedLanguage === "ar" ? goToPrevious : goToNext}
                aria-label={t("COMMON.NEXT") || "Next"}
                disabled={
                  selectedLanguage === "ar"
                    ? currentSlide === 0
                    : currentSlide >= totalItems - maxVisibleItems
                }
                className={`${
                  isLearnServe && is_homepage
                    ? "bg-primary-803 hover:bg-[#70b4c27d]"
                    : isOpportunity && is_homepage
                    ? "bg-primary-802 hover:bg-secondary-106"
                    : "bg-primary-5 hover:bg-secondary-103"
                } text-white p-3 rounded-full shadow-lg transition absolute right-[-50px] 2xl:right-[-75px] xl:right-[-50px] laptop:right-[-75px] lg:right-[-50px] md:right-[-45px] top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}

        </>
      )}
    </div>
  );
}
