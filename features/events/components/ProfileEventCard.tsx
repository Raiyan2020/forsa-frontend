"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import moment from "moment";
import InfiniteScroll from "react-infinite-scroll-component";

import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { getAllOpportunities } from "@/features/services/api";
import { formatDateRange } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";
import { FiltersData } from "@/features/profile/components/ProfileFilterForm";
import DeleteEventModal from "./DeleteEventModal";

const asset = (path: string) => `/assets/${path}`;

interface EventData {
  id: number;
  title_en: string;
  title_ar: string;
  event_images?: Array<{ image: string }>;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location_en?: string;
  location_ar?: string;
  event_status?: string;
  event_type_display?: { value_en: string; value_ar: string };
  participation_type_display?: { value_en: string; value_ar: string };
  interest_display?: Array<{ value_en: string; value_ar: string }>;
  registration_required?: boolean;
  registered_volunteers_count?: number | string;
  participants_needed: number;
  due_date: string;
  created_by?: { id: number };
}

interface ProfileEventCardProps {
  filter_type: "myevents" | "organized_events" | "sponsored_events";
  filters: FiltersData;
  searchQuery: string;
  currentUser: any;
  isPublicProfile?: boolean;
  user_id?: string;
}

const ProfileEventCard: React.FC<ProfileEventCardProps> = ({
  filter_type,
  filters,
  searchQuery,
  currentUser,
  isPublicProfile = false,
  user_id,
}) => {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();
  const router = useRouter();
  const [events, setEvents] = useState<EventData[]>([]);

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Calculate optimal limit based on grid columns
  const calculateOptimalLimit = useCallback((cols: number): number => {
    // Set max items per page based on column count for complete rows
    if (cols === 1) return 9; // 9 rows of 1
    if (cols === 2) return 8; // 4 rows of 2
    if (cols === 3) return 9; // 3 rows of 3
    return 9; // Default max
  }, []);

  const [limit, setLimit] = useState(9);

  // Update grid columns and limit based on window width
  const updateGridColumns = useCallback(() => {
    const width = window.innerWidth;
    let cols = 1; // Default mobile (grid-cols-1)

    if (width >= 1200)
      cols = 3; // 2xl, xl, laptopitms breakpoints (grid-cols-3)
    else if (width >= 768) cols = 2; // md breakpoint (grid-cols-2)

    setLimit(calculateOptimalLimit(cols));
  }, [calculateOptimalLimit]);

  useEffect(() => {
    updateGridColumns();
    window.addEventListener("resize", updateGridColumns);
    return () => window.removeEventListener("resize", updateGridColumns);
  }, [updateGridColumns]);

  const prevFiltersRef = useRef(filters);
  const prevSearchQueryRef = useRef(searchQuery);
  const isFirstRender = useRef(true);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "profile-events",
      filter_type,
      searchQuery,
      filters,
      currentPage,
      limit,
      user_id,
    ],
    queryFn: () =>
      getAllOpportunities({
        filter_type,
        search: searchQuery,
        start_date: filters?.startDate
          ? moment(filters.startDate).format("YYYY-MM-DD")
          : undefined,
        end_date: filters?.endDate
          ? moment(filters.endDate).format("YYYY-MM-DD")
          : undefined,
        opportunity_type: filters?.category,
        status: filters?.status,
        tags: filters?.tags,
        user_id: isPublicProfile ? user_id : undefined,
        page: currentPage,
        limit,
      }),
  });

  // Handle filter changes
  useEffect(() => {
    if (!isFirstRender.current) {
      const filtersChanged =
        JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
      const searchChanged = prevSearchQueryRef.current !== searchQuery;
      if (filtersChanged || searchChanged) {
        setCurrentPage(1);
        setEvents([]);
        setHasMore(true);
      }
    } else {
      isFirstRender.current = false;
    }
    prevFiltersRef.current = filters;
    prevSearchQueryRef.current = searchQuery;
  }, [filters, searchQuery]);

  // Handle data loading
  useEffect(() => {
    if (data?.data && !isFetching) {
      if (currentPage === 1) {
        setEvents(data.data);
      } else {
        setEvents((prev) => [...prev, ...data.data]);
      }

      if (data?.meta?.pagination) {
        setHasMore(currentPage < data.meta.pagination.total_pages);
      } else {
        // Fallback if no meta
        setHasMore(data.data.length === limit);
      }
    } else if (currentPage === 1 && !isLoading && !isFetching && !data?.data) {
      setEvents([]);
    }
  }, [data, isFetching, isLoading, currentPage, limit]);

  const loadMore = () => {
    if (!isFetching && hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const [deleteModalInfo, setDeleteModalInfo] = useState<{
    isOpen: boolean;
    eventId?: string;
    eventTitle?: { title_en: string; title_ar: string };
  }>({ isOpen: false });

  const getStatusStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case "inprogress":
        return "bg-primary-505 text-primary-5";
      case "completed":
      case "upcoming":
        return "bg-primary-10 text-white";
      default:
        return "";
    }
  };

  // Function to determine button text based on conditions
  const getButtonText = (item: EventData) => {
    // If user is not logged in
    if (!currentUser) {
      return item.registration_required
        ? t("COMMON.REGISTER")
        : t("COMMON.DETAILS");
    }

    // If user is the creator
    if (item.created_by?.id === currentUser.id) {
      if (
        item.event_status === "completed" ||
        item.event_status === "inprogress"
      ) {
        return t("COMMON.REPOST");
      }
      return t("COMMON.EDIT_TEXT");
    }

    // If user is an organization
    if (currentUser.user_type === "organization") {
      return t("COMMON.VIEW");
    }

    // If due date is passed
    const dueDate = moment(item.due_date);
    const today = moment();
    if (dueDate.isBefore(today, "day")) {
      return t("COMMON.CLOSED");
    }

    // If registration is required and event is full
    if (item.registration_required) {
      const registeredCount = Number(item.registered_volunteers_count) || 0;
      if (registeredCount >= item.participants_needed) {
        return t("COMMON.FULL");
      }
      return t("COMMON.REGISTER");
    }

    // For volunteer user, if registration is not required
    return t("COMMON.DETAILS");
  };

  const hasNoEvents = !events || events.length === 0;

  return (
    <div>
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
            refetch={() => {
              refetch();
            }}
            eventTitle={deleteModalInfo.eventTitle}
          />
        </Modal>
      )}

      {hasNoEvents && !isLoading && !isFetching ? (
        <div className="text-center py-8 text-secondary-102 text-lg font-medium">
          {t("COMMON.NO_EVENTS_AVAILABLE")}
        </div>
      ) : (
        <InfiniteScroll
          dataLength={events.length}
          next={loadMore}
          hasMore={hasMore}
          hasChildren={events.length > 0}
          loader={<Loader inline />}
          endMessage={
            events.length > 0 ? (
              <p className="text-center py-4 text-secondary-102">
                {t("COMMON.NO_MORE_EVENTS")}
              </p>
            ) : null
          }
          className="overflow-hidden pt-[25px] 2xl:pt-[50px] laptop:pt-[40px] lg:pt-[24px] md:pt-[30px] cross-class-visible"
        >
          <div className="grid grid-cols-1 miniscreen4:grid-cols-2 2xl:grid-cols-3 xl:grid-cols-3 miniscreen:grid-cols-1 laptopitms:grid-cols-3 md:grid-cols-2 gap-[25px] mobilescreen:gap-0 items-stretch">
            {events.map((item) => {
              const title =
                item[selectedLanguage === "ar" ? "title_ar" : "title_en"] || "";
              const isPaid =
                item?.participation_type_display?.value_en === "Paid Event";

              return (
                <div key={item.id} className="mobilescreen:pb-6 h-full">
                  <Link href={`/event-details/${item.id}`} className="flex flex-col h-full">
                    <div className="border-[#484848] relative rounded-t-[20px] border-t-[1px] border-l-[1px] border-r-[1px]">
                      {currentUser &&
                        item.created_by?.id === currentUser.id &&
                        item.event_status !== "completed" &&
                        item.event_status !== "inprogress" && (
                          <div className="absolute -left-3 -top-3 z-10">
                            <Image
                              src={asset(
                                "voluneteerevent/card_delete_icon_orange.svg"
                              )}
                              alt="Delete"
                              width={27}
                              height={27}
                              className="w-[27px] h-[27px] cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleteModalInfo({
                                  isOpen: true,
                                  eventId: String(item.id),
                                  eventTitle: {
                                    title_en: item.title_en,
                                    title_ar: item.title_ar,
                                  },
                                });
                              }}
                            />
                          </div>
                        )}
                      <Image
                        src={
                          item.event_images?.[0]?.image ||
                          asset("voluneteerevent/eventbaner.svg")
                        }
                        alt={title}
                        width={400}
                        height={300}
                        unoptimized
                        /* Square (1:1) crop, matching the upload form and the other cards. */
                        className="w-full aspect-square border border-[#484848] border-b-0 rounded-t-[20px] object-cover"
                      />

                      <div className="absolute top-0 right-0 pr-4 pt-4">
                        <div
                          className={`inline-flex h-[30px] items-center justify-center px-4 font-bold rounded-[5px] ${
                            isPaid
                              ? "bg-primary-100/85 text-white"
                              : "bg-primary-5/85 text-white"
                          }`}
                        >
                          <span
                            className={
                              selectedLanguage === "ar"
                                ? isPaid
                                  ? "relative bottom-[2px]"
                                  : "relative bottom-[3px]"
                                : ""
                            }
                          >
                            {isPaid ? t("COMMON.PAID") : t("COMMON.FREE")}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 text-sm text-gray-600 bg-[#000000B2]/70 absolute w-full bottom-0 h-[39px] items-center">
                        <span className="flex miniscreen3:text-[12px] smallscreen:text-[10px] laptopitms:text-xs text-white justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs:text-xs">
                          <Image
                            className="smallscreen:text-[12px] 2xl:w-5 2xl:h-5 w-4 h-4"
                            src={asset("homepage/dateicn.svg")}
                            alt="Date Icon"
                            width={20}
                            height={20}
                          />
                          {formatDateRange(
                            item.start_date,
                            item.end_date,
                            selectedLanguage,
                            t
                          )}
                        </span>
                        <div className="h-[60%] w-[1px] bg-white absolute left-1/2 top-[8px]" />
                        <span className="text-white miniscreen3:text-[12px] smallscreen:text-[10px] laptopitms:text-xs flex justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs:text-xs">
                          <Image
                            src={asset("homepage/timeicn.svg")}
                            className="smallscreen:text-[12px] 2xl:w-5 2xl:h-5 w-4 h-4"
                            alt="Time Icon"
                            width={20}
                            height={20}
                          />
                          {moment(item.start_time, "HH:mm:ss").format("hh:mm")}{" "}
                          {moment(item.start_time, "HH:mm:ss").format("a") ===
                          "am"
                            ? t("COMMON.AM")
                            : t("COMMON.PM")}{" "}
                          - {moment(item.end_time, "HH:mm:ss").format("hh:mm")}{" "}
                          {moment(item.end_time, "HH:mm:ss").format("a") === "am"
                            ? t("COMMON.AM")
                            : t("COMMON.PM")}
                        </span>
                      </div>
                    </div>

                    <div className="border-primary-801 border-b-[1px] border-l-[1px] border-r-[1px] rounded-b-[20px] relative bg-[#fff] px-4 pb-4 eventshadhow mb-[10px] flex flex-col flex-1">
                      <div className="flex items-center justify-between pt-2 pb-[10px]">
                        <h3 className="2xl:text-[25px] text-[18px] text-secondary-100 font-bold line-clamp-1">
                          {title.length > 12
                            ? `${title.substring(0, 12)}...`
                            : title}
                        </h3>
                        {item.event_status && (
                          <span
                            className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusStyles(
                              item.event_status
                            )}`}
                          >
                            {item.event_status === "inprogress"
                              ? t("COMMON.IN_PROGRESS")
                              : item.event_status === "completed"
                                ? t("COMMON.FINISHED")
                                : t("COMMON.UPCOMING")}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-end mt-auto">
                        <div>
                          <p className="flex items-center text-secondary-102 gap-[14px] 2xl:text-lg lg:text-base text-sm xss:text-base pb-4">
                            <Image
                              className="w-5 h-5 xss:w-5 xss:h-5"
                              src={asset("homepage/learn_type.svg")}
                              alt=""
                              width={20}
                              height={20}
                            />
                            {
                              item.event_type_display?.[
                                selectedLanguage === "ar"
                                  ? "value_ar"
                                  : "value_en"
                              ]
                            }
                          </p>
                          <div className="flex overflow-hidden gap-[15px] pb-4 items-center">
                            <Image
                              className="w-5 h-5 xss:w-5 xss:h-5"
                              src={asset("homepage/locations.svg")}
                              alt=""
                              width={20}
                              height={20}
                            />
                            <p className="text-secondary-102 gap-[14px] 2xl:text-lg lg:text-base text-sm xss:text-base-sm line-clamp-1">
                              {(() => {
                                const locationText =
                                  item[
                                    selectedLanguage === "ar"
                                      ? "location_ar"
                                      : "location_en"
                                  ] || t("COMMON.LOADING_LOCATION");

                                // Truncate to a fixed length
                                return typeof locationText === "string" &&
                                  locationText.length > 12
                                  ? locationText.slice(0, 12).concat("...")
                                  : locationText;
                              })()}
                            </p>
                          </div>

                          <div className="flex items-center text-secondary-102 gap-[14px] 2xl:text-lg lg:text-base text-sm xss:text-base-sm">
                            <Image
                              className="w-5 h-5 xss:w-5 xss:h-5"
                              src={asset("homepage/health.svg")}
                              alt=""
                              width={20}
                              height={20}
                            />
                            <p
                              className="line-clamp-1 text-ellipsis overflow-hidden cursor-pointer hover:text-primary-5 hover:underline transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const interestValue =
                                  item.interest_display?.[0]?.[
                                    selectedLanguage === "ar"
                                      ? "value_ar"
                                      : "value_en"
                                  ];
                                if (interestValue) {
                                  router.push(
                                    `/events-and-activities?tags=${encodeURIComponent(
                                      interestValue
                                    )}`
                                  );
                                }
                              }}
                            >
                              {item.interest_display?.[0]?.[
                                selectedLanguage === "ar"
                                  ? "value_ar"
                                  : "value_en"
                              ] ?? ""}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Button variant="orange" size="xss">
                            {getButtonText(item)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default ProfileEventCard;
