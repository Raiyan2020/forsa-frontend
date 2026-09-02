"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { SponsorsClient } from "@/features/home";
import {
  downloadVolunteerRegistrations,
  getVolunteerRegistrations,
} from "@/features/opportunities/services/registrations";
import { getCheckInWindow } from "@/features/opportunities/checkInWindow";
import { useTeamsAndRoles } from "@/features/opportunities/hooks/useTeamsAndRoles";
import { useVolunteerAttendance } from "@/features/opportunities/hooks/useVolunteerAttendance";
import { toNumber } from "@/lib/helpers";
import { NAV_STATE_KEYS, getNavState } from "@/lib/navigationState";
import { useRoleModalStore } from "@/store/roleModalStore";
import AddVolunteersModal from "./AddVolunteersModal";
import AttendanceUndoModal from "./AttendanceUndoModal";
import RegistrationsFilterModal from "./RegistrationsFilterModal";
import TeamModal from "./TeamModal";
import UnregisterVolunteerModal from "./UnregisterVolunteerModal";
import VolunteerListToolbar from "./VolunteerListToolbar";
import VolunteerRegistrationsTable from "./VolunteerRegistrationsTable";
import VolunteerRoleModal from "./VolunteerRoleModal";
import { type VolunteerListState, toApiDate } from "./volunteerListHelpers";

export type { VolunteerListState };

