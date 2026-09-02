"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import InfiniteScroll from "react-infinite-scroll-component";
import { RiDeleteBin5Fill } from "react-icons/ri";

import Table from "@/components/ui/Table";
import { getDefaultProfileImage } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";
import AttendanceHoursCell from "./AttendanceHoursCell";
import RegistrationSelectCell from "./RegistrationSelectCell";
import {
  AttendanceRecordRef,
  SelectOption,
  UntypedRow,
  canMarkAttendanceForDate,
  goToProfile,
  hasVolunteerParticipationStarted,
  isDateValidForVolunteer,
  shouldShowEmergencyContact,
  toApiDate,
} from "./volunteerListHelpers";

interface VolunteerRegistrationsTableProps {
  registrations: UntypedRow[];
  hasMoreRegistrations: boolean;
  loadMoreRegistrations: () => void;
  selectedDate: string;
  manual_tracking: boolean;
  requiresCheckIn: boolean;
  opportunity_start_date: string | undefined;
  opportunity_start_time: string | undefined;
  opportunity_end_time: string | undefined;
  selectedAttendance: string[];
  selectAllAttendance: boolean;
  onSelectAllAttendanceChange: () => void;
  onAttendanceCheckboxChange: (volunteerUuid: string) => void;
  teamOptions: SelectOption[];
  roleOptions: SelectOption[];
  teamsLoading: boolean;
  rolesLoading: boolean;
  updatingId: string | null;
  updating: "team" | "role";
  onUpdate: (
    id: string,
    type: "team" | "role",
    value: string | undefined
  ) => Promise<void>;
  onTeamMenuScroll: () => void;
  onRoleMenuScroll: () => void;
  editingHoursKey: string | null;
  setEditingHoursKey: (key: string | null) => void;
  hoursDraft: string;
  setHoursDraft: (value: string) => void;
  onSaveHours: (
    attendanceId: string | number,
    key: string,
    rawValue: string
  ) => Promise<void>;
  isSavingHours: boolean;
  resolveAttendanceRecord: (
    row: UntypedRow,
    apiDate: string
  ) => AttendanceRecordRef | null;
  onRequestUndo: (payload: {
    attendanceId: string | number;
    key: string;
    volunteerName: string;
  }) => void;
  onRequestUnregister: (userId: number) => void;
}

/**
 * The registrations table itself: attendance checkboxes, team/role editing,
 * inline attendance-hours editing, and the row-level unregister action.
 */
