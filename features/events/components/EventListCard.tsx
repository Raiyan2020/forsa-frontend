"use client";

import React, { useEffect, useState, useCallback } from "react";
import "react-multi-carousel/lib/styles.css";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { useLanguageStore } from "@/store/languageStore";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getAllEvents, getDropdownChoices } from "@/features/services/api";
import Link from "next/link";
import Image from "next/image";
import moment from "moment";
import "moment/locale/ar";
import { formatDateRange, toNumber } from "@/lib/helpers";
import { Eye } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import DeleteEventModal from "./DeleteEventModal";
import { useAuthStore } from "@/store/authStore";
import { AllEventsFiltersData } from "../components/AllEventFilterModal";
import InfiniteScroll from "react-infinite-scroll-component";

interface EventCardProps {
  filters?: AllEventsFiltersData;
  searchQuery?: string;
  event_type: string;
  is_homepage?: boolean;
}

interface EventData {
  id: string;
  title_en: string;
  title_ar: string;
  event_images: { image: string }[];
  participation_type_display: { value_en: string; value_ar: string };
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  view_count: number;
  event_type_display: { value_en: string; value_ar: string };
  location_en: string;
  location_ar: string;
  interest_display: { value_en: string; value_ar: string }[];
  registration_required: boolean;
  participants_needed: number;
  registered_volunteers_count: number;
  event_status: string;
  due_date: string;
  created_by: { id: number };
}

interface ChoiceItem {
  id: string;
  value_en: string;
  value_ar: string;
}

