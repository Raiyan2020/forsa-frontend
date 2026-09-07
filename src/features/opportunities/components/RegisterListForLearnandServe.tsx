"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RiDeleteBin5Fill } from "react-icons/ri";
import InfiniteScroll from "react-infinite-scroll-component";
import moment from "moment";

import { Button } from "@/components/ui/Button";
import Searchbar from "@/components/ui/Searchbar";
import { Modal } from "@/components/ui/Modal";
import Table, { TableColumn } from "@/components/ui/Table";
import Loader from "@/components/ui/Loader";
import { SponsorsClient } from "@/features/home";
import CheckInWindowBanner from "./CheckInWindowBanner";
import { deleteLearnServeRegistrationByOpportunity, downloadLearnServeRegistrations, getLearnServeRegistrations, updateLearnServeAttendance } from "@/features/opportunities/services/learnServe";
import { getCheckInWindow } from "@/features/opportunities/checkInWindow";
import { getDefaultProfileImage } from "@/lib/helpers";
import { registrationPerson } from "@/features/opportunities/registrationRow";
import { NAV_STATE_KEYS, getNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

export interface LearnServeRegisterListState {
  id?: string;
  start_date?: string;
  end_date?: string;
  // Check-in fields forwarded from the detail screen; see `lib/checkInWindow.ts`.
  requires_check_in?: boolean;
  manual_attendance_enabled?: boolean;
  preparation_valid_until?: string | null;
  preparation_valid_until_at?: string | null;
  is_preparation_window_closed?: boolean;
  preparation_reopened_until?: string | null;
}

interface RegisteredUser {
  id: number | string;
  user: {
    id: number;
    profile_pic: string;
    full_name: string;
    full_name_ar?: string;
    civil_id?: string | null;
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
  is_attended: boolean;
  created_at: string;
  updated_at: string;
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

export default function RegisterListForLearnandServe() {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const router = useRouter();

  // Carried over from the opportunity row that linked here.
  const [navState, setNavStateValue] =
    useState<LearnServeRegisterListState | null>(null);
  useEffect(() => {
    setNavStateValue(
      getNavState<LearnServeRegisterListState>(NAV_STATE_KEYS.registerList) ??
        {}
    );
  }, []);
  const opportunityId = navState?.id;
  const opportunityStartDate = navState?.start_date;
  const opportunityEndDate = navState?.end_date;

  const [currentPage, setCurrentPage] = useState(1);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<RegisteredUser[]>(
    []
  );
  const [hasMore, setHasMore] = useState(true);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  // Delete registration states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRegistrationId, setDeletingRegistrationId] = useState<
    string | null
  >(null);
  const [deletingUserName, setDeletingUserName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Track which pages have already been merged to avoid duplicate rows
  const mergedPagesRef = useRef<Set<number>>(new Set());

  /**
   * The check-in window is the backend's to define (72h past the end date by
   * default, admin-adjustable), so it is read from the payload rather than
   * recomputed. Workshops and consultations set `requires_check_in: false` and
   * get no attendance control at all.
   */
  const checkInWindow = useMemo(
    () =>
      getCheckInWindow(
        navState
          ? {
              start_date: navState.start_date,
              end_date: navState.end_date,
              requires_check_in: navState.requires_check_in,
              manual_attendance_enabled: navState.manual_attendance_enabled,
              preparation_valid_until: navState.preparation_valid_until,
              preparation_valid_until_at: navState.preparation_valid_until_at,
              is_preparation_window_closed:
                navState.is_preparation_window_closed,
              preparation_reopened_until: navState.preparation_reopened_until,
            }
          : null
      ),
    [navState]
  );

  const parsedStart = opportunityStartDate
    ? moment(opportunityStartDate).startOf("day")
    : null;
  const parsedEndStart = opportunityEndDate
    ? moment(opportunityEndDate).startOf("day")
    : null;
  const now = moment();

  // Attendance opens on the end date and runs until the backend's deadline.
  const canMarkAttendance =
    checkInWindow.requiresCheckIn &&
    checkInWindow.isOpen &&
    (parsedEndStart ? now.isSameOrAfter(parsedEndStart) : false);

  // Delete: visible always, disabled after start_date begins (strict after)
  const isAfterAttendanceDeadline = parsedStart ? now.isAfter(parsedStart) : false;

  const downloadMutation = useMutation({
    mutationFn: downloadLearnServeRegistrations,
  });
  const updateAttendanceMutation = useMutation({
    mutationFn: updateLearnServeAttendance,
  });
  const deleteRegistrationMutation = useMutation({
    mutationFn: deleteLearnServeRegistrationByOpportunity,
  });

  // Set up debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page, data, and selections when search actually changes
  useEffect(() => {
    setCurrentPage(1);
    setAllRegisteredUsers([]);
    setHasMore(true);
    setSelectedUsers([]);
    setSelectAll(false);
    setSelectAllMode(false);
    mergedPagesRef.current = new Set();
  }, [debouncedSearch]);

  // Fetch registrations data
  const {
    data: registrationsResponse,
    isLoading,
    refetch: refetchRegistrations,
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

  // Infinite scroll: accumulate users
  useEffect(() => {
    if (registrationsResponse?.data && !isFetching) {
      const pagination = registrationsResponse?.meta?.pagination;
      const responsePage =
        pagination?.page || pagination?.current_page || currentPage;

      if (responsePage === 1) {
        mergedPagesRef.current = new Set([1]);
        setAllRegisteredUsers(registrationsResponse.data || []);
      } else if (!mergedPagesRef.current.has(responsePage)) {
        mergedPagesRef.current.add(responsePage);
        const newPageData: RegisteredUser[] = registrationsResponse.data || [];
        setAllRegisteredUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const newUsers = newPageData.filter((u) => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });

        // Auto-select newly loaded items if selectAllMode is active
        if (selectAllMode) {
          const newSelectableIds = newPageData
            .filter((user) => !user.is_attended)
            .map((user) => user.id.toString());

          if (newSelectableIds.length > 0) {
            setSelectedUsers((prev) => [
              ...prev,
              ...newSelectableIds.filter((id) => !prev.includes(id)),
            ]);
          }
        }
      }

      // Update hasMore based on pagination metadata
      if (pagination) {
        const page = pagination.page || pagination.current_page;
        const pages = pagination.total_pages;
        setHasMore(page < pages);
      } else {
        setHasMore((registrationsResponse.data || []).length >= limit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationsResponse, isFetching]);

  // Function to load more registrations
  const loadMoreRegistrations = useCallback(() => {
    // Guard: don't load next page while the list is empty (e.g. right after a reset)
    if (hasMore && !isFetching && allRegisteredUsers.length > 0) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore, isFetching, allRegisteredUsers.length]);

  // Handle "Select All" checkbox change
  const handleSelectAllChange = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setSelectAllMode(newSelectAll);

    if (newSelectAll) {
      // Select from ALL loaded data, not just current page
      const selectableUserIds = allRegisteredUsers
        .filter((user) => !user.is_attended)
        .map((user) => user.id.toString());
      setSelectedUsers(selectableUserIds);
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle individual checkbox change
  const handleCheckboxChange = (userId: string | number) => {
    const userIdStr = userId.toString();

    // Update selected users
    let newSelectedUsers: string[];
    if (selectedUsers.includes(userIdStr)) {
      // User manually unchecked — exit select-all mode
      newSelectedUsers = selectedUsers.filter((id) => id !== userIdStr);
      setSelectAllMode(false);
    } else {
      newSelectedUsers = [...selectedUsers, userIdStr];
    }
    setSelectedUsers(newSelectedUsers);

    // Get all selectable users from ALL loaded data
    const selectableUsers = allRegisteredUsers.filter(
      (user) => !user.is_attended
    );

    // Check if all selectable users are now selected
    const allSelected =
      selectableUsers.length > 0 &&
      selectableUsers.every(
        (user) =>
          newSelectedUsers.includes(user.id.toString()) || user.is_attended
      );

    setSelectAll(allSelected);
  };

  // Window resize handling for responsive action rendering
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle "Attended" button click
  const handleAttendedClick = async () => {
    if (selectedUsers.length === 0) {
      toast.error(t("COMMON.SELECT_USERS_TO_MARK"));
      return;
    }

    setIsUpdating(true);
    try {
      const registrationIds = selectedUsers.map((id) => parseInt(id));
      const response = await updateAttendanceMutation.mutateAsync({
        opportunity_id: opportunityId as string,
        data: {
          registration_ids: registrationIds,
          is_attended: true,
        },
      });

      // Check if the response status is success
      if (response?.status === "success" || response?.key === "success") {
        toast.success(t("COMMON.USERS_MARKED_AS_ATTENDED"));

        // Update local state in-place: flip is_attended for the marked rows
        // immediately, without any reset or refetch (avoids loader race conditions).
        const attendedSet = new Set(selectedUsers);
        setAllRegisteredUsers((prev) =>
          prev.map((user) =>
            attendedSet.has(user.id.toString())
              ? { ...user, is_attended: true }
              : user
          )
        );

        setSelectedUsers([]);
        setSelectAll(false);
        setSelectAllMode(false);
      }
    } catch (error: any) {
      console.error("Failed to mark users as attended:", error);
      const payload = error?.response?.data;
      toast.error(
        payload?.message_en ||
          payload?.message ||
          t("COMMON.FAILED_TO_MARK_ATTENDED")
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle "Download Sheet" button click
  const handleDownloadSheet = async () => {
    if (!opportunityId) {
      toast.error(t("COMMON.NO_OPPORTUNITY_ID"));
      return;
    }

    try {
      const response = await downloadMutation.mutateAsync({
        opportunity_id: opportunityId,
        search: debouncedSearch,
      });

      if (response.downloadUrl) {
        const link = document.createElement("a");
        link.href = response.downloadUrl;
        link.download = "List of Registered Users.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success(t("COMMON.DOWNLOAD_SUCCESS"));
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(t("COMMON.DOWNLOAD_FAILURE"));
    }
  };

  // Handle delete registration
  const handleDeleteRegistration = async () => {
    if (!opportunityId || !deletingRegistrationId) return;

    try {
      setIsDeleting(true);
      await deleteRegistrationMutation.mutateAsync({
        opportunity_id: opportunityId,
        user_id: deletingRegistrationId,
      });

      setShowDeleteModal(false);
      toast.success(t("COMMON.REGISTRATION_DELETED_SUCCESS"));
      // Reset pagination and user list to force fresh fetch
      mergedPagesRef.current = new Set();
      setCurrentPage(1);
      setAllRegisteredUsers([]);
      setHasMore(true);
      setSelectedUsers([]);
      setSelectAll(false);
      setSelectAllMode(false);
      await refetchRegistrations();
    } catch (error: any) {
      console.error("Error deleting registration:", error);
      const payload = error?.response?.data;
      if (payload?.message_en || payload?.message_ar) {
        toast.error(
          payload[`message_${selectedLanguage}`] ||
            t("COMMON.REGISTRATION_DELETED_FAILED")
        );
      }
    } finally {
      setIsDeleting(false);
      setDeletingRegistrationId(null);
      setDeletingUserName("");
    }
  };

  // Open delete confirmation modal (pass user id for the delete API)
  const openDeleteModal = (userId: string | number, userName: string) => {
    // Prevent opening delete modal after attendance deadline
    if (isAfterAttendanceDeadline) return;
    setDeletingRegistrationId(userId.toString());
    setDeletingUserName(userName);
    setShowDeleteModal(true);
  };

  const columns: TableColumn[] = [
    // The select-all/attendance column disappears entirely for the types that
    // need no check-in (Workshop, Consultation).
    ...(checkInWindow.requiresCheckIn
      ? [
          {
            label: (
              <div className="flex items-center justify-center gap-2">
                <label className="cursor-pointer flex items-center gap-2">
                  <div className="border p-1 border-secondary-100">
                    <div
                      className={`h-4 w-4 relative ${
                        selectAll ? "bg-[#373737BF]/75" : "bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAllChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </label>
              </div>
            ),
            key: "attendance",
            type: "attendance",
            customClassName: "pr-[8px]",
          },
        ]
      : []),
    { label: t("COMMON.VOLUNTEER.NAME"), key: "full_name", type: "custom" },
    { label: t("COMMON.EMAIL"), key: "user_email", type: "email" },
    { label: t("COMMON.CONTACT_NUMBER"), key: "phone_number", type: "contact" },
    // Conditionally add emergency contact columns
    ...(allRegisteredUsers.some((user) => shouldShowEmergencyContact(user))
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
    { label: t("COMMON.ACTION"), key: "actions", type: "actions" },
  ];

  // `navState === null` means the stashed payload has not been read yet.
  if (navState === null) return <Loader />;

  if (!opportunityId) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t("COMMON.NO_OPPORTUNITY_ID")}
      </div>
    );
  }

  // Whether to show full-page loader (only on very first load, not on search refetches)
  const showInitialLoader = isLoading && allRegisteredUsers.length === 0;

  return (
    <div className="w-full border-t border-[#000]">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px] mx-auto relative">
        <div className="flex justify-center lg:pb-[35px] md:pb-[20px] pb-[20px] searchbox">
          <Searchbar
            placeholder={t("COMMON.SEARCH_BY_NAME")}
            showFilterIcon={false}
            onSearchChange={(value) => setSearchQuery(value)}
          />
        </div>

        {/* Attendance Recording Information — hidden entirely for the types
            that need no check-in (Workshop, Consultation). */}
        {checkInWindow.requiresCheckIn && (
          <>
            <CheckInWindowBanner
              window={checkInWindow}
              className="mb-6 max-w-2xl mx-auto"
            />
            <div className="flex justify-center mb-6">
              <div className="mx-auto px-4 md:px-6 lg:px-8">
                <p className="text-center mobilescreen:text-[18px] mediumscreen3:text-[18px] text-[24px] text-[#181822CC]/70 leading-relaxed mb-4">
                  {t("COMMON.ATTENDANCE_RECORDING_INFO")}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="w-full">
          {showInitialLoader ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : (
            <div
              id="ls-registrations-scroll-container"
              style={{ maxHeight: "500px", overflowY: "auto" }}
            >
              <InfiniteScroll
                dataLength={allRegisteredUsers.length}
                next={loadMoreRegistrations}
                hasMore={hasMore}
                hasChildren={allRegisteredUsers.length > 0}
                loader={
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-5" />
                  </div>
                }
                endMessage={
                  allRegisteredUsers.length > 0 ? (
                    <div className="text-center text-gray-500 py-4 text-sm">
                      {t("COMMON.NO_MORE_REGISTERED_USERS")}
                    </div>
                  ) : null
                }
                scrollableTarget="ls-registrations-scroll-container"
                scrollThreshold={0.8}
              >
                <Table
                  columns={columns}
                  data={allRegisteredUsers}
                  renderCell={(column, rowData: any) => {
                    const person = registrationPerson(rowData);
                    const defaultProfilePic = getDefaultProfileImage(
                      person.genderEn || "unknown",
                      asset("profile/male_profile.svg"),
                      asset("profile/female_profile.svg"),
                      asset("profile/org_profile.svg")
                    );

                    if (column.type === "attendance") {
                      return (
                        <div className="flex justify-center">
                          <div className="relative border p-1 border-secondary-100">
                            <div
                              className={`h-4 w-4 ${
                                rowData.is_attended ||
                                selectedUsers.includes(rowData.id.toString())
                                  ? "bg-[#373737BF]/75"
                                  : "bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  rowData.is_attended ||
                                  selectedUsers.includes(rowData.id.toString())
                                }
                                onChange={() =>
                                  !rowData.is_attended &&
                                  handleCheckboxChange(rowData.id)
                                }
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={rowData.is_attended}
                                aria-label={`Select ${person.name}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (column.type === "custom" && column.key === "full_name") {
                      const userId = person.userId || rowData.id;
                      return (
                        <div className="flex items-center gap-3">
                          <Image
                            src={person.profilePic || defaultProfilePic}
                            alt={person.name}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <div className="flex flex-col">
                            <span
                              className="cursor-pointer text-primary-5"
                              onClick={() => {
                                if (!userId) return;
                                router.push(
                                  person.isPublic
                                    ? `/public-profile/${userId}`
                                    : `/volunteer-private-profile/${userId}`
                                );
                              }}
                            >
                              {person.name || "-"}
                            </span>
                            {/* Reports show the volunteer's civil ID under the name */}
                            {person.civilId && (
                              <span className="text-xs text-gray-500">
                                {person.civilId}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (column.type === "email") {
                      return <span>{person.email || "-"}</span>;
                    }

                    if (column.type === "contact") {
                      return <span>{person.phone || "-"}</span>;
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
                            {rowData.user.emergency_contact_relationship_display
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

                    if (column.type === "actions") {
                      const localizedName =
                        selectedLanguage === "ar" ? person.nameAr : person.name;

                      return (
                        <div
                          className={`flex ${
                            selectedLanguage === "ar"
                              ? "mr-[10px] mobilescreen:mr-[5px]"
                              : "ml-[18px] mobilescreen:ml-[14px]"
                          }`}
                        >
                          <button
                            onClick={() =>
                              !isAfterAttendanceDeadline &&
                              person.userId &&
                              openDeleteModal(person.userId, localizedName)
                            }
                            className={`text-primary-5 flex items-center gap-2 ${
                              isAfterAttendanceDeadline
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                            title={t("COMMON.DELETE_REGISTRATION")}
                            aria-label={t("COMMON.DELETE_REGISTRATION")}
                            disabled={isAfterAttendanceDeadline}
                          >
                            <RiDeleteBin5Fill
                              size={windowWidth <= 767 ? 18 : 24}
                            />
                          </button>
                        </div>
                      );
                    }

                    return <span>{rowData[column.key] || "-"}</span>;
                  }}
                />
              </InfiniteScroll>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-7 justify-center mx-auto pt-12 mobilescreen:py-8">
          {canMarkAttendance && (
            <Button
              className="transition focus:outline-none text-center flex justify-center items-center gap-2 opacity-100 focus:ring-2 font-bold text-base 2xl:h-[60px] 2xl:w-[190px] rounded-[30px] 2xl:text-[20px] lg:text-[14px] laptop:w-[180px] lg:w-[150px] lg:h-[40px] laptop:rounded-[30px] laptop:h-[50px] laptopmain:h-[50px] xss:rounded-[20px] bg-white !text-primary-5 !w-[255px] !h-[60px] border border-primary-5"
              onClick={handleAttendedClick}
              disabled={isUpdating || selectedUsers.length === 0}
            >
              {t("COMMON.ATTENDED")}
            </Button>
          )}
          <Button
            variant="primary"
            size="medium"
            className="!w-[255px] !h-[60px]"
            onClick={handleDownloadSheet}
            disabled={allRegisteredUsers.length === 0}
          >
            <Download className="h-5 w-5 mr-2" />
            {t("COMMON.DOWNLOAD_SHEET")}
          </Button>
        </div>
      </div>

      <div className="border-t border-[#000]/20 pt-12">
        <SponsorsClient />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title={t("COMMON.DELETE_REGISTRATION")}
        size="sm"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              onClick={handleDeleteRegistration}
              disabled={isDeleting}
              className="xss:!w-full"
            >
              {t("COMMON.DELETE")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => setShowDeleteModal(false)}
              className="xss:!w-full"
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <div className="pb-10 text-center text-lg">
          {t("COMMON.DELETE_VOLUNTEER_REGISTRATION", {
            name: deletingUserName,
          })}
        </div>
      </Modal>
    </div>
  );
}
