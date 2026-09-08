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
import DeleteOpportunityModal from "@/features/opportunities/components/DeleteOpportunityModal";
import OpportunityBadges, {
  OpportunityVisibilityInfo,
} from "@/features/opportunities/components/OpportunityBadges";
import {
  getOpportunityButtonLabelKey,
  getOpportunityButtonState,
  isCreatorRepostState,
} from "@/features/shared/opportunityButtonState";
import {
  LEARN_SERVE_FORM_PATH,
  learnServeEditPath,
} from "@/features/opportunities/routes";
import { getAllOpportunities, getUserOpportunities } from "@/features/opportunities/services/opportunities";
import { formatDateRange } from "@/lib/helpers";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";
import { FiltersData } from "./ProfileFilterForm";

const asset = (path: string) => `/assets/${path}`;

interface OpportunityImage {
  image: string;
}

interface BaseOpportunityData {
  id: number;
  opportunity_type: string;
  opportunity_images?: OpportunityImage[];
  title_en: string;
  title_ar: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
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

interface VolunteerOpportunityData extends BaseOpportunityData {
  from_age?: number;
  to_age?: number;
}

interface LearnServeOpportunityData extends BaseOpportunityData {
  learning_type_display?: { value_en: string; value_ar: string };
}

type OpportunityData = VolunteerOpportunityData | LearnServeOpportunityData;

type CardType = "registered" | "organized" | "attendee" | "sponsored";

interface ProfileVolunteerCardProps {
  buttonText?: string;
  filter_type: CardType;
  filters?: FiltersData;
  searchQuery?: string;
  currentUser?: any; // Current user, used for creator/registration checks
  isPublicProfile?: boolean;
  user_id?: string; // Target user when viewing a public profile
  type?: CardType;
  useNewApi?: boolean; // Flag to determine which API to use
}

const ProfileVolunteerCard: React.FC<ProfileVolunteerCardProps> = ({
  buttonText,
  filter_type,
  filters,
  searchQuery = "",
  currentUser,
  isPublicProfile = false,
  user_id,
  type,
  useNewApi = false, // Default to false (use old API)
}) => {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();
  const router = useRouter();

  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [deleteModalInfo, setDeleteModalInfo] = useState<{
    isOpen: boolean;
    opportunityId?: string;
    opportunityTitle?: { title_en: string; title_ar: string };
  }>({ isOpen: false });

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

  // Use new API only when explicitly told to (volunteer profile's registered/organized tabs)
  const isNewApiTab =
    useNewApi && (filter_type === "registered" || filter_type === "organized");

  /**
   * On `/list-user-opportunities/` the tab this component calls "organized" has
   * never filtered by creator — it has always meant "completed, with at least
   * one attended registration", which is why the UI labels it Attended. The
   * backend gave that query its real name in BE-14; `organized` still runs the
   * identical query for back-compat, but `attended` is the going-forward value.
   * The prop keeps the old name because it also drives this card's styling and
   * the legacy `/list-all-opportunities/` path, where `organized` genuinely
   * does mean created-by-me.
   */
  const userOpportunitiesFilterType =
    filter_type === "organized" ? "attended" : filter_type;

  const commonParams = {
    search: searchQuery,
    start_date: filters?.startDate
      ? moment(filters.startDate).format("YYYY-MM-DD")
      : undefined,
    end_date: filters?.endDate
      ? moment(filters.endDate).format("YYYY-MM-DD")
      : undefined,
    tags: filters?.tags,
    user_id: isPublicProfile ? user_id : undefined,
    page: currentPage,
    limit,
  };

  const newQuery = useQuery({
    queryKey: [
      "user-opportunities",
      userOpportunitiesFilterType,
      commonParams,
      filters,
    ],
    queryFn: () =>
      getUserOpportunities({
        ...commonParams,
        filter_type: userOpportunitiesFilterType,
        opportunity_type: filters?.opportunity_type,
        opportunity_status: filters?.opportunity_status,
      }),
    enabled: isNewApiTab,
  });

  const oldQuery = useQuery({
    queryKey: ["all-opportunities", filter_type, commonParams, filters],
    queryFn: () =>
      getAllOpportunities({
        ...commonParams,
        filter_type: filter_type === "registered" ? "volunteer" : filter_type,
        opportunity_type: filters?.opportunity_type || filters?.category,
        status: filters?.opportunity_status || filters?.status,
      }),
    enabled: !isNewApiTab,
  });

  // Use the appropriate data based on the tab
  const { data, isLoading, isFetching, refetch } = isNewApiTab
    ? newQuery
    : oldQuery;

  // Handle filter changes
  useEffect(() => {
    if (!isFirstRender.current) {
      const filtersChanged =
        JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
      const searchChanged = prevSearchQueryRef.current !== searchQuery;
      if (filtersChanged || searchChanged) {
        setCurrentPage(1);
        setOpportunities([]);
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
        setOpportunities(data.data);
      } else {
        setOpportunities((prev) => [...prev, ...data.data]);
      }

      if (data?.meta?.pagination) {
        setHasMore(currentPage < data.meta.pagination.total_pages);
      } else {
        // Fallback if no meta
        setHasMore(data.data.length === limit);
      }
    } else if (currentPage === 1 && !isLoading && !isFetching && !data?.data) {
      setOpportunities([]);
    }
  }, [data, isFetching, isLoading, currentPage, limit]);

  const loadMore = () => {
    if (!isFetching && hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const isVolunteerOpportunity = (opportunity_type: string) =>
    opportunity_type === "volunteer_opportunity";

  const getStatusStyles = (status: string, opportunity_type: string) => {
    switch (status?.toLowerCase()) {
      case "inprogress":
        return "bg-primary-505 text-primary-5";
      case "completed":
        if (!type) return "";
        if (type === "attendee") return "bg-primary-803 text-white";
        return isVolunteerOpportunity(opportunity_type)
          ? "bg-primary-802 text-white"
          : "bg-primary-803 text-white";
      case "upcoming":
        return "bg-primary-10 text-white";
      default:
        return "";
    }
  };

  const getBgClassByType = (opportunity_type: string) => {
    if (!type) return "bg-primary-802";
    if (type === "attendee") return "bg-primary-803";
    return isVolunteerOpportunity(opportunity_type)
      ? "bg-primary-802"
      : "bg-primary-803";
  };

  const getBorderClassByType = (opportunity_type: string) => {
    if (!type) return "border-primary-802";
    if (type === "attendee") return "border-primary-803";
    return isVolunteerOpportunity(opportunity_type)
      ? "border-primary-802"
      : "border-primary-803";
  };

  const getDeleteIconByType = (opportunity_type: string) => {
    if (type === "attendee")
      return asset("voluneteerevent/card_delete_icon_organized.svg");
    return isVolunteerOpportunity(opportunity_type)
      ? asset("voluneteerevent/card_delete_icon_blue.svg")
      : asset("voluneteerevent/card_delete_icon_organized.svg");
  };

  const getPersonIconByType = (opportunity_type: string) => {
    if (type === "attendee") return asset("homepage/person_icon_organized.svg");
    return isVolunteerOpportunity(opportunity_type)
      ? asset("homepage/person_icon_blue.svg")
      : asset("homepage/person_icon_organized.svg");
  };

  const isOnlineFormat = (item: OpportunityData) => {
    const learnServe = item as LearnServeOpportunityData;
    return (
      learnServe.format === "ONLINE" ||
      (!!learnServe.format_display &&
        (learnServe.format_display.value_en.toLowerCase() === "online" ||
          learnServe.format_display.value_ar.toLowerCase() === "عن بعد"))
    );
  };

  // Function to determine button text based on conditions
  const getButtonText = (item: OpportunityData) => {
    // 1. If a custom buttonText prop is provided, use it.
    if (buttonText) return buttonText;

    // 2. If item is undefined, default to "Register".
    if (!item) return t("COMMON.REGISTER");

    // 3. If the current user is the creator:
    if (currentUser && item.created_by?.id === currentUser.id) {
      // Resubmission is only wired up for volunteer opportunities so far.
      if (
        isVolunteerOpportunity(item.opportunity_type) &&
        item.approval_status === "rejected"
      ) {
        return t("COMMON.EDIT_AND_RESUBMIT");
      }
      // If opportunity is under way or finished, show "Repost"
      if (isCreatorRepostState(item)) {
        return t("COMMON.REPOST");
      }
      return t("COMMON.EDIT_TEXT");
    }

    // 4. `is_registered` is only present for the authenticated viewer, so fall
    //    back to scanning the registered list when the flag is absent.
    const isRegistered =
      item.is_registered ??
      (currentUser && Array.isArray(item.all_registered_user)
        ? item.all_registered_user.some((user) => user.id === currentUser.id)
        : undefined);

    // 5. Ended / Started / Unregister / Full / Closed / Register
    const state = getOpportunityButtonState({ ...item, is_registered: isRegistered });

    // 6. Organizations browse other creators' opportunities read-only.
    if (
      state === "register" &&
      currentUser &&
      currentUser.user_type === "organization"
    ) {
      return t("COMMON.VIEW");
    }

    return t(getOpportunityButtonLabelKey(state));
  };

  const detailHref = (item: OpportunityData) =>
    isVolunteerOpportunity(item.opportunity_type)
      ? `/volunteer-event-detail/${item.id}`
      : `/learn-share-event-detail/${item.id}`;

  // The creator's own button manages the opportunity directly rather than
  // opening the detail page first — everyone else keeps the card's default
  // behaviour of navigating through to the detail page.
  const handleActionClick = (item: OpportunityData) => {
    if (!currentUser || item.created_by?.id !== currentUser.id) {
      router.push(detailHref(item));
      return;
    }
    const isVolunteer = isVolunteerOpportunity(item.opportunity_type);
    const isRepublish = isCreatorRepostState(item);

    // Editing a learn & serve opportunity has its own URL; reposting seeds a
    // new one, so it keeps going through the bare form + nav state.
    if (!isVolunteer && !isRepublish) {
      router.push(learnServeEditPath(item.id));
      return;
    }

    setNavState(
      isVolunteer ? NAV_STATE_KEYS.volunteerForm : NAV_STATE_KEYS.learnServeForm,
      { id: String(item.id), isRepublish }
    );
    router.push(isVolunteer ? "/volunteer-form" : LEARN_SERVE_FORM_PATH);
  };

  const hasNoOpportunities = !opportunities || opportunities.length === 0;

  return (
    <div>
      {deleteModalInfo.isOpen && (
        <Modal
          title={t("COMMON.DELETE_OPPORTUNITY")}
          open={deleteModalInfo.isOpen}
          onClose={() => setDeleteModalInfo({ isOpen: false })}
          size="small"
          position="default"
        >
          <DeleteOpportunityModal
            opportunityId={deleteModalInfo.opportunityId!}
            type={(() => {
              const opp = opportunities.find(
                (o) => String(o.id) === deleteModalInfo.opportunityId
              );
              return opp?.opportunity_type === "learn_serve_opportunity"
                ? "learnserve"
                : "volunteer";
            })()}
            setOpenModal={() => setDeleteModalInfo({ isOpen: false })}
            refetch={() => {
              refetch();
            }}
            opportunityTitle={deleteModalInfo.opportunityTitle}
          />
        </Modal>
      )}

      {hasNoOpportunities && !isLoading && !isFetching ? (
        <div className="text-center py-8 text-secondary-102 text-lg font-medium">
          {t("COMMON.NO_VOLUNTEER_OPPORTUNITIES_AVAILABLE")}
        </div>
      ) : (
        <InfiniteScroll
          dataLength={opportunities.length}
          next={loadMore}
          hasMore={hasMore}
          hasChildren={opportunities.length > 0}
          loader={<Loader inline />}
          endMessage={
            opportunities.length > 0 ? (
              <p className="text-center py-4 text-secondary-102">
                {t("COMMON.NO_MORE_OPPORTUNITIES")}
              </p>
            ) : null
          }
          className="overflow-hidden pt-[25px] 2xl:pt-[50px] laptop:pt-[40px] lg:pt-[24px] md:pt-[30px] cross-class-visible"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[25px] mobilescreen:gap-0">
            {opportunities.map((item) => {
              const title =
                item[selectedLanguage === "ar" ? "title_ar" : "title_en"] ?? "";
              const online = isOnlineFormat(item);

              return (
                // Volunteer and learn-serve opportunities are separate
                // backend models with their own id sequences, so a plain
                // `item.id` can collide between the two once both types are
                // combined in one list (no type filter applied).
                <div
                  key={`${item.opportunity_type}-${item.id}`}
                  className="mobilescreen:pb-6"
                >
                  <div className="relative">
                    <Link href={detailHref(item)}>
                      {currentUser &&
                        item.created_by?.id === currentUser.id &&
                        item.opportunity_status !== "completed" &&
                        item.opportunity_status !== "inprogress" && (
                          <div className="absolute -left-3 -top-3 z-10">
                            <Image
                              src={getDeleteIconByType(item.opportunity_type)}
                              alt="Delete"
                              width={27}
                              height={27}
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
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            />
                          </div>
                        )}
                      <Image
                        src={
                          item.opportunity_images?.[0]?.image ||
                          asset("homepage/treeplanting.png")
                        }
                        alt={title}
                        width={400}
                        height={300}
                        unoptimized
                        /* Square (1:1) crop — matches the ratio the upload form
                           crops to, so the card never letterboxes or stretches. */
                        className="w-full aspect-square border border-[#484848] border-b-0 rounded-t-[20px] object-cover"
                      />

                      {/* Status Icons */}
                      <OpportunityBadges item={item} />

                      <div className="grid grid-cols-2 text-sm text-gray-600 bg-[#000000B2]/70 absolute w-full bottom-0 h-[39px] items-center">
                        <span className="flex miniscreen3:text-[12px] xs3:text-[10px] laptopitms:text-xs text-white justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs2:text-[11px]">
                          <Image
                            src={asset("homepage/dateicn.svg")}
                            alt="Date Icon"
                            width={20}
                            height={20}
                            className="smallscreen:w-3 2xl:w-5 2xl:h-5 w-4 h-4"
                          />
                          {formatDateRange(
                            item.start_date,
                            item.end_date,
                            selectedLanguage,
                            t
                          )}
                        </span>

                        <div className="h-[60%] w-[1px] bg-white absolute left-1/2 top-[8px]" />

                        <span className="text-white miniscreen3:text-[12px] xs3:text-[10px] laptopitms:text-xs flex justify-center gap-2 items-center 2xl:text-base laptopmain:text-sm md:text-sm miniscreen1:text-[13px] xs2:text-[11px]">
                          <Image
                            src={asset("homepage/timeicn.svg")}
                            alt="Time Icon"
                            width={20}
                            height={20}
                            className="smallscreen:w-3 2xl:w-5 2xl:h-5 w-4 h-4"
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
                    </Link>
                  </div>

                  <div
                    className={`boxshadows 2xl:px-5 px-3 xss:px-3 rounded-b-[20px] border ${getBorderClassByType(
                      item.opportunity_type
                    )} pb-10 relative bg-[#F7F7F7]`}
                  >
                    <Link href={detailHref(item)}>
                      <div className="flex justify-between items-center">
                        <h3 className="2xl:text-[25px] text-lg text-secondary-100 2xl:pb-7 pb-3 font-bold pt-[19px] truncate whitespace-nowrap overflow-hidden">
                          {title.length > 10
                            ? `${title.substring(0, 10)}...`
                            : title}
                          <OpportunityVisibilityInfo
                            isPublic={item.is_public}
                            className="ms-2"
                          />
                        </h3>
                        {/* Hide status when using new API for the "organized" tab in volunteer profile */}
                        {!(useNewApi && filter_type === "organized") &&
                          item.opportunity_status && (
                            <span
                              className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusStyles(
                                item.opportunity_status,
                                item.opportunity_type
                              )}`}
                            >
                              {item.opportunity_status === "inprogress"
                                ? t("COMMON.IN_PROGRESS")
                                : item.opportunity_status === "completed"
                                  ? t("COMMON.FINISHED")
                                  : t("COMMON.UPCOMING")}
                            </span>
                          )}
                      </div>

                      <div>
                        <div className="grid grid-cols-2 extrasmall:flex-col justify-between pb-[22px]">
                          <p className="flex items-center text-secondary-102 2xl:text-lg lg:text-base text-sm xss:text-base gap-2 leading-tight">
                            {item.opportunity_type ===
                            "learn_serve_opportunity" ? (
                              <>
                                <Image
                                  src={asset("homepage/learn_type.svg")}
                                  className="w-5 h-5 object-contain"
                                  alt="Learning Type"
                                  width={20}
                                  height={20}
                                />
                                <span className="line-clamp-1">
                                  {(() => {
                                    const val =
                                      (item as LearnServeOpportunityData)
                                        .learning_type_display?.[
                                        selectedLanguage === "ar"
                                          ? "value_ar"
                                          : "value_en"
                                      ] ?? "";
                                    return val.length > 12
                                      ? `${val.slice(0, 12)}..`
                                      : val;
                                  })()}
                                </span>
                              </>
                            ) : (
                              <>
                                <Image
                                  src={asset("voluneteerevent/age.svg")}
                                  className="w-5 h-5 object-contain"
                                  alt="Age"
                                  width={20}
                                  height={20}
                                />
                                {(item as VolunteerOpportunityData).from_age}
                                {(item as VolunteerOpportunityData).to_age ? (
                                  <>
                                    <span className="text-secondary-102"> - </span>
                                    {(item as VolunteerOpportunityData).to_age}
                                  </>
                                ) : (
                                  <span className="text-secondary-102"> + </span>
                                )}
                              </>
                            )}
                          </p>
                          <div className="flex items-center text-secondary-102 2xl:text-lg lg:text-base text-sm xss:text-base gap-2 leading-tight">
                            <Image
                              src={
                                online
                                  ? asset("voluneteerevent/online.svg")
                                  : asset("homepage/locations.svg")
                              }
                              className="w-5 h-5 object-contain"
                              alt="Location"
                              width={20}
                              height={20}
                            />
                            <div className="flex-1 overflow-hidden">
                              <p className="line-clamp-1 text-ellipsis overflow-hidden">
                                {(() => {
                                  if (online) return t("COMMON.ONLINE");

                                  // For learn and serve in-person opportunities
                                  if (
                                    item.opportunity_type ===
                                    "learn_serve_opportunity"
                                  ) {
                                    return t("COMMON.IN_PERSON");
                                  }

                                  // For volunteer opportunities, show location
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
                          </div>
                        </div>

                        <div className="grid grid-cols-2 extrasmall:flex-col justify-between text-secondary-102 text-lg">
                          <p className="flex items-center text-secondary-102 2xl:text-lg laptopmain:text-base lg:text-base text-sm xss:text-base gap-2 leading-tight">
                            <Image
                              src={getPersonIconByType(item.opportunity_type)}
                              className="w-5 h-5 object-contain"
                              alt="Spots"
                              width={20}
                              height={20}
                            />
                            {`${item.registered_volunteers_count}/${item.participants_needed}`}
                          </p>
                          <div className="flex items-center text-secondary-102 2xl:text-lg laptopmain:text-base lg:text-base text-sm xss:text-base gap-2 leading-tight">
                            <Image
                              src={asset("homepage/health.svg")}
                              className="w-5 h-5 object-contain"
                              alt="Category"
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
                                if (!interestValue) return;
                                const listPath =
                                  item.opportunity_type ===
                                  "learn_serve_opportunity"
                                    ? "/learn-and-share-list"
                                    : "/volunteer-opportunities-list";
                                router.push(
                                  `${listPath}?tags=${encodeURIComponent(
                                    interestValue
                                  )}`
                                );
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
                      </div>
                    </Link>
                  </div>

                  <Button
                    className={`${getBgClassByType(
                      item.opportunity_type
                    )} relative mx-auto flex justify-center bottom-[25px]`}
                    variant="primary"
                    size="xss"
                    onClick={() => handleActionClick(item)}
                  >
                    {getButtonText(item)}
                  </Button>
                </div>
              );
            })}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default ProfileVolunteerCard;