const EventListCard: React.FC<EventCardProps> = ({
  filters,
  searchQuery = "",
  event_type,
  is_homepage = false,
}) => {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const user = useAuthStore((s) => s.user);
  const [deleteModalInfo, setDeleteModalInfo] = useState<{
    isOpen: boolean;
    eventId?: string;
    eventTitle?: { title_en: string; title_ar: string };
  }>({ isOpen: false });

  const calculateOptimalLimit = useCallback((cols: number): number => {
    if (cols === 1) return 9;
    if (cols === 2) return 8;
    if (cols === 3) return 9;
    return 9;
  }, []);

  const [, setGridColumns] = useState(1);
  const [limit, setLimit] = useState(calculateOptimalLimit(1));

  const updateGridColumns = useCallback(() => {
    if (typeof window === "undefined") return;
    const width = window.innerWidth;
    let cols = 1;

    if (width >= 1280 || width >= 1200) cols = 3;
    else if (width >= 768) cols = 2;
    else cols = 1;

    setGridColumns(cols);
    setLimit(calculateOptimalLimit(cols));
  }, [calculateOptimalLimit]);

  const { data: eventTypeData, isLoading: eventTypeLoading } = useQuery({
    queryKey: ["dropdown", "event_type"],
    queryFn: () => getDropdownChoices("event_type"),
  });

  const eventTypeId =
    event_type && eventTypeData?.data
      ? eventTypeData?.data?.find((type: ChoiceItem) => type.value_en === event_type)?.id
      : undefined;

  const shouldSkipQuery = !!(event_type && !eventTypeData);
  const finalEventType = filters?.type || eventTypeId;
  // Clear may replace the filters with a new object containing the same values.
  // Track their query-relevant content so that no-op resets do not erase the
  // locally accumulated list without causing React Query to fetch again.
  const filterSignature = JSON.stringify({
    startDate: filters?.startDate ?? "",
    endDate: filters?.endDate ?? "",
    tags: filters?.tags ?? [],
    eventType: finalEventType ?? "",
    location: filters?.location ?? "",
    gender: filters?.gender ?? "",
    age: filters?.age ?? [null, null],
    participationType: filters?.participation_type ?? "",
    matchMyInterest: filters?.matchMyInterest ?? false,
    status: filters?.status ?? "",
  });

  const {
    data: eventData,
    isLoading: eventLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "events-list",
      currentPage,
      limit,
      searchQuery,
      filters?.startDate,
      filters?.endDate,
      filters?.tags,
      finalEventType,
      filters?.location,
      filters?.gender,
      filters?.age,
      filters?.participation_type,
      filters?.matchMyInterest,
      filters?.status,
    ],
    queryFn: () =>
      getAllEvents({
        page: currentPage,
        limit,
        search: searchQuery,
        start_date: filters?.startDate ? moment(filters.startDate).format("YYYY-MM-DD") : undefined,
        end_date: filters?.endDate ? moment(filters.endDate).format("YYYY-MM-DD") : undefined,
        tags: filters?.tags,
        event_type: finalEventType,
        location: filters?.location,
        gender: filters?.gender,
        min_age: typeof filters?.age?.[0] === "number" ? filters.age[0] : undefined,
        max_age: typeof filters?.age?.[1] === "number" ? filters.age[1] : undefined,
        participation_type: filters?.participation_type || undefined,
        match_my_interest: filters?.matchMyInterest || undefined,
        status: filters?.status,
      }),
    enabled: !shouldSkipQuery,
  });

  useEffect(() => {
    setCurrentPage(1);
    setAllEvents([]);
    setHasMore(true);
  }, [filterSignature, searchQuery]);

  useEffect(() => {
    if (eventData && !isFetching) {
      if (currentPage === 1) {
        setAllEvents(eventData.data || []);
      } else {
        setAllEvents((prev) => [...prev, ...(eventData.data || [])]);
      }
      setHasMore(currentPage < (eventData?.meta?.pagination?.total_pages || 1));
    }
  }, [eventData, isFetching, currentPage]);

  useEffect(() => {
    updateGridColumns();
    window.addEventListener("resize", updateGridColumns);
    return () => {
      window.removeEventListener("resize", updateGridColumns);
    };
  }, [updateGridColumns]);

  const loadMore = () => {
    if (hasMore && !isFetching) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const getButtonText = (item: EventData) => {
    if (!user) {
      if (item.registration_required) {
        return t("COMMON.REGISTER");
      } else {
        return t("COMMON.DETAILS");
      }
    }

    if (item.created_by?.id === user.id) {
      if (item.event_status === "completed" || item.event_status === "inprogress") {
        return t("COMMON.REPOST");
      }
      return t("COMMON.EDIT_TEXT");
    }

    if (user.user_type === "organization") {
      return t("COMMON.VIEW");
    }

    const dueDate = moment(item.due_date);
    const today = moment();
    if (dueDate.isBefore(today, "day")) {
      return t("COMMON.CLOSED");
    }

    if (item.registration_required) {
      // The API sends these as Arabic-Indic digit strings under `ar` — see
      // `toNumber()`'s doc comment in lib/helpers.ts.
      const registeredCount = toNumber(item.registered_volunteers_count);
      if (registeredCount >= toNumber(item.participants_needed)) {
        return t("COMMON.FULL");
      }
      return t("COMMON.REGISTER");
    }

    return t("COMMON.DETAILS");
  };

  if (eventLoading || (event_type && eventTypeLoading)) {
    return <Loader />;
  }

  const hasNoEvents = allEvents.length === 0;

  return (
    <>
      {deleteModalInfo.isOpen && (
        <Modal
          title={t("COMMON.DELETE_EVENT")}
          open={deleteModalInfo.isOpen}
          onClose={() => setDeleteModalInfo({ isOpen: false })}
          size="small"
          position="default"
        >
          <DeleteEventModal
            eventId={deleteModalInfo.eventId!}
            setOpenModal={() => setDeleteModalInfo({ isOpen: false })}
            refetch={refetch}
            eventTitle={deleteModalInfo.eventTitle}
          />
        </Modal>
      )}
      {hasNoEvents ? (
        <div className="text-center py-8 text-secondary-102 text-lg font-medium">
          {t("COMMON.NO_EVENTS_AVAILABLE")}
        </div>
      ) : (
        <>
        {/* `meta.pagination.total` is the count across every page, not just the
            ones loaded so far — that's the number to show. */}
        {typeof eventData?.meta?.pagination?.total === "number" && (
          <p className="pb-4 text-secondary-102 text-base mobilescreen:text-sm">
            {t("COMMON.RESULTS_COUNT", {
              total: eventData.meta.pagination.total,
            })}
          </p>
        )}
        <InfiniteScroll
          dataLength={allEvents.length}
          next={loadMore}
          hasMore={hasMore}
          hasChildren={allEvents.length > 0}
          loader={<Loader inline />}
          endMessage={
            <p className="text-center py-4 text-secondary-102">{t("COMMON.NO_MORE_EVENTS")}</p>
          }
        >
          <div className="grid grid-cols-1 miniscreen4:grid-cols-2 2xl:grid-cols-3 xl:grid-cols-3 miniscreen:grid-cols-1 laptopitms:grid-cols-3 md:grid-cols-2 gap-[25px] mobilescreen:gap-0">
            {allEvents.map((item: EventData) => (
              <div className="mb-[5px]" key={item.id}>
                <div className="relative">
                  <Link href={`/event-details/${item.id}`} key={item.id}>
                    {user &&
                      item.created_by?.id === user.id &&
                      item.event_status !== "completed" &&
                      item.event_status !== "inprogress" && (
                        <div className="absolute -left-3 -top-3 z-10">
                          <Image
                            src={
                              is_homepage
                                ? "/assets/voluneteerevent/card_delete_icon_orange.svg"
                                : "/assets/voluneteerevent/card_delete_icon.svg"
                            }
                            alt="Delete"
                            width={27}
                            height={27}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteModalInfo({
                                isOpen: true,
                                eventId: item.id,
                                eventTitle: {
                                  title_en: item.title_en,
                                  title_ar: item.title_ar,
                                },
                              });
                            }}
                            unoptimized
                          />
                        </div>
                      )}
                    {/* Square (1:1) crop, matching the upload form and the other cards. */}
                    <div className="relative w-full aspect-square">
                      <Image
                        src={item?.event_images[0]?.image || "/placeholder.jpg"}
                        alt={selectedLanguage === "ar" ? item.title_ar : item.title_en}
                        fill
                        className="border border-[#484848] border-b-0 rounded-t-[20px] object-cover"
                        unoptimized
                      />
                    </div>
                    {(() => {
                      const isPaid = item?.participation_type_display?.value_en === "Paid Event";
                      return (
                        <div className="absolute top-0 right-0 pr-4 pt-4">
                          <div
                            className={`inline-flex h-[30px] items-center justify-center px-4 font-bold rounded-[5px] ${
                              isPaid ? "bg-primary-100/85 text-white" : "bg-primary-5/85 text-white"
                            }`}
                          >
                            <span
                              className={`${
                                selectedLanguage === "ar"
                                  ? isPaid
                                    ? "relative bottom-[2px]"
                                    : "relative bottom-[3px]"
                                  : ""
                              }`}
                            >
                              {isPaid ? t("COMMON.PAID") : t("COMMON.FREE")}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-2 text-sm text-gray-600 bg-[#000000B2]/70 absolute w-full bottom-0 h-[39px] items-center z-10">
                      <span className="flex miniscreen3:text-[12px] smallscreen:text-[10px] laptopitms:text-xs text-white justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs:text-xs">
                        <Image
                          className="w-4 h-4"
                          src="/assets/homepage/dateicn.svg"
                          alt="Date Icon"
                          width={16}
                          height={16}
                          unoptimized
                        />
                        {formatDateRange(item.start_date, item.end_date, selectedLanguage, t)}
                      </span>
                      <div className="h-[60%] w-[1px] bg-white absolute left-1/2 top-[8px]"></div>
                      <span className="text-white miniscreen3:text-[12px] smallscreen:text-[10px] laptopitms:text-xs flex justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs:text-xs">
                        <Image
                          src="/assets/homepage/timeicn.svg"
                          className="w-4 h-4"
                          alt="Time Icon"
                          width={16}
                          height={16}
                          unoptimized
                        />
                        {item.start_time && item.end_time ? (
                          <>
                            {moment(item.start_time, "HH:mm:ss").format("hh:mm")}{" "}
                            {moment(item.start_time, "HH:mm:ss").format("a") === "am"
                              ? t("COMMON.AM")
                              : t("COMMON.PM")}{" "}
                            - {moment(item.end_time, "HH:mm:ss").format("hh:mm")}{" "}
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
                  className={`${
                    is_homepage ? "border-primary-801" : "border-primary-5"
                  } rounded-b-[20px] border border-t-0 relative bg-[#fff] px-4 pb-4 eventshadhow mb-[10px]`}
                >
                  <Link href={`/event-details/${item.id}`} key={item.id}>
                    <div className="flex items-center justify-between pt-2 pb-[10px]">
                      <h3 className="2xl:text-[25px] text-[18px] text-secondary-100 font-bold line-clamp-1">
                        {selectedLanguage === "ar" ? item.title_ar : item.title_en}
                      </h3>
                      <div className="flex items-center gap-[10px]">
                        <div className="flex items-center gap-[10px] text-secondary-102 2xl:text-lg lg:text-base text-sm xss:text-base">
                          <Eye
                            className={`w-5 h-5 xss:w-5 xss:h-5 ${
                              is_homepage ? "text-primary-801" : "text-primary-5"
                            }`}
                          />
                          <p>{item?.view_count}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="flex items-center text-secondary-102 gap-[14px] 2xl:text-lg lg:text-base text-sm xss:text-base pb-4">
                          <Image
                            className="w-5 h-5 xss:w-5 xss:h-5"
                            src="/assets/homepage/learn_type.svg"
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
                          />
                          <span>
                            {item?.event_type_display?.[selectedLanguage === "ar" ? "value_ar" : "value_en"]}
                          </span>
                        </div>
                        <div className="flex overflow-hidden gap-[15px] pb-4 items-center">
                          <Image
                            className="w-5 h-5 xss:w-5 xss:h-5"
                            src="/assets/homepage/locations.svg"
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
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
                            className="w-5 h-5 xss:w-5 xss:h-5"
                            src="/assets/homepage/health.svg"
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
                          />
                          <span
                            className="line-clamp-1 text-ellipsis overflow-hidden cursor-pointer hover:text-primary-5 hover:underline transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const interestValue =
                                item?.interest_display?.[0]?.[
                                  selectedLanguage === "ar" ? "value_ar" : "value_en"
                                ];
                              if (interestValue) {
                                window.location.href = `/events-and-activities?tags=${encodeURIComponent(
                                  interestValue
                                )}`;
                              }
                            }}
                          >
                            {item?.interest_display?.[0]?.[
                              selectedLanguage === "ar" ? "value_ar" : "value_en"
                            ] ?? ""}
                          </span>
                        </div>
                      </div>
                      <div>
                        <Button
                          type="button"
                          variant={is_homepage ? "orange" : "secondarys"}
                          size="xss"
                        >
                          <span className="leading-tight">{getButtonText(item)}</span>
                        </Button>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </InfiniteScroll>
        </>
      )}
    </>
  );
};

export default EventListCard;