export default function VolunteerList() {
  const { t } = useTranslation();

  const roleModalState = useRoleModalStore((s) => s.roleModalState);
  const openRoleModal = useRoleModalStore((s) => s.openRoleModal);
  const closeRoleModal = useRoleModalStore((s) => s.closeRoleModal);

  const [navState, setNavStateValue] = useState<VolunteerListState | null>(null);
  useEffect(() => {
    setNavStateValue(
      getNavState<VolunteerListState>(NAV_STATE_KEYS.registerList) ?? {}
    );
  }, []);

  const opportunityId = navState?.id;
  const opportunity_status = navState?.opportunity_status;

  /**
   * The backend owns the check-in deadline (72h by default, admin-adjustable),
   * so the window is derived from its fields rather than recomputed here.
   * `manual_tracking` was already resolved upstream; the window re-checks it so
   * the controls lock the moment the deadline passes without a page reload.
   */
  const checkInWindow = useMemo(
    () =>
      getCheckInWindow(
        navState
          ? {
              start_date: navState.start_date,
              end_date: navState.end_date,
              requires_check_in: navState.requires_check_in,
              qr_attendance_enabled: navState.qr_attendance_enabled,
              manual_attendance_enabled: navState.manual_attendance_enabled,
              manual_tracking: navState.manual_tracking,
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

  // Manual check-in is offered only while the window is genuinely open.
  const manual_tracking = Boolean(
    navState?.manual_tracking && checkInWindow.isOpen
  );
  const opportunity_start_date = navState?.start_date;
  const opportunity_end_date = navState?.end_date;
  const opportunity_start_time = navState?.start_time;
  const opportunity_end_time = navState?.end_time;
  const participants_needed = navState?.participants_needed;

  const [open, setOpen] = useState(false);
  const [openteam, setOpenteam] = useState(false);
  const [page, setPage] = useState(1);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [roleModalRef, setRoleModalRef] = useState<{
    checkParticipantsMismatch: () => boolean;
  } | null>(null);

  const [filters, setFilters] = useState<{ teams?: number[]; roles?: number[] }>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showVolunteersModal, setShowVolunteersModal] = useState(false);

  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const [hasMoreRegistrations, setHasMoreRegistrations] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingVolunteerId, setDeletingVolunteerId] = useState<number | null>(
    null
  );

  // Guards against the auto-load effect firing repeatedly
  const isAutoLoadingRef = useRef(false);
  // Tracks which registration pages have been merged, so a re-render can't
  // append the same page twice
  const mergedRegistrationPagesRef = useRef<Set<number>>(new Set());

  const downloadMutation = useMutation({
    mutationFn: downloadVolunteerRegistrations,
  });

  const attendance = useVolunteerAttendance({
    opportunityId,
    manual_tracking,
    opportunity_start_date,
    opportunity_end_date,
    allRegistrations,
    setAllRegistrations,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Any change to search or filters restarts pagination
  useEffect(() => {
    setPage(1);
    setAllRegistrations([]);
    setHasMoreRegistrations(true);
    mergedRegistrationPagesRef.current = new Set();
  }, [debouncedSearch, filters.teams, filters.roles]);

  const registrationsQuery = useQuery({
    queryKey: [
      "volunteer-registrations",
      opportunityId,
      page,
      filters.teams,
      filters.roles,
      debouncedSearch,
    ],
    queryFn: () =>
      getVolunteerRegistrations({
        opportunity_id: opportunityId,
        page,
        limit: 10,
        teams: filters.teams,
        roles: filters.roles,
        search: debouncedSearch,
      }),
    enabled: Boolean(opportunityId),
  });

  const registrations = registrationsQuery.data;
  const fetchingRegistrations = registrationsQuery.isFetching;

  const resetAndRefetchRegistrations = async () => {
    mergedRegistrationPagesRef.current = new Set();
    setAllRegistrations([]);
    setHasMoreRegistrations(true);
    setPage(1);
    await registrationsQuery.refetch();
  };

  const teamsAndRoles = useTeamsAndRoles({
    opportunityId,
    onUpdated: resetAndRefetchRegistrations,
  });

  // Merge each page of registrations exactly once
  useEffect(() => {
    if (!registrations?.data || fetchingRegistrations) return;

    const pagination = registrations?.meta?.pagination;
    const responsePage = pagination?.page || pagination?.current_page || page;

    if (responsePage === 1) {
      mergedRegistrationPagesRef.current = new Set([1]);
      setAllRegistrations(registrations.data || []);
    } else if (!mergedRegistrationPagesRef.current.has(responsePage)) {
      mergedRegistrationPagesRef.current.add(responsePage);
      setAllRegistrations((previous) => [
        ...previous,
        ...(registrations.data || []),
      ]);

      // "Select all" stays sticky across pages while the mode is on
      attendance.applySelectAllToNewPage(registrations.data || []);
    }

    if (pagination) {
      const currentPage = pagination.page || pagination.current_page;
      setHasMoreRegistrations(currentPage < pagination.total_pages);
    } else {
      setHasMoreRegistrations((registrations.data || []).length >= 10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations, fetchingRegistrations]);

  const loadMoreRegistrations = useCallback(() => {
    // Don't advance while the list is empty (e.g. right after a reset)
    if (
      hasMoreRegistrations &&
      !fetchingRegistrations &&
      allRegistrations.length > 0
    ) {
      setPage((previous) => previous + 1);
    }
  }, [hasMoreRegistrations, fetchingRegistrations, allRegistrations.length]);

  // The table lives in a fixed-height box; if the first page doesn't overflow it
  // there's nothing to scroll, so pull the next page automatically.
  useEffect(() => {
    if (
      fetchingRegistrations ||
      !hasMoreRegistrations ||
      allRegistrations.length === 0 ||
      isAutoLoadingRef.current
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const container = document.getElementById(
        "registrations-scroll-container"
      );
      if (!container || isAutoLoadingRef.current) return;

      if (container.scrollHeight <= container.clientHeight) {
        isAutoLoadingRef.current = true;
        loadMoreRegistrations();
        setTimeout(() => {
          isAutoLoadingRef.current = false;
        }, 1500);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [
    allRegistrations,
    fetchingRegistrations,
    hasMoreRegistrations,
    loadMoreRegistrations,
  ]);

  const handleDownload = async () => {
    if (!opportunityId) return;
    try {
      const response = await downloadMutation.mutateAsync({
        opportunity_id: opportunityId,
        teams: filters.teams,
        roles: filters.roles,
        search: debouncedSearch,
        mark_attendance: manual_tracking ? true : undefined,
        date: attendance.selectedDate ? toApiDate(attendance.selectedDate) : undefined,
      });

      if (!response.downloadUrl) {
        toast.error(t("COMMON.DOWNLOAD_FAILURE"));
        return;
      }

      const link = document.createElement("a");
      link.href = response.downloadUrl;
      link.download = "List of Registered Volunteers.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t("COMMON.DOWNLOAD_SUCCESS"));
      if (manual_tracking && response.attendance_marked_count) {
        toast.success(
          t("COMMON.ATTENDANCE_MARKED_COUNT", {
            count: response.attendance_marked_count,
          })
        );
      }
    } catch {
      toast.error(t("COMMON.DOWNLOAD_FAILURE"));
    }
  };

  const handleFilterChange = (newFilters: {
    teams?: string[];
    roles?: string[];
  }) => {
    setFilters({
      teams: newFilters.teams ? newFilters.teams.map(Number) : undefined,
      roles: newFilters.roles ? newFilters.roles.map(Number) : undefined,
    });
    setPage(1);
    setAllRegistrations([]);
    setHasMoreRegistrations(true);
    setOpen(false);
  };

  const handleRoleModalClose = () => {
    if (roleModalRef?.checkParticipantsMismatch()) {
      setShowMismatchModal(true);
      return;
    }
    closeRoleModal();
  };

  const registeredCount =
    registrations?.meta?.pagination?.total || allRegistrations.length || 0;
  const isParticipantsFull = Boolean(
    participants_needed && registeredCount >= toNumber(participants_needed)
  );

  return (
    <>
      {registrationsQuery.isLoading && <Loader />}

      <RegistrationsFilterModal
        open={open}
        onClose={() => setOpen(false)}
        opportunityId={opportunityId}
        currentFilters={filters}
        onApply={handleFilterChange}
        onClear={() => setFilters({ teams: [], roles: [] })}
      />

      <Modal
        open={roleModalState}
        onClose={handleRoleModalClose}
        title={t("COMMON.ROLE")}
        size="md"
      >
        <VolunteerRoleModal
          opportunityId={opportunityId || ""}
          dropdwonRefetch={teamsAndRoles.rolesRefetch}
          setMismatchChecker={setRoleModalRef}
          showMismatchModal={showMismatchModal}
          setShowMismatchModal={setShowMismatchModal}
          onclose={closeRoleModal}
        />
      </Modal>

      <AttendanceUndoModal
        pendingUndo={attendance.pendingUndo}
        onClose={() => attendance.setPendingUndo(null)}
        onConfirm={attendance.handleConfirmUndo}
        isConfirming={attendance.isUndoingAttendance}
      />

      <Modal
        open={openteam}
        onClose={() => setOpenteam(false)}
        title={t("COMMON.TEAM")}
        size="md"
      >
        <TeamModal
          opportunityId={opportunityId || ""}
          dropdownRefetch={teamsAndRoles.teamsRefetch}
        />
      </Modal>

      <AddVolunteersModal
        open={showVolunteersModal}
        onClose={() => setShowVolunteersModal(false)}
        opportunityId={opportunityId}
        onRegistered={resetAndRefetchRegistrations}
      />

      <UnregisterVolunteerModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        opportunityId={opportunityId}
        volunteerId={deletingVolunteerId}
        onUnregistered={resetAndRefetchRegistrations}
      />

      <div className="border-t border-[#000]">
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px] mx-auto relative">
          <VolunteerListToolbar
            opportunityId={opportunityId}
            opportunity_start_date={opportunity_start_date}
            opportunity_end_date={opportunity_end_date}
            selectedDate={attendance.selectedDate}
            effectiveEndDate={attendance.effectiveEndDate}
            onDateChange={(date) => attendance.setSelectedDate(date)}
            onOpenTeamModal={() => setOpenteam(true)}
            onOpenRoleModal={openRoleModal}
            onOpenFilterModal={() => setOpen(true)}
            onSearchChange={(value) => setSearchQuery(value)}
            checkInWindow={checkInWindow}
          />

          <div className="selectfiled voulnteerlist relative">
            <VolunteerRegistrationsTable
              registrations={allRegistrations}
              hasMoreRegistrations={hasMoreRegistrations}
              loadMoreRegistrations={loadMoreRegistrations}
              selectedDate={attendance.selectedDate}
              manual_tracking={manual_tracking}
              requiresCheckIn={checkInWindow.requiresCheckIn}
              opportunity_start_date={opportunity_start_date}
              opportunity_start_time={opportunity_start_time}
              opportunity_end_time={opportunity_end_time}
              selectedAttendance={attendance.selectedAttendance}
              selectAllAttendance={attendance.selectAllAttendance}
              onSelectAllAttendanceChange={() =>
                attendance.handleSelectAllAttendanceChange(opportunity_end_time)
              }
              onAttendanceCheckboxChange={(uuid) =>
                attendance.handleAttendanceCheckboxChange(uuid, opportunity_end_time)
              }
              teamOptions={teamsAndRoles.teamOptions}
              roleOptions={teamsAndRoles.roleOptions}
              teamsLoading={teamsAndRoles.teamsLoading}
              rolesLoading={teamsAndRoles.rolesLoading}
              updatingId={teamsAndRoles.updatingId}
              updating={teamsAndRoles.updating}
              onUpdate={teamsAndRoles.handleUpdate}
              onTeamMenuScroll={teamsAndRoles.handleTeamMenuScroll}
              onRoleMenuScroll={teamsAndRoles.handleRoleMenuScroll}
              editingHoursKey={attendance.editingHoursKey}
              setEditingHoursKey={attendance.setEditingHoursKey}
              hoursDraft={attendance.hoursDraft}
              setHoursDraft={attendance.setHoursDraft}
              onSaveHours={attendance.handleSaveHours}
              isSavingHours={attendance.isSavingHours}
              resolveAttendanceRecord={attendance.resolveAttendanceRecord}
              onRequestUndo={attendance.setPendingUndo}
              onRequestUnregister={(userId) => {
                setDeletingVolunteerId(userId);
                setShowDeleteModal(true);
              }}
            />

            {opportunity_status !== "completed" && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  className={`p-2 transition-colors ${
                    isParticipantsFull
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-primary-5 hover:text-primary-5/80"
                  }`}
                  onClick={
                    isParticipantsFull
                      ? undefined
                      : () => setShowVolunteersModal(true)
                  }
                  title={t("COMMON.ADD_VOLUNTEER")}
                  disabled={isParticipantsFull}
                >
                  <FaPlus size={24} />
                </button>
              </div>
            )}
          </div>

          <div
            className={`${
              manual_tracking ? "flex flex-col" : "flex justify-center"
            } mx-auto py-12 mobilescreen:py-8 gap-7 items-center`}
          >
            {manual_tracking && (
              <Button
                className="transition focus:outline-none text-center flex justify-center items-center gap-2 opacity-100 focus:ring-2 font-bold text-base 2xl:h-[60px] 2xl:w-[190px] rounded-[30px] 2xl:text-[20px] lg:text-[14px] laptop:w-[180px] lg:w-[150px] lg:h-[40px] laptop:rounded-[30px] laptop:h-[50px] laptopmain:h-[50px] xss:rounded-[20px] bg-white !text-primary-5 !w-[255px] !h-[60px] border border-primary-5"
                onClick={attendance.handleMarkAttendanceClick}
                // disabled={
                //   attendance.isMarkingAttendance ||
                //   attendance.selectedAttendance.length === 0
                // }
              >
                {t("COMMON.ATTENDED")}
              </Button>
            )}
            <Button
              variant="primary"
              size="medium"
              className="!w-[255px] !h-[60px]"
              onClick={handleDownload}
              disabled={allRegistrations.length === 0}
            >
              <img src="/assets/voluneteerevent/downloadsheet.svg" alt="" />{" "}
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
