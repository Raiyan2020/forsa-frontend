"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

import { Button } from "@/components/ui/Button";
import Searchbar from "@/components/ui/Searchbar";
import Table, { TableColumn } from "@/components/ui/Table";
import Loader from "@/components/ui/Loader";
import { SponsorsClient } from "@/features/home";
import { downloadEventRegistrations, getEventRegistrations } from "@/features/events/services/eventsApi";
import { markVolunteerAttendance } from "@/features/opportunities/services/attendance";
import { getDefaultProfileImage } from "@/lib/helpers";
import { NAV_STATE_KEYS, getNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

export interface EventRegisterListState {
  id?: string;
  event_status?: string;
  manual_tracking?: boolean;
}

export default function EventRegisterList() {
  // State for selected attendance date
  const [selectedDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  // Carried over from the event row that linked here.
  const [navState, setNavState_] = useState<EventRegisterListState>({});
  useEffect(() => {
    setNavState_(
      getNavState<EventRegisterListState>(NAV_STATE_KEYS.registerList) ?? {}
    );
  }, []);
  const eventId = navState.id;
  const event_status = navState.event_status;
  const manual_tracking = navState.manual_tracking;

  const downloadMutation = useMutation({
    mutationFn: downloadEventRegistrations,
  });
  // Using the volunteer attendance mutation for event attendance as well
  const markAttendanceMutation = useMutation({
    mutationFn: markVolunteerAttendance,
  });

  // Attendance tracking state variables
  const [selectedAttendance, setSelectedAttendance] = useState<string[]>([]);
  const [selectAllAttendance, setSelectAllAttendance] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);

  const {
    data: registrations,
    isLoading,
    refetch: refetchRegistrations,
  } = useQuery({
    queryKey: ["event-registrations", eventId, page, limit, debouncedSearch],
    queryFn: () =>
      getEventRegistrations({
        event_id: eventId,
        page,
        limit,
        search: debouncedSearch,
      }),
    enabled: Boolean(eventId),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Reset attendance selections when page changes or data refreshes
  useEffect(() => {
    if (manual_tracking) {
      setSelectedAttendance([]);
      setSelectAllAttendance(false);
    }
  }, [page, registrations?.data, manual_tracking]);

  const selectableUuids = (): string[] =>
    registrations?.data
      ?.filter((registration: any) => !registration.is_user_attended)
      ?.map((registration: any) => registration.volunteer_uuid)
      .filter((uuid: string | null | undefined) => uuid != null) || [];

  // Handle select all attendance checkbox change
  const handleSelectAllAttendanceChange = () => {
    if (!manual_tracking || event_status === "completed") return;

    const newSelectAll = !selectAllAttendance;
    setSelectAllAttendance(newSelectAll);
    setSelectedAttendance(newSelectAll ? selectableUuids() : []);
  };

  // Handle individual attendance checkbox change
  const handleAttendanceCheckboxChange = (volunteerUuid: string) => {
    if (!manual_tracking || event_status === "completed" || !volunteerUuid)
      return;

    const newSelectedAttendance = selectedAttendance.includes(volunteerUuid)
      ? selectedAttendance.filter((id) => id !== volunteerUuid)
      : [...selectedAttendance, volunteerUuid];

    setSelectedAttendance(newSelectedAttendance);

    // Check if all selectable registrations are in the new selection
    const selectable = selectableUuids();
    const allSelected =
      selectable.length > 0 &&
      selectable.every((uuid) => newSelectedAttendance.includes(uuid));

    setSelectAllAttendance(allSelected);
  };

  // Handle mark attendance button click
  const handleMarkAttendanceClick = async () => {
    if (!eventId || selectedAttendance.length === 0) {
      toast.error(t("COMMON.SELECT_USERS_TO_MARK"));
      return;
    }

    setMarkingAttendance(true);
    try {
      // Filter out any null or undefined values and ensure we have a valid array
      const validVolunteerIds = selectedAttendance.filter((id) => id != null);

      if (validVolunteerIds.length === 0) {
        throw new Error("No valid volunteer IDs found");
      }

      // Format selectedDate as YYYY-MM-DD
      let attendanceDate = "";
      if (selectedDate) {
        const date = new Date(selectedDate);
        attendanceDate = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      }

      const response = await markAttendanceMutation.mutateAsync({
        event_id: eventId,
        volunteer_ids: validVolunteerIds,
        attendance_date: attendanceDate,
      });

      // Check if the response status is success
      if (response?.status === "success" || response?.key === "success") {
        toast.success(t("COMMON.USERS_MARKED_AS_ATTENDED"));

        // Handle refetch separately to avoid propagating refetch errors
        try {
          await refetchRegistrations();
        } catch (refetchError) {
          console.error("Refetch error (non-critical):", refetchError);
        }

        setSelectedAttendance([]);
        setSelectAllAttendance(false);
      }
    } catch (error: any) {
      console.error("Failed to mark registrations as attended:", error);
      const payload = error?.response?.data;
      toast.error(
        payload?.message_en ||
          payload?.message ||
          t("COMMON.FAILED_TO_MARK_ATTENDED")
      );
    } finally {
      setMarkingAttendance(false);
    }
  };

  const columns: TableColumn[] = [
    ...(manual_tracking && event_status !== "completed"
      ? [
          {
            label: (
              <div className="flex items-center justify-center gap-2">
                <label className="flex items-center cursor-pointer gap-2">
                  <div className="border p-1 border-secondary-100">
                    <div
                      className={`h-4 w-4 ${
                        selectAllAttendance ? "bg-[#373737BF]/75" : "bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectAllAttendance}
                        onChange={handleSelectAllAttendanceChange}
                        className="opacity-0 absolute"
                        aria-label={t("COMMON.SELECT_ALL")}
                      />
                    </div>
                  </div>
                </label>
              </div>
            ),
            key: "attendance",
            type: "attendance",
            className: "w-[150px] text-center",
          },
        ]
      : []),
    {
      label: t("COMMON.REGISTERED_LIST"),
      key: "user_name",
      type: "custom",
      className: "min-w-[250px]",
    },
    {
      label: t("COMMON.CONTACT_NUMBER"),
      key: "user_contact_number",
      className: "min-w-[150px]",
    },
    {
      label: t("COMMON.EMAIL"),
      key: "user_email",
      className: "min-w-[200px]",
    },
  ];

  const totalPages = registrations?.meta?.pagination?.total_pages || 1;

  const handleDownload = async () => {
    if (!eventId) return;

    try {
      const response = await downloadMutation.mutateAsync({
        event_id: eventId,
        search: debouncedSearch,
        mark_attendance: manual_tracking ? true : undefined,
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

  return (
    <>
      {isLoading && <Loader />}
      <div className="border-t border-[#000]">
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px] mx-auto relative">
          <div className="mobilescreen:w-[100%] flex justify-center pt-10 pb-[70px]">
            <Searchbar
              placeholder="Search by name"
              showFilterIcon={false}
              onSearchChange={(value) => setSearchQuery(value)}
            />
          </div>
          <div className="selectfiled voulnteerlist bg-white rounded-lg shadow-sm">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                  <Table
                    columns={columns}
                    data={registrations?.data ?? []}
                    renderCell={(column, rowData) => {
                      if (column.key === "user_name") {
                        return (
                          <div className="flex items-center gap-3 py-2">
                            <Image
                              src={
                                rowData?.user?.profile_pic ||
                                getDefaultProfileImage(
                                  rowData.user?.gender_display?.value_en,
                                  asset("profile/male_profile.svg"),
                                  asset("profile/female_profile.svg"),
                                  asset("profile/org_profile.svg")
                                )
                              }
                              alt={rowData[column.key]}
                              width={40}
                              height={40}
                              unoptimized
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <span className="font-medium">
                              {rowData[column.key]}
                            </span>
                          </div>
                        );
                      }

                      if (
                        column.type === "attendance" &&
                        manual_tracking &&
                        event_status !== "completed"
                      ) {
                        const volunteerUuid = rowData.volunteer_uuid;
                        const isAttended = rowData.is_user_attended;

                        if (!volunteerUuid) {
                          return <div className="flex justify-center">-</div>;
                        }

                        return (
                          <div className="flex justify-center py-2">
                            <div className="border p-1 border-secondary-100">
                              <div
                                className={`h-4 w-4 ${
                                  isAttended ||
                                  selectedAttendance.includes(volunteerUuid)
                                    ? "bg-[#373737BF]/75"
                                    : "bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    isAttended ||
                                    selectedAttendance.includes(volunteerUuid)
                                  }
                                  onChange={() =>
                                    !isAttended &&
                                    handleAttendanceCheckboxChange(
                                      volunteerUuid
                                    )
                                  }
                                  className="opacity-0 absolute"
                                  disabled={isAttended}
                                  aria-label={`Mark ${rowData.user_name} as attended`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return <div className="py-2">{rowData[column.key]}</div>;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                className="bg-primary-5 text-white p-2 rounded-full disabled:bg-gray-400 flex items-center justify-center"
                variant="primary"
                style={{ width: "40px", height: "40px" }}
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                <FaArrowLeft
                  className={selectedLanguage === "ar" ? "rotate-180" : ""}
                />
              </Button>
              <span className="text-secondary-102">
                {t("COMMON.PAGE")} {page} {t("COMMON.OF")} {totalPages}
              </span>
              <Button
                className="bg-primary-5 text-white p-2 rounded-full disabled:bg-gray-400 flex items-center justify-center"
                variant="primary"
                style={{ width: "40px", height: "40px" }}
                disabled={page === totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
              >
                <FaArrowRight
                  className={selectedLanguage === "ar" ? "rotate-180" : ""}
                />
              </Button>
            </div>
          )}

          <div
            className={`${
              manual_tracking ? "flex flex-col" : "flex justify-center"
            } mx-auto py-12 mobilescreen:py-8 gap-7 items-center`}
          >
            {manual_tracking && (
              <Button
                className="transition focus:outline-none text-center flex justify-center items-center gap-2 opacity-100 focus:ring-2 font-bold text-base 2xl:h-[60px] 2xl:w-[190px] rounded-[30px] 2xl:text-[20px] lg:text-[14px] laptop:w-[180px] lg:w-[150px] lg:h-[40px] laptop:rounded-[30px] laptop:h-[50px] laptopmain:h-[50px] xss:rounded-[20px] bg-white !text-primary-5 !w-[255px] !h-[60px] border border-primary-5"
                onClick={handleMarkAttendanceClick}
                disabled={
                  markingAttendance ||
                  selectedAttendance.length === 0 ||
                  event_status === "completed"
                }
              >
                {t("COMMON.ATTENDED")}
              </Button>
            )}
            <Button
              variant="primary"
              size="medium"
              className="!w-[255px] !h-[60px]"
              onClick={handleDownload}
              disabled={!registrations?.data || registrations.data.length === 0}
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
    </>
  );
}