export default function VolunteerRegistrationsTable({
  registrations,
  hasMoreRegistrations,
  loadMoreRegistrations,
  selectedDate,
  manual_tracking,
  requiresCheckIn,
  opportunity_start_date,
  opportunity_start_time,
  opportunity_end_time,
  selectedAttendance,
  selectAllAttendance,
  onSelectAllAttendanceChange,
  onAttendanceCheckboxChange,
  teamOptions,
  roleOptions,
  teamsLoading,
  rolesLoading,
  updatingId,
  updating,
  onUpdate,
  onTeamMenuScroll,
  onRoleMenuScroll,
  editingHoursKey,
  setEditingHoursKey,
  hoursDraft,
  setHoursDraft,
  onSaveHours,
  isSavingHours,
  resolveAttendanceRecord,
  onRequestUndo,
  onRequestUnregister,
}: VolunteerRegistrationsTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [windowWidth, setWindowWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hasEmergencyContactVolunteers = useMemo(
    () => registrations.some(shouldShowEmergencyContact),
    [registrations]
  );

  const columns = [
    {
      label: (
        <div className="flex items-center justify-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <div className="border p-1 border-secondary-100">
              <div
                className={`h-4 w-4 relative ${
                  selectAllAttendance ? "bg-[#373737BF]/75" : "bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectAllAttendance}
                  onChange={onSelectAllAttendanceChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={!manual_tracking}
                />
              </div>
            </div>
          </label>
        </div>
      ),
      key: "attendance",
      type: "attendance",
    },
    { label: t("COMMON.VOLUNTEER.NAME"), key: "full_name", type: "custom" },
    { label: t("COMMON.EMAIL"), key: "user_email" },
    { label: t("COMMON.CONTACT_NUMBER"), key: "phone_number" },
    ...(hasEmergencyContactVolunteers
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
    { label: t("COMMON.TEAM"), key: "team", type: "dropdown" },
    { label: t("COMMON.ROLE"), key: "role", type: "role" },
    // Logged hours and the undo affordance only make sense where check-in
    // happens at all — workshops and consultations skip both.
    ...(requiresCheckIn
      ? [
          {
            label: t("COMMON.ATTENDANCE_HOURS"),
            key: "attendance_hours",
            type: "attendance_hours",
          },
        ]
      : []),
    { label: t("COMMON.ACTION"), key: "actions", type: "actions" },
  ];

  return (
    <div
      id="registrations-scroll-container"
      style={{ maxHeight: "500px", overflowY: "auto" }}
    >
      <InfiniteScroll
        dataLength={registrations.length}
        next={loadMoreRegistrations}
        hasMore={hasMoreRegistrations}
        hasChildren={registrations.length > 0}
        loader={
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-5" />
          </div>
        }
        endMessage={
          registrations.length > 0 ? (
            <div className="text-center text-gray-500 py-4 text-sm">
              {t("COMMON.NO_MORE_REGISTERED_USERS")}
            </div>
          ) : null
        }
        scrollableTarget="registrations-scroll-container"
        scrollThreshold={0.8}
      >
        <Table
          columns={columns}
          data={registrations}
          renderCell={(column, rowData) => {
            if (column.type === "custom" && column.key === "full_name") {
              const user = rowData.user || {};
              return (
                <div className="flex items-center gap-3">
                  <img
                    src={
                      user?.profile_pic ||
                      getDefaultProfileImage(
                        user?.gender_display?.value_en,
                        "/assets/profile/male_profile.svg",
                        "/assets/profile/female_profile.svg",
                        "/assets/profile/org_profile.svg"
                      )
                    }
                    alt={rowData.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <span
                      className="cursor-pointer text-primary-5"
                      onClick={() =>
                        goToProfile(router, user, rowData.user_id || rowData.id)
                      }
                    >
                      {rowData.full_name}
                    </span>
                    {/* Reports show the volunteer's civil ID under the name */}
                    {(rowData.civil_id || user?.civil_id) && (
                      <span className="text-xs text-gray-500">
                        {rowData.civil_id || user?.civil_id}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            if (column.type === "dropdown") {
              return (
                <RegistrationSelectCell
                  options={teamOptions}
                  value={String(rowData[column.key]?.id || "")}
                  onChange={(value) => onUpdate(rowData.id, "team", value)}
                  onMenuScrollToBottom={onTeamMenuScroll}
                  isLoading={teamsLoading}
                  isDisabled={
                    teamsLoading ||
                    (updatingId === rowData.id && updating === "team")
                  }
                  placeholder={t("COMMON.TEAM")}
                />
              );
            }

            if (column.type === "role") {
              return (
                <RegistrationSelectCell
                  options={roleOptions}
                  value={String(rowData.role?.id || "")}
                  onChange={(value) => onUpdate(rowData.id, "role", value)}
                  onMenuScrollToBottom={onRoleMenuScroll}
                  isLoading={rolesLoading}
                  isDisabled={
                    rolesLoading ||
                    (updatingId === rowData.id && updating === "role")
                  }
                  placeholder={t("COMMON.ROLE")}
                />
              );
            }

            if (column.type === "attendance") {
              const volunteerUuid = rowData.volunteer_uuid;
              const formatted = toApiDate(selectedDate);
              const isAttendedOnSelectedDate = (
                rowData.date_wise_attended || []
              ).includes(formatted);
              const isSelected = selectedAttendance.includes(volunteerUuid);
              const isCheckboxDisabled =
                isAttendedOnSelectedDate ||
                !manual_tracking ||
                !isDateValidForVolunteer(
                  rowData,
                  selectedDate,
                  opportunity_start_date
                ) ||
                !canMarkAttendanceForDate(
                  rowData,
                  selectedDate,
                  opportunity_end_time
                );

              return (
                <div className="flex justify-center">
                  <label
                    className={
                      isCheckboxDisabled ? "cursor-not-allowed" : "cursor-pointer"
                    }
                  >
                    <div className="border border-secondary-100 p-1">
                      <div
                        className={`h-4 w-4 relative ${
                          isAttendedOnSelectedDate || isSelected
                            ? "bg-[#373737BF]/75"
                            : "bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAttendedOnSelectedDate || isSelected}
                          onChange={() =>
                            !isCheckboxDisabled &&
                            onAttendanceCheckboxChange(volunteerUuid)
                          }
                          disabled={isCheckboxDisabled}
                          className={`absolute inset-0 w-full h-full opacity-0 ${
                            isCheckboxDisabled ? "cursor-not-allowed" : "cursor-pointer"
                          }`}
                        />
                      </div>
                    </div>
                  </label>
                </div>
              );
            }

            if (column.type === "attendance_hours") {
              return (
                <AttendanceHoursCell
                  rowData={rowData}
                  selectedDate={selectedDate}
                  editingHoursKey={editingHoursKey}
                  setEditingHoursKey={setEditingHoursKey}
                  hoursDraft={hoursDraft}
                  setHoursDraft={setHoursDraft}
                  onSaveHours={onSaveHours}
                  isSavingHours={isSavingHours}
                  resolveAttendanceRecord={resolveAttendanceRecord}
                  onRequestUndo={onRequestUndo}
                />
              );
            }

            if (column.type === "emergency") {
              if (!shouldShowEmergencyContact(rowData)) {
                return <span>-</span>;
              }

              if (column.key === "emergency_contact_relationship") {
                const relationship =
                  rowData?.user?.emergency_contact_relationship_display;
                return (
                  <span>
                    {relationship
                      ? selectedLanguage === "ar"
                        ? relationship.value_ar
                        : relationship.value_en
                      : "-"}
                  </span>
                );
              }

              return <span>{rowData?.user?.[column.key] || "-"}</span>;
            }

            if (column.type === "actions") {
              const userId = Number(rowData.user?.id || rowData.user_id);
              const participationStarted = hasVolunteerParticipationStarted(
                rowData,
                opportunity_start_date,
                opportunity_start_time,
                opportunity_end_time
              );
              return (
                <div
                  className={`flex ${
                    selectedLanguage === "ar"
                      ? "mr-[10px] mobilescreen:mr-[5px]"
                      : "ml-[18px] mobilescreen:ml-[14px]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (participationStarted) return;
                      onRequestUnregister(userId);
                    }}
                    className={`text-primary-5 ${
                      participationStarted
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    title={t("COMMON.DELETE")}
                    disabled={participationStarted}
                  >
                    <RiDeleteBin5Fill size={windowWidth <= 767 ? 18 : 24} />
                  </button>
                </div>
              );
            }

            return <span>{rowData[column.key] || "-"}</span>;
          }}
        />
      </InfiniteScroll>
    </div>
  );
}
