"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import InfiniteScroll from "react-infinite-scroll-component";

import { Button } from "@/components/ui/Button";
import Searchbar from "@/components/ui/Searchbar";
import Table, { TableColumn } from "@/components/ui/Table";
import Loader from "@/components/ui/Loader";
import { SponsorsClient } from "@/features/home";
import { downloadLearnServeRegistrations, getLearnServeRegistrations } from "@/features/opportunities/services/learnServe";
import { getDefaultProfileImage } from "@/lib/helpers";
import { NAV_STATE_KEYS, getNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

export interface RegisterListState {
  id?: string;
}

interface RegisteredUser {
  id: number | string;
  user: {
    id: number;
    profile_pic: string;
    full_name: string;
    is_public?: boolean;
    email?: string;
    phone_number?: string;
    dob?: string;
    gender_display?: {
      value_en: string;
      value_ar: string;
    };
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_country_code?: string | null;
    emergency_contact_civil_id?: string | null;
    emergency_contact_relationship_display?: {
      id: number;
      choice_type: string;
      value_en: string;
      value_ar: string;
    } | null;
  };
  user_full_name: string;
  user_contact_number?: string;
  is_attended: boolean;
  created_at: string;
  registration_date?: string;
}

// Helper function to calculate if volunteer was under 18 at registration time
const calculateAgeAtRegistration = (
  dob: string,
  registrationDate: string
): number | null => {
  if (!dob || !registrationDate) return null;

  const birthDate = new Date(dob);
  const regDate = new Date(registrationDate);

  let age = regDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = regDate.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && regDate.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

// Helper function to check if emergency contact should be displayed
const shouldShowEmergencyContact = (rowData: any): boolean => {
  const dob = rowData?.user?.dob;
  const createdAt = rowData?.created_at || rowData?.registration_date;

  if (!dob || !createdAt) return false;

  const age = calculateAgeAtRegistration(dob, createdAt);
  if (age === null || age >= 18) return false;

  // Check if emergency contact data exists
  const hasEmergencyContact =
    rowData?.user?.emergency_contact_name ||
    rowData?.user?.emergency_contact_phone ||
    rowData?.user?.emergency_contact_civil_id ||
    rowData?.user?.emergency_contact_relationship_display;

  return !!hasEmergencyContact;
};

export default function RegisterList() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [allRegistrations, setAllRegistrations] = useState<RegisteredUser[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Track which pages have already been merged to avoid duplicate rows
  const mergedPagesRef = useRef<Set<number>>(new Set());

  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  // Carried over from the opportunity row that linked here.
  const [navState, setNavStateValue] = useState<RegisterListState | null>(null);
  useEffect(() => {
    setNavStateValue(
      getNavState<RegisterListState>(NAV_STATE_KEYS.registerList) ?? {}
    );
  }, []);
  const opportunityId = navState?.id;

  const downloadMutation = useMutation({
    mutationFn: downloadLearnServeRegistrations,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page and data when search actually changes
  useEffect(() => {
    setCurrentPage(1);
    setAllRegistrations([]);
    setHasMore(true);
    mergedPagesRef.current = new Set();
  }, [debouncedSearch]);

  const {
    data: registrations,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "learn-serve-registrations",
      opportunityId,
      currentPage,
      limit,
      debouncedSearch,
    ],
    queryFn: () =>
      getLearnServeRegistrations({
        opportunity_id: opportunityId as string,
        page: currentPage,
        limit,
        search: debouncedSearch,
      }),
    enabled: Boolean(opportunityId),
  });

  // Infinite scroll: accumulate registrations
  useEffect(() => {
    if (registrations?.data && !isFetching) {
      const pagination = registrations?.meta?.pagination;
      const responsePage =
        pagination?.page || pagination?.current_page || currentPage;

      if (responsePage === 1) {
        mergedPagesRef.current = new Set([1]);
        setAllRegistrations(registrations.data || []);
      } else if (!mergedPagesRef.current.has(responsePage)) {
        mergedPagesRef.current.add(responsePage);
        const newPageData: RegisteredUser[] = registrations.data || [];
        setAllRegistrations((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newRegs = newPageData.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newRegs];
        });
      }

      // Update hasMore based on pagination metadata
      if (pagination) {
        const page = pagination.page || pagination.current_page;
        const pages = pagination.total_pages;
        setHasMore(page < pages);
      } else {
        setHasMore((registrations.data || []).length >= limit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations, isFetching]);

  // Function to load more registrations
  const loadMoreRegistrations = useCallback(() => {
    // Guard: don't load next page while the list is empty (e.g. right after a reset)
    if (hasMore && !isFetching && allRegistrations.length > 0) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore, isFetching, allRegistrations.length]);

  const columns: TableColumn[] = [
    {
      label: t("COMMON.REGISTERED_LIST"),
      key: "user_full_name",
      type: "custom",
    },
    { label: t("COMMON.EMAIL"), key: "email", type: "email" },
    { label: t("COMMON.CONTACT_NUMBER"), key: "phone_number", type: "contact" },
    // Conditionally add emergency contact columns
    ...(allRegistrations.some((user) => shouldShowEmergencyContact(user))
      ? [
          {
            label: t("COMMON.EMERGENCY_CONTACT_NAME"),
            key: "emergency_contact_name",
            type: "emergency",
          },
          {
            label: t("COMMON.EMERGENCY_CONTACT_PHONE"),
            key: "emergency_contact_phone",
            type: "emergency",
          },
          {
            label: t("COMMON.EMERGENCY_CONTACT_CIVIL_ID"),
            key: "emergency_contact_civil_id",
            type: "emergency",
          },
          {
            label: t("COMMON.EMERGENCY_CONTACT_RELATIONSHIP"),
            key: "emergency_contact_relationship",
            type: "emergency",
          },
        ]
      : []),
  ];

  const handleDownload = async () => {
    if (!opportunityId) return;
    try {
      const response = await downloadMutation.mutateAsync({
        opportunity_id: opportunityId,
        search: debouncedSearch,
        all_data: true,
      });
      if (response.downloadUrl) {
        const link = document.createElement("a");
        link.href = response.downloadUrl;
        link.download = "List of Registered Volunteers.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success(t("COMMON.DOWNLOAD_SUCCESS"));
    } catch {
      toast.error(t("COMMON.DOWNLOAD_FAILURE"));
    }
  };

  // `navState === null` means the stashed payload has not been read yet.
  if (navState === null) return <Loader />;

  if (!opportunityId) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t("COMMON.NO_OPPORTUNITY_ID")}
      </div>
    );
  }

  // Whether to show inline loader (only on very first load)
  const showInitialLoader = isLoading && allRegistrations.length === 0;

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px] mx-auto relative">
        <div className="mobilescreen:w-[100%] flex justify-center pt-10 pb-[70px]">
          <Searchbar
            placeholder={t("COMMON.SEARCH_BY_NAME")}
            showFilterIcon={false}
            onSearchChange={(value) => setSearchQuery(value)}
          />
        </div>
        <div className="selectfiled voulnteerlist">
          {showInitialLoader ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : (
            <div
              id="registerlist-scroll-container"
              style={{ maxHeight: "500px", overflowY: "auto" }}
            >
              <InfiniteScroll
                dataLength={allRegistrations.length}
                next={loadMoreRegistrations}
                hasMore={hasMore}
                hasChildren={allRegistrations.length > 0}
                loader={
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-5" />
                  </div>
                }
                endMessage={
                  allRegistrations.length > 0 ? (
                    <div className="text-center text-gray-500 py-4 text-sm">
                      {t("COMMON.NO_MORE_REGISTERED_USERS")}
                    </div>
                  ) : null
                }
                scrollableTarget="registerlist-scroll-container"
                scrollThreshold={0.8}
              >
                <Table
                  columns={columns}
                  data={allRegistrations}
                  renderCell={(column, rowData: any) => {
                    if (column.key === "user_full_name") {
                      return (
                        <div className="flex items-center gap-3">
                          <Image
                            src={
                              rowData?.user?.profile_pic ||
                              getDefaultProfileImage(
                                rowData?.user?.gender_display?.value_en,
                                asset("profile/male_profile.svg"),
                                asset("profile/female_profile.svg"),
                                asset("profile/org_profile.svg")
                              )
                            }
                            alt={rowData?.user_full_name}
                            width={40}
                            height={40}
                            unoptimized
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span
                            className="cursor-pointer text-primary-5"
                            onClick={() => {
                              const user = rowData?.user;
                              if (!user) return;
                              router.push(
                                user?.is_public
                                  ? `/public-profile/${user.id}`
                                  : `/volunteer-private-profile/${user.id}`
                              );
                            }}
                          >
                            {rowData?.user_full_name}
                          </span>
                        </div>
                      );
                    }
                    if (column.type === "email") {
                      return <span>{rowData?.user?.email || "-"}</span>;
                    }
                    if (column.type === "contact") {
                      return (
                        <span>
                          {rowData?.user?.phone_number ||
                            rowData?.phone_number ||
                            "-"}
                        </span>
                      );
                    }
                    if (column.type === "emergency") {
                      if (!shouldShowEmergencyContact(rowData)) {
                        return <span className="text-gray-400">-</span>;
                      }

                      if (column.key === "emergency_contact_name") {
                        return (
                          <span>
                            {rowData.user.emergency_contact_name || "-"}
                          </span>
                        );
                      }
                      if (column.key === "emergency_contact_phone") {
                        return (
                          <span>
                            {rowData.user.emergency_contact_phone || "-"}
                          </span>
                        );
                      }
                      if (column.key === "emergency_contact_civil_id") {
                        return (
                          <span>
                            {rowData.user.emergency_contact_civil_id || "-"}
                          </span>
                        );
                      }
                      if (column.key === "emergency_contact_relationship") {
                        return (
                          <span>
                            {rowData.user
                              .emergency_contact_relationship_display
                              ? selectedLanguage === "ar"
                                ? rowData.user
                                    .emergency_contact_relationship_display
                                    .value_ar
                                : rowData.user
                                    .emergency_contact_relationship_display
                                    .value_en
                              : "-"}
                          </span>
                        );
                      }
                    }
                    return <span>{rowData[column.key]}</span>;
                  }}
                />
              </InfiniteScroll>
            </div>
          )}
        </div>
        <div className="flex justify-center mx-auto py-12 mobilescreen:py-8">
          <Button
            variant="primary"
            size="medium"
            className="!w-[255px] !h-[60px]"
            onClick={handleDownload}
            disabled={allRegistrations.length === 0}
          >
            <Image
              src={asset("voluneteerevent/downloadsheet.svg")}
              alt=""
              width={20}
              height={20}
            />{" "}
            {t("COMMON.DOWNLOAD_SHEET")}
          </Button>
        </div>
      </div>
      <div className="border-t border-[#000]/20 pt-12">
        <SponsorsClient />
      </div>
    </div>
  );
}
