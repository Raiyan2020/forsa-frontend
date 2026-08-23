"use client";

import React, { useEffect, useRef, useState } from "react";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguageStore } from "@/store/languageStore";
import Loader from "@/components/ui/Loader";
import Image from "next/image";


interface EventImage {
  image: string;
}

interface EventData {
  id: number;
  event_images: EventImage[];
  title_en: string;
  title_ar: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  registration_required: boolean;
  registered_volunteers_count: number;
  participants_needed: number;
  event_status?: string;
  due_date: string;
  view_count: number;
  participation_type_display?: { value_en: string; value_ar: string };
  event_type_display?: { value_en: string; value_ar: string };
  interest_display?: Array<{ value_en: string; value_ar: string }>;
  created_by?: { id: number };
  location_en?: string;
  location_ar?: string;
}

interface EventCardProps {
  events: EventData[] | undefined;
  onNavigationVisibilityChange?: (isVisible: boolean) => void;
  is_homepage?: boolean;
  currentUser?: any;
  refetch?: () => void;
}

const responsive = {
  superLargeDesktop: { breakpoint: { max: 4000, min: 1200 }, items: 3 },
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

export default function EventCard({
  events,
  onNavigationVisibilityChange,
  is_homepage = false,
  currentUser,
}: EventCardProps) {
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

  useEffect(() => {
    if (Array.isArray(events)) {
      setTotalItems(events.length);
    } else {
      setTotalItems(0);
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
  }, [events]);

  useEffect(() => {
    const isNavigationVisible = Array.isArray(events) && events.length > maxVisibleItems;
    onNavigationVisibilityChange?.(isNavigationVisible);
  }, [events, maxVisibleItems, onNavigationVisibilityChange]);

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

  const getButtonText = (item: EventData) => {
    if (!currentUser) {
      return item.registration_required ? t("COMMON.REGISTER") : t("COMMON.DETAILS");
    }
    if (item.created_by?.id === currentUser.id) {
      return item.event_status === "completed" || item.event_status === "inprogress"
        ? t("COMMON.REPOST")
        : t("COMMON.EDIT_TEXT");
    }
    if (currentUser.user_type === "organization") {
      return t("COMMON.VIEW");
    }
    const dueDate = moment(item.due_date);
    const today = moment();
    if (dueDate.isBefore(today, "day")) {
      return t("COMMON.CLOSED");
    }
    if (item.registration_required) {
      const registeredCount = Number(item.registered_volunteers_count) || 0;
      return registeredCount >= item.participants_needed ? t("COMMON.FULL") : t("COMMON.REGISTER");
    }
    return t("COMMON.DETAILS");
  };

  const hasNoEvents = !Array.isArray(events) || events.length === 0;

  if (!isMounted) {
    return <Loader />;
  }

  if (hasNoEvents) {
    return (
      <div className="text-center py-8 text-secondary-102 text-lg font-medium">
        {t("COMMON.NO_EVENTS_AVAILABLE")}
      </div>
    );
  }

  return (
    <div>
      <Carousel
        rtl={selectedLanguage === "ar"}
        ref={carouselRef}
        responsive={responsive}
        infinite={false}
        showDots={events.length > maxVisibleItems}
        autoPlay={false}
        autoPlaySpeed={3000}
        arrows={false}
        containerClass={`overflow-hidden pt-[25px] 2xl:pt-[50px] laptop:pt-[40px] lg:pt-[24px] md:pt-[30px] ${is_homepage ? "custom-event-colour" : ""
          }`}
        afterChange={(_, { currentSlide }) => setCurrentSlide(currentSlide)}
      >
        {events.map((item) => (
          <div className="2xl:px-5 px-3 mobilescreen:px-[13px] mb-[5px] mobilescreen:pb-11" key={item.id}>
            <div className="border-[#484848] relative rounded-t-[20px] border-t-[1px] border-l-[1px] border-r-[1px]">
              <Link href={`/event-details/${item.id}`}>
                {/* Square (1:1) crop, matching the upload form and the other cards. */}
                <div className="relative w-full aspect-square rounded-t-[20px] overflow-hidden">
                  <Image
                    src={item?.event_images?.[0]?.image || "/assets/homepage/baner_img.png"}
                    alt={selectedLanguage === "ar" ? item.title_ar : item.title_en}
                    fill
                    className="object-cover"
                  />
                </div>
                {(() => {
                  const isPaid = item?.participation_type_display?.value_en === "Paid Event";
                  return (
                    <div className="absolute top-0 right-0 pr-4 pt-4">
                      <div
                        className={`inline-flex h-[30px] items-center justify-center px-4 font-bold rounded-[5px] ${isPaid ? "bg-primary-100/85 text-white" : "bg-primary-5/85 text-white"
                          }`}
                      >
                        <span className={selectedLanguage === "ar" ? "relative bottom-[2px]" : ""}>
                          {isPaid ? t("COMMON.PAID") : t("COMMON.FREE")}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-2 text-sm text-gray-600 bg-[#000000B2]/70 absolute w-full bottom-0 h-[39px] items-center">
                  <span className="flex miniscreen3:text-[12px] smallscreen:text-[10px] laptopitms:text-xs text-white justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs:text-xs">
                    <Image
                      className="smallscreen:text-[12px] 2xl:w-5 2xl:h-5 w-4 h-4"
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
                      className="smallscreen:text-[12px] 2xl:w-5 2xl:h-5 w-4 h-4"
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                      aria-hidden="true"
                    />
                    {moment(item.start_time, "HH:mm:ss").format("hh:mm")}{" "}
                    {moment(item.start_time, "HH:mm:ss").format("a") === "am"
                      ? t("COMMON.AM")
                      : t("COMMON.PM")}{" "}
                    - {moment(item.end_time, "HH:mm:ss").format("hh:mm")}{" "}
                    {moment(item.end_time, "HH:mm:ss").format("a") === "am"
                      ? t("COMMON.AM")
                      : t("COMMON.PM")}
                  </span>
                </div>
              </Link>
            </div>
            <div
              className={`${is_homepage ? "border-primary-801" : "border-primary-5"
                } border-b-[1px] border-l-[1px] border-r-[1px] rounded-b-[20px] relative bg-[#fff] px-4 pb-4 eventshadhow mb-[10px]`}
            >
              <Link href={`/event-details/${item.id}`}>
                <div className="flex items-center justify-between pt-2 pb-[10px]">
                  <h3 className="2xl:text-[25px] text-[18px] text-secondary-100 font-bold line-clamp-1">
                    {selectedLanguage === "ar" ? item.title_ar : item.title_en}
                  </h3>
                  <div className="flex items-center gap-[10px]">
                    <div className="flex items-center gap-[10px] text-secondary-102 2xl:text-lg lg:text-base text-sm xss:text-base">
                      <Eye className={`w-5 h-5 ${is_homepage ? "text-primary-801" : "text-primary-5"}`} aria-hidden="true" />
                      <p>{item?.view_count}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="flex items-center text-secondary-102 gap-[14px] 2xl:text-lg lg:text-base text-sm xss:text-base pb-4">
                      <Image
                        className="w-5 h-5"
                        src="/assets/homepage/learn_type.svg"
                        alt=""
                        width={20}
                        height={20}
                        unoptimized
                        aria-hidden="true"
                      />
                      {item?.event_type_display?.[selectedLanguage === "ar" ? "value_ar" : "value_en"]}
                    </div>
                    <div className="flex overflow-hidden gap-[15px] pb-4 items-center">
                      <Image
                        className="w-5 h-5"
                        src="/assets/homepage/locations.svg"
                        alt=""
                        width={20}
                        height={20}
                        unoptimized
                        aria-hidden="true"
                      />
                      <p className="text-secondary-102 gap-[14px] 2xl:text-lg lg:text-base text-sm xss:text-base-sm line-clamp-1">
                        {(() => {
                          const locationText =
                            (selectedLanguage === "ar" ? item.location_ar : item.location_en) ||
                            t("COMMON.LOADING_LOCATION");
                          return typeof locationText === "string" && locationText.length > 12
                            ? locationText.slice(0, 12).concat("...")
                            : locationText;
                        })()}
                      </p>
                    </div>
                    <div className="flex items-center text-secondary-102 gap-[14px] 2xl:text-lg lg:text-base text-sm xss:text-base-sm">
                      <Image
                        className="w-5 h-5"
                        src="/assets/homepage/health.svg"
                        alt=""
                        width={20}
                        height={20}
                        unoptimized
                        aria-hidden="true"
                      />
                      <span className="line-clamp-1 text-ellipsis overflow-hidden">
                        {item?.interest_display?.[0]?.[
                          selectedLanguage === "ar" ? "value_ar" : "value_en"
                        ] ?? t("COMMON.NO_DATA")}
                      </span>
                    </div>
                  </div>
                  <div>
                    <button
                      className={`${is_homepage ? "bg-primary-801" : "bg-primary-5"
                        } text-white font-bold py-2 px-6 rounded-md hover:opacity-90 transition duration-200`}
                      onClick={() => router.push(`/event-details/${item.id}`)}
                    >
                      <span className="leading-tight">{getButtonText(item)}</span>
                    </button>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </Carousel>
      {events.length > maxVisibleItems && (
        <div className="flex justify-center mobilescreen:hidden">
          <button
            onClick={selectedLanguage === "ar" ? goToNext : goToPrevious}
            aria-label={t("COMMON.PREVIOUS") || "Previous"}
            disabled={
              selectedLanguage === "ar" ? currentSlide >= totalItems - maxVisibleItems : currentSlide === 0
            }
            className={`${is_homepage
              ? "bg-primary-801 hover:bg-secondary-104 top-[50%]"
              : "bg-primary-5 hover:bg-secondary-103 top-[63%]"
              } text-white p-3 rounded-full shadow-lg transition absolute left-[-60px] 2xl:left-[-75px] xl:left-[-50px] laptop:left-[-75px] lg:left-[-50px] md:left-[-45px] top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={selectedLanguage === "ar" ? goToPrevious : goToNext}
            aria-label={t("COMMON.NEXT") || "Next"}
            disabled={
              selectedLanguage === "ar" ? currentSlide === 0 : currentSlide >= totalItems - maxVisibleItems
            }
            className={`${is_homepage
              ? "bg-primary-801 hover:bg-secondary-104 top-[50%]"
              : "bg-primary-5 hover:bg-secondary-103 top-[63%]"
              } text-white p-3 rounded-full shadow-lg transition absolute right-[-50px] 2xl:right-[-75px] xl:right-[-50px] laptop:right-[-75px] lg:right-[-50px] md:right-[-45px] top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );

}
