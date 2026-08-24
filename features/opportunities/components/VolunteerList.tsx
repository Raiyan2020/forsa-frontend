"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import InfiniteScroll from "react-infinite-scroll-component";
import Select from "react-select";
import { toast } from "sonner";
import { FaCheck, FaPen, FaPlus, FaRotateLeft } from "react-icons/fa6";
import { RiDeleteBin5Fill } from "react-icons/ri";
import { RxCross1 } from "react-icons/rx";

import { Button } from "@/components/ui/Button";
import DateRangePicker from "@/components/ui/DateRangePicker";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import Searchbar from "@/components/ui/Searchbar";
import Table from "@/components/ui/Table";
import SponsorsClient from "@/features/home/components/SponsorsClient";
import {
  directRegisterVolunteer,
  directUnregisterVolunteer,
  downloadVolunteerRegistrations,
  getAvailableVolunteers,
  getRolesOfOpportunity,
  getTeams,
  getVolunteerRegistrations,
  markManualVolunteerAttendance,
  markVolunteerAttendance,
  undoVolunteerAttendance,
  updateVolunteerAttendanceHours,
  updateVolunteerRegistration,
} from "@/features/services/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getCheckInWindow } from "@/lib/checkInWindow";
import { getDefaultProfileImage, toNumber } from "@/lib/helpers";
import { NAV_STATE_KEYS, getNavState } from "@/lib/navigationState";
import { useLanguageStore } from "@/store/languageStore";
import { useRoleModalStore } from "@/store/roleModalStore";
import CheckInWindowBanner from "./CheckInWindowBanner";
import TeamModal from "./TeamModal";
import VolunteerFilterModal from "./VolunteerFilterModal";
import VolunteerRoleModal from "./VolunteerRoleModal";

/** Carried over from the opportunity detail page that linked here. */
export interface VolunteerListState {
  id?: string;
  opportunity_status?: string;
  manual_tracking?: boolean;
  disableDeleteAfterPeriod?: boolean;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  participants_needed?: number;
  // Check-in window fields, forwarded verbatim so this screen can render the
  // countdown and lock the controls without refetching the opportunity.
  requires_check_in?: boolean;
  qr_attendance_enabled?: boolean;
  manual_attendance_enabled?: boolean;
  preparation_valid_until?: string | null;
  preparation_valid_until_at?: string | null;
  is_preparation_window_closed?: boolean;
  preparation_reopened_until?: string | null;
}

/**
 * Hours and undo act on an *attendance record*, not a registration, so they
 * need that record's id. The registrations payload only reports which dates a
 * volunteer attended (`date_wise_attended`), so we read an id from whichever
 * richer shape the backend happens to send and fall back to the ids returned by
 * our own manual check-ins.
 *
 * TODO(backend): have `GET /volunteer-opportunity-registrations/` return the
 * attendance id and logged hours per date. Until it does, editing hours and
 * undoing a check-in only work for rows checked in during this session.
 */
interface AttendanceRecordRef {
  id: string | number;
  total_hours?: number | null;
}

/** The attendance-carrying fields a registration row might expose. */
interface AttendanceBearingRow {
  attendance_id?: string | number | null;
  attendance_date?: string | null;
  total_hours?: number | null;
  attendance?: AttendanceEntry | null;
  attendances?: AttendanceEntry[] | null;
  date_wise_attendance?: AttendanceEntry[] | null;
}

interface AttendanceEntry {
  id?: string | number | null;
  attendance_date?: string | null;
  date?: string | null;
  total_hours?: number | null;
}

/** One volunteer's outcome from a fanned-out manual check-in. */
interface ManualAttendanceResult {
  volunteerUuid: string;
  record: AttendanceEntry | null;
}

function readAttendanceRecord(
  row: AttendanceBearingRow | null | undefined,
  apiDate: string
): AttendanceRecordRef | null {
  // Preferred shape: a per-date list of full attendance records.
  const perDate = row?.date_wise_attendance ?? row?.attendances;
  if (Array.isArray(perDate)) {
    const match = perDate.find(
      (entry) => entry?.attendance_date === apiDate || entry?.date === apiDate
    );
    if (match?.id != null) {
      return { id: match.id, total_hours: match.total_hours ?? null };
    }
  }

  // Single-record shapes, only trustworthy when they name the same date.
  const single = row?.attendance;
  if (
    single?.id != null &&
    (single.attendance_date ?? single.date) === apiDate
  ) {
    return { id: single.id, total_hours: single.total_hours ?? null };
  }
  if (row?.attendance_id != null && row?.attendance_date === apiDate) {
    return { id: row.attendance_id, total_hours: row.total_hours ?? null };
  }

  return null;
}

interface Team {
  id: string;
  team_name_en: string;
  team_name_ar: string;
  [key: string]: string | number;
}

interface Role {
  id: string;
  role_name_en: string;
  role_name_ar: string;
  [key: string]: string | number;
}

interface SelectOption {
  label: string;
  value: string;
}

/** Local `YYYY-MM-DD`, matching what the attendance API returns. */
const toApiDate = (value: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const atMidnight = (value: string | Date): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const selectStyles = {
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  menu: (base: any) => ({ ...base, minWidth: "200px", width: "auto" }),
  control: (base: any) => ({ ...base, minWidth: "150px" }),
};

export default function VolunteerList() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

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
  const [teamPage, setTeamPage] = useState(1);
  const [rolePage, setRolePage] = useState(1);
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [updating, setUpdating] = useState<"team" | "role">("team");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [roleModalRef, setRoleModalRef] = useState<{
    checkParticipantsMismatch: () => boolean;
  } | null>(null);
  const [windowWidth, setWindowWidth] = useState(0);

  const [filters, setFilters] = useState<{ teams?: number[]; roles?: number[] }>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);

  const [searchVolunteerTerm, setSearchVolunteerTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showVolunteersModal, setShowVolunteersModal] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<number[]>([]);
  const [volunteerPage, setVolunteerPage] = useState(1);
  const [allVolunteers, setAllVolunteers] = useState<any[]>([]);
  const [hasMoreVolunteers, setHasMoreVolunteers] = useState(true);

  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const [hasMoreRegistrations, setHasMoreRegistrations] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingVolunteerId, setDeletingVolunteerId] = useState<number | null>(
    null
  );

  const [selectedAttendance, setSelectedAttendance] = useState<string[]>([]);
  const [selectAllAttendance, setSelectAllAttendance] = useState(false);
  const [selectAllAttendanceMode, setSelectAllAttendanceMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  /**
   * Attendance records created or edited in this session, keyed
   * `<volunteer_uuid>|<YYYY-MM-DD>`. This is what makes the hours field and the
   * undo button usable today — the registrations payload does not yet carry
   * attendance ids (see `readAttendanceRecord`).
   */
  const [sessionAttendance, setSessionAttendance] = useState<
    Record<string, AttendanceRecordRef>
  >({});
  /** uuid|date currently being edited inline, and its draft value. */
  const [editingHoursKey, setEditingHoursKey] = useState<string | null>(null);
  const [hoursDraft, setHoursDraft] = useState("");
  /** Row awaiting undo confirmation. */
  const [pendingUndo, setPendingUndo] = useState<{
    attendanceId: string | number;
    key: string;
    volunteerName: string;
  } | null>(null);

  const attendanceKey = (volunteerUuid: string, apiDate: string) =>
    `${volunteerUuid}|${apiDate}`;

  /** Session-recorded ids win — they are the freshest thing we know. */
  const resolveAttendanceRecord = useCallback(
    (
      row: (AttendanceBearingRow & { volunteer_uuid?: string }) | null | undefined,
      apiDate: string
    ): AttendanceRecordRef | null =>
      sessionAttendance[attendanceKey(row?.volunteer_uuid ?? "", apiDate)] ??
      readAttendanceRecord(row, apiDate),
    [sessionAttendance]
  );

  // Guards against the auto-load effect firing repeatedly
  const isAutoLoadingRef = useRef(false);
  // Tracks which registration pages have been merged, so a re-render can't
  // append the same page twice
  const mergedRegistrationPagesRef = useRef<Set<number>>(new Set());

  const updateRegistrationMutation = useMutation({
    mutationFn: updateVolunteerRegistration,
  });
  const downloadMutation = useMutation({
    mutationFn: downloadVolunteerRegistrations,
  });
  const registerVolunteersMutation = useMutation({
    mutationFn: directRegisterVolunteer,
  });
  const unregisterVolunteersMutation = useMutation({
    mutationFn: directUnregisterVolunteer,
  });
  const markAttendanceMutation = useMutation({
    mutationFn: markVolunteerAttendance,
  });
  const markManualAttendanceMutation = useMutation({
    mutationFn: markManualVolunteerAttendance,
  });
  const updateAttendanceHoursMutation = useMutation({
    mutationFn: updateVolunteerAttendanceHours,
  });
  const undoAttendanceMutation = useMutation({
    mutationFn: undoVolunteerAttendance,
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Default the attendance date to today when it falls inside the opportunity's
  // window, otherwise to the start date.
  useEffect(() => {
    if (!opportunity_start_date) return;

    const today = atMidnight(new Date());
    const startDate = atMidnight(opportunity_start_date);

    if (opportunity_end_date) {
      const endDate = atMidnight(opportunity_end_date);
      setSelectedDate(
        today >= startDate && today <= endDate
          ? today.toISOString()
          : startDate.toISOString()
      );
      return;
    }
    setSelectedDate(startDate.toISOString());
  }, [opportunity_start_date, opportunity_end_date]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearchTerm(searchVolunteerTerm),
      500
    );
    return () => clearTimeout(timer);
  }, [searchVolunteerTerm]);

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

  const teamsQuery = useQuery({
    queryKey: ["teams", opportunityId, teamPage],
    queryFn: () =>
      getTeams({ opportunity_id: opportunityId, page: teamPage, limit: 10 }),
    enabled: Boolean(opportunityId),
  });

  const rolesQuery = useQuery({
    queryKey: ["opportunity-roles", opportunityId, rolePage],
    queryFn: () =>
      getRolesOfOpportunity({
        opportunity_id: opportunityId,
        page: rolePage,
        limit: 10,
      }),
    enabled: Boolean(opportunityId),
  });

  const teamsData = teamsQuery.data;
  const rolesData = rolesQuery.data;
  const teamsLoading = teamsQuery.isLoading;
  const rolesLoading = rolesQuery.isLoading;

  useEffect(() => {
    if (!teamsData?.data) return;
    setTeamsList((previous) => {
      const fresh = (teamsData.data as Team[]).filter(
        (team) => !previous.some((existing) => existing.id === team.id)
      );
      return fresh.length ? [...previous, ...fresh] : previous;
    });
  }, [teamsData]);

  useEffect(() => {
    if (!rolesData?.data) return;
    setRolesList((previous) => {
      const fresh = (rolesData.data as Role[]).filter(
        (role) => !previous.some((existing) => existing.id === role.id)
      );
      return fresh.length ? [...previous, ...fresh] : previous;
    });
  }, [rolesData]);

  /** Whether this volunteer may be marked present on `date`. */
  const canMarkAttendanceForDate = useCallback(
    (rowData: any, date: string): boolean => {
      if (!rowData?.registration_date || !date || !opportunity_end_time) {
        return false;
      }

      const registrationDate = atMidnight(rowData.registration_date);
      const selectedDateObj = atMidnight(date);

      if (selectedDateObj < registrationDate) return false;
      if (selectedDateObj > registrationDate) return true;

      // Same day: they only count if they registered before the session ended
      const registrationDateTime = new Date(rowData.registration_date);
      const [endHours, endMinutes] = opportunity_end_time
        .split(":")
        .map(Number);
      const eventEndTime = new Date(registrationDate);
      eventEndTime.setHours(endHours, endMinutes, 0, 0);

      return registrationDateTime <= eventEndTime;
    },
    [opportunity_end_time]
  );

  /** A volunteer's first eligible day is the later of start date / signup date. */
  const isDateValidForVolunteer = useCallback(
    (volunteer: any, date: string): boolean => {
      if (!date || !volunteer?.registration_date || !opportunity_start_date) {
        return true;
      }
      const earliestValidDate =
        atMidnight(volunteer.registration_date) >
        atMidnight(opportunity_start_date)
          ? atMidnight(volunteer.registration_date)
          : atMidnight(opportunity_start_date);
      return atMidnight(date) >= earliestValidDate;
    },
    [opportunity_start_date]
  );

  const selectableAttendanceUuids = useCallback(
    (rows: any[], date: string): string[] => {
      const formatted = toApiDate(date);
      return rows
        .filter((volunteer) => {
          const alreadyAttended = (
            volunteer.date_wise_attended || []
          ).includes(formatted);
          return (
            !alreadyAttended &&
            isDateValidForVolunteer(volunteer, date) &&
            canMarkAttendanceForDate(volunteer, date)
          );
        })
        .map((volunteer) => volunteer.volunteer_uuid)
        .filter(Boolean);
    },
    [canMarkAttendanceForDate, isDateValidForVolunteer]
  );

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
      if (selectAllAttendanceMode && manual_tracking) {
        const newUuids = selectableAttendanceUuids(
          registrations.data || [],
          selectedDate
        );
        if (newUuids.length > 0) {
          setSelectedAttendance((previous) => [
            ...previous,
            ...newUuids.filter((uuid) => !previous.includes(uuid)),
          ]);
        }
      }
    }

    if (pagination) {
      const currentPage = pagination.page || pagination.current_page;
      setHasMoreRegistrations(currentPage < pagination.total_pages);
    } else {
      setHasMoreRegistrations((registrations.data || []).length >= 10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations, fetchingRegistrations]);

  const handleTeamMenuScroll = () => {
    if (
      !teamsLoading &&
      (teamsData?.meta?.pagination?.total_pages ?? 0) > teamPage
    ) {
      setTeamPage((previous) => previous + 1);
    }
  };

  const handleRoleMenuScroll = () => {
    if (
      !rolesLoading &&
      (rolesData?.meta?.pagination?.total_pages ?? 0) > rolePage
    ) {
      setRolePage((previous) => previous + 1);
    }
  };

  const teamsRefetch = async () => {
    setTeamsList([]);
    setTeamPage(1);
    await teamsQuery.refetch();
  };

  const rolesRefetch = async () => {
    setRolesList([]);
    setRolePage(1);
    await rolesQuery.refetch();
  };

  const teamOptions: SelectOption[] = teamsList.map((team) => ({
    label: String(team[`team_name_${selectedLanguage}`]),
    value: String(team.id),
  }));

  const roleOptions: SelectOption[] = [
    { label: t("COMMON.NOT_SELECTED"), value: "" },
    ...rolesList.map((role) => ({
      label: String(role[`role_name_${selectedLanguage}`]),
      value: String(role.id),
    })),
  ];

  const resetAndRefetchRegistrations = async () => {
    mergedRegistrationPagesRef.current = new Set();
    setAllRegistrations([]);
    setHasMoreRegistrations(true);
    setSelectAllAttendanceMode(false);
    setSelectAllAttendance(false);
    setSelectedAttendance([]);
    setPage(1);
    await registrationsQuery.refetch();
  };

  const handleDownload = async () => {
    if (!opportunityId) return;
    try {
      const response = await downloadMutation.mutateAsync({
        opportunity_id: opportunityId,
        teams: filters.teams,
        roles: filters.roles,
        search: debouncedSearch,
        mark_attendance: manual_tracking ? true : undefined,
        date: selectedDate ? toApiDate(selectedDate) : undefined,
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

  const handleUpdate = async (
    id: string,
    type: "team" | "role",
    value: string | undefined
  ) => {
    try {
      setUpdatingId(id);
      setUpdating(type);
      await updateRegistrationMutation.mutateAsync({
        id,
        data: { registration: id, [type]: value },
      });
      await resetAndRefetchRegistrations();
      toast.success(t("COMMON.UPDATE_SUCCESS"));
    } catch (error: any) {
      const errors = error?.response?.data?.errors;
      if (errors) {
        Object.keys(errors).forEach((key) => {
          toast.error(errors[key][selectedLanguage] || t("COMMON.UPDATE_FAILED"));
        });
      }
    } finally {
      setUpdatingId(null);
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

  const handleAddVolunteerClick = () => {
    setSearchVolunteerTerm("");
    setDebouncedSearchTerm("");
    setSelectedVolunteers([]);
    setVolunteerPage(1);
    setAllVolunteers([]);
    setHasMoreVolunteers(true);
    setShowVolunteersModal(true);
  };

  useEffect(() => {
    if (showVolunteersModal) {
      setVolunteerPage(1);
      setAllVolunteers([]);
      setHasMoreVolunteers(true);
    }
  }, [debouncedSearchTerm, showVolunteersModal]);

  const availableVolunteersQuery = useQuery({
    queryKey: [
      "available-volunteers",
      opportunityId,
      debouncedSearchTerm,
      volunteerPage,
    ],
    queryFn: () =>
      getAvailableVolunteers({
        opportunity_id: opportunityId || "0",
        type: "volunteer",
        search: debouncedSearchTerm,
        page: volunteerPage,
        limit: 5,
      }),
    enabled: Boolean(opportunityId) && showVolunteersModal,
  });

  const availableVolunteers = availableVolunteersQuery.data;
  const fetchingVolunteers = availableVolunteersQuery.isFetching;

  useEffect(() => {
    if (!availableVolunteers || fetchingVolunteers) return;

    if (volunteerPage === 1) {
      setAllVolunteers(availableVolunteers.data || []);
    } else {
      setAllVolunteers((previous) => [
        ...previous,
        ...(availableVolunteers.data || []),
      ]);
    }

    const pagination = availableVolunteers?.meta?.pagination;
    if (pagination) {
      const currentPage = pagination.page || pagination.current_page;
      setHasMoreVolunteers(currentPage < pagination.total_pages);
    } else {
      setHasMoreVolunteers((availableVolunteers.data || []).length >= 5);
    }
  }, [availableVolunteers, fetchingVolunteers, volunteerPage]);

  const loadMoreVolunteers = useCallback(() => {
    if (hasMoreVolunteers && !fetchingVolunteers) {
      setVolunteerPage((previous) => previous + 1);
    }
  }, [hasMoreVolunteers, fetchingVolunteers]);

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

  const toggleVolunteerSelection = (volunteerId: number) => {
    setSelectedVolunteers((previous) => {
      const numericId = Number(volunteerId);
      return previous.includes(numericId)
        ? previous.filter((id) => id !== numericId)
        : [...previous, numericId];
    });
  };

  const handleRegisterSelectedVolunteers = async () => {
    if (!opportunityId || selectedVolunteers.length === 0) return;

    try {
      await registerVolunteersMutation.mutateAsync({
        opportunity_id: opportunityId,
        user_ids: selectedVolunteers,
      });
      toast.success(t("COMMON.VOLUNTEERS_ADDED_SUCCESS"));
      setShowVolunteersModal(false);
      await resetAndRefetchRegistrations();
    } catch (error: any) {
      const data = error?.response?.data;
      toast.error(
        data?.[`message_${selectedLanguage}`] ||
          t("COMMON.VOLUNTEERS_ADDED_FAILED")
      );
    }
  };

  const handleDeleteVolunteer = async () => {
    if (!opportunityId || !deletingVolunteerId) return;

    try {
      await unregisterVolunteersMutation.mutateAsync({
        opportunity_id: opportunityId,
        user_ids: [deletingVolunteerId],
      });
      toast.success(t("COMMON.VOLUNTEER_REMOVED_SUCCESS"));
      setShowDeleteModal(false);
      resetAndRefetchRegistrations();
    } catch (error: any) {
      const data = error?.response?.data;
      toast.error(
        data?.[`message_${selectedLanguage}`] ||
          t("COMMON.VOLUNTEER_REMOVED_FAILED")
      );
    } finally {
      setDeletingVolunteerId(null);
    }
  };

  // Changing the date invalidates every pending selection
  useEffect(() => {
    if (manual_tracking) {
      setSelectedAttendance([]);
      setSelectAllAttendance(false);
      setSelectAllAttendanceMode(false);
    }
  }, [manual_tracking, selectedDate]);

  const handleSelectAllAttendanceChange = () => {
    if (!manual_tracking) return;

    const newSelectAll = !selectAllAttendance;
    setSelectAllAttendance(newSelectAll);
    setSelectAllAttendanceMode(newSelectAll);
    setSelectedAttendance(
      newSelectAll
        ? selectableAttendanceUuids(allRegistrations, selectedDate)
        : []
    );
  };

  const handleAttendanceCheckboxChange = (volunteerUuid: string) => {
    if (!manual_tracking) return;

    let newSelectedAttendance: string[];
    if (selectedAttendance.includes(volunteerUuid)) {
      // Manually unchecking one item leaves "select all" mode
      newSelectedAttendance = selectedAttendance.filter(
        (id) => id !== volunteerUuid
      );
      setSelectAllAttendanceMode(false);
    } else {
      newSelectedAttendance = [...selectedAttendance, volunteerUuid];
    }
    setSelectedAttendance(newSelectedAttendance);

    const formatted = toApiDate(selectedDate);
    const selectable = selectableAttendanceUuids(allRegistrations, selectedDate);
    const allSelected =
      selectable.length > 0 &&
      selectable.every((uuid) => {
        if (newSelectedAttendance.includes(uuid)) return true;
        const volunteer = allRegistrations.find(
          (row) => row.volunteer_uuid === uuid
        );
        return (volunteer?.date_wise_attended || []).includes(formatted);
      });

    setSelectAllAttendance(allSelected);
  };

  /**
   * Marks the selected volunteers present through the dedicated manual endpoint
   * (`POST /volunteer-attendance/manual/`), which runs alongside QR scanning
   * rather than replacing it. That endpoint takes one volunteer per call, so the
   * bulk selection fans out and the results are reported in aggregate; the hours
   * are left off so the backend derives them from the opportunity's duration.
   */
  const handleMarkAttendanceClick = async () => {
    if (!opportunityId || selectedAttendance.length === 0) {
      toast.error(t("COMMON.SELECT_USERS_TO_MARK"));
      return;
    }

    const attendanceDate = toApiDate(selectedDate);

    const results = await Promise.allSettled(
      selectedAttendance.map(
        (volunteerUuid): Promise<ManualAttendanceResult> =>
          markManualAttendanceMutation
            .mutateAsync({
              opportunity_id: opportunityId,
              volunteer_uuid: volunteerUuid,
              attendance_date: attendanceDate,
            })
            .then((response) => ({
              volunteerUuid,
              record: response?.data ?? null,
            }))
      )
    );

    const succeeded = results.filter(
      (result): result is PromiseFulfilledResult<ManualAttendanceResult> =>
        result.status === "fulfilled"
    );
    const failed = results.length - succeeded.length;

    if (succeeded.length > 0) {
      // Keep the returned attendance ids so hours and undo work immediately.
      setSessionAttendance((previous) => {
        const next = { ...previous };
        succeeded.forEach(({ value }) => {
          if (value.record?.id != null) {
            next[attendanceKey(value.volunteerUuid, attendanceDate)] = {
              id: value.record.id,
              total_hours: value.record.total_hours ?? null,
            };
          }
        });
        return next;
      });

      // Patch the rows in place rather than refetching — a reset here would
      // race the loader and blank the table.
      const attendedSet = new Set(succeeded.map(({ value }) => value.volunteerUuid));
      setAllRegistrations((previous) =>
        previous.map((volunteer) => {
          if (!attendedSet.has(volunteer.volunteer_uuid)) return volunteer;
          const existing: string[] = volunteer.date_wise_attended || [];
          if (existing.includes(attendanceDate)) return volunteer;
          return {
            ...volunteer,
            date_wise_attended: [...existing, attendanceDate],
          };
        })
      );

      toast.success(t("COMMON.USERS_MARKED_AS_ATTENDED"));
    }

    if (failed > 0) {
      const firstFailure = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );
      toast.error(
        getApiErrorMessage(
          firstFailure?.reason,
          selectedLanguage,
          t("COMMON.FAILED_TO_MARK_ATTENDED")
        )
      );
    }

    setSelectedAttendance([]);
    setSelectAllAttendance(false);
    setSelectAllAttendanceMode(false);
  };

  /** Inline hours correction — works on manual and QR records alike. */
  const handleSaveHours = async (
    attendanceId: string | number,
    key: string,
    rawValue: string
  ) => {
    const hours = Number(rawValue);
    if (!rawValue.trim() || Number.isNaN(hours) || hours < 0 || hours > 24) {
      toast.error(t("COMMON.ATTENDANCE_HOURS_RANGE"));
      return;
    }

    try {
      const response = await updateAttendanceHoursMutation.mutateAsync({
        attendance_id: attendanceId,
        total_hours: hours,
      });
      setSessionAttendance((previous) => ({
        ...previous,
        [key]: {
          id: attendanceId,
          total_hours: response?.data?.total_hours ?? hours,
        },
      }));
      setEditingHoursKey(null);
      toast.success(t("COMMON.TOAST.ATTENDANCE_HOURS_SUCCESS"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          selectedLanguage,
          t("COMMON.TOAST.ATTENDANCE_HOURS_FAILED")
        )
      );
    }
  };

  /**
   * Clears a check-in and returns the hours. The volunteer can then be marked
   * present again for the same day with corrected hours — that round trip is
   * the whole point of the endpoint.
   */
  const handleConfirmUndo = async () => {
    if (!pendingUndo) return;
    const { attendanceId, key } = pendingUndo;
    const [volunteerUuid, apiDate] = key.split("|");

    try {
      await undoAttendanceMutation.mutateAsync(attendanceId);

      setSessionAttendance((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      setAllRegistrations((previous) =>
        previous.map((volunteer) =>
          volunteer.volunteer_uuid === volunteerUuid
            ? {
                ...volunteer,
                date_wise_attended: (volunteer.date_wise_attended || []).filter(
                  (date: string) => date !== apiDate
                ),
              }
            : volunteer
        )
      );

      setPendingUndo(null);
      toast.success(t("COMMON.TOAST.ATTENDANCE_UNDO_SUCCESS"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          selectedLanguage,
          t("COMMON.TOAST.ATTENDANCE_UNDO_FAILED")
        )
      );
    }
  };

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

  /** Emergency contacts are only relevant for volunteers who signed up under 18. */
  const shouldShowEmergencyContact = (rowData: any): boolean => {
    const dob = rowData?.user?.dob;
    const createdAt = rowData?.created_at;
    if (!dob || !createdAt) return false;

    const age = calculateAgeAtRegistration(dob, createdAt);
    if (age === null || age >= 18) return false;

    return !!(
      rowData?.user?.emergency_contact_name ||
      rowData?.user?.emergency_contact_phone ||
      rowData?.user?.emergency_contact_civil_id ||
      rowData?.user?.emergency_contact_relationship_display
    );
  };

  /**
   * Registrations can't be deleted once the volunteer's own first session has
   * begun — which may be later than the opportunity start if they signed up
   * after that day's session ended.
   */
  const hasVolunteerParticipationStarted = (rowData: any): boolean => {
    if (
      !rowData?.registration_date ||
      !opportunity_start_date ||
      !opportunity_start_time
    ) {
      return false;
    }

    const registrationDateTime = new Date(rowData.registration_date);
    const opportunityStartDate = atMidnight(opportunity_start_date);
    const registrationDate = atMidnight(rowData.registration_date);

    const [endHours, endMinutes] = (opportunity_end_time || "23:59:59")
      .split(":")
      .map(Number);
    const registrationDateEventEnd = new Date(registrationDate);
    registrationDateEventEnd.setHours(endHours, endMinutes, 0, 0);

    let volunteerFirstDay: Date;
    if (registrationDate < opportunityStartDate) {
      volunteerFirstDay = new Date(opportunityStartDate);
    } else if (registrationDateTime > registrationDateEventEnd) {
      volunteerFirstDay = new Date(registrationDate);
      volunteerFirstDay.setDate(volunteerFirstDay.getDate() + 1);
    } else {
      volunteerFirstDay = new Date(registrationDate);
    }
    volunteerFirstDay.setHours(0, 0, 0, 0);

    const [startHours, startMinutes] = (opportunity_start_time || "00:00:00")
      .split(":")
      .map(Number);
    const volunteerParticipationStart = new Date(volunteerFirstDay);
    volunteerParticipationStart.setHours(startHours, startMinutes, 0, 0);

    return new Date() >= volunteerParticipationStart;
  };

  const goToProfile = (user: any, fallbackId?: number | string) => {
    const id = user?.id || fallbackId;
    if (!id) return;
    router.push(
      user?.is_public
        ? `/public-profile/${id}`
        : `/volunteer-private-profile/${id}`
    );
  };

  const hasEmergencyContactVolunteers = useMemo(
    () => allRegistrations.some(shouldShowEmergencyContact),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRegistrations]
  );

  const effectiveEndDate = useMemo(() => {
    if (!opportunity_end_date) return "";
    // Attendance can only be recorded for today or earlier
    const today = atMidnight(new Date());
    const endDate = atMidnight(opportunity_end_date);
    return today < endDate ? today.toISOString() : opportunity_end_date;
  }, [opportunity_end_date]);

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
                  onChange={handleSelectAllAttendanceChange}
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
    ...(checkInWindow.requiresCheckIn
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

  const registeredCount =
    registrations?.meta?.pagination?.total || allRegistrations.length || 0;
  const isParticipantsFull = Boolean(
    participants_needed && registeredCount >= toNumber(participants_needed)
  );

  const displayedVolunteers = showVolunteersModal ? allVolunteers : [];

  return (
    <>
      {registrationsQuery.isLoading && <Loader />}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("COMMON.FILTER")}
        size="small"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              type="submit"
              onClick={() => {
                const form = document.querySelector("form");
                if (form) form.requestSubmit();
              }}
              disabled={!isFilterDirty}
              className="xss:!w-full"
            >
              {t("COMMON.APPLY")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => {
                setFilters({ teams: [], roles: [] });
                setClearFiltersKey((previous) => previous + 1);
              }}
              className="xss:!w-full"
            >
              {t("COMMON.CLEAR")}
            </Button>
          </div>
        }
      >
        <VolunteerFilterModal
          key={clearFiltersKey}
          opportunityId={opportunityId || ""}
          onFilterChange={handleFilterChange}
          currentFilters={{
            teams: filters.teams ? filters.teams.map(String) : undefined,
            roles: filters.roles ? filters.roles.map(String) : undefined,
          }}
          onDirtyChange={setIsFilterDirty}
        />
      </Modal>

      <Modal
        open={roleModalState}
        onClose={handleRoleModalClose}
        title={t("COMMON.ROLE")}
        size="md"
      >
        <VolunteerRoleModal
          opportunityId={opportunityId || ""}
          dropdwonRefetch={rolesRefetch}
          setMismatchChecker={setRoleModalRef}
          showMismatchModal={showMismatchModal}
          setShowMismatchModal={setShowMismatchModal}
          onclose={closeRoleModal}
        />
      </Modal>

      <Modal
        open={pendingUndo !== null}
        onClose={() => setPendingUndo(null)}
        title={t("COMMON.UNDO_ATTENDANCE_TITLE")}
        size="small"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              disabled={undoAttendanceMutation.isPending}
              onClick={handleConfirmUndo}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setPendingUndo(null)}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <p className="text-center text-secondary-100">
          {pendingUndo?.volunteerName && (
            <span className="block font-bold pb-2">
              {pendingUndo.volunteerName}
            </span>
          )}
          {t("COMMON.UNDO_ATTENDANCE_CONFIRM")}
        </p>
      </Modal>

      <Modal
        open={openteam}
        onClose={() => setOpenteam(false)}
        title={t("COMMON.TEAM")}
        size="md"
      >
        <TeamModal
          opportunityId={opportunityId || ""}
          dropdownRefetch={teamsRefetch}
        />
      </Modal>

      <Modal
        open={showVolunteersModal}
        onClose={() => setShowVolunteersModal(false)}
        title={t("COMMON.AVAILABLE_VOLUNTEERS")}
        size="md"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              disabled={
                selectedVolunteers.length === 0 ||
                registerVolunteersMutation.isPending
              }
              onClick={handleRegisterSelectedVolunteers}
            >
              {t("COMMON.ADD")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setShowVolunteersModal(false)}
              disabled={registerVolunteersMutation.isPending}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <div className="pb-10">
          <div className="mb-4 flex items-center searchitms bg-white border border-primary-5/20 rounded-full px-4 py-2">
            <img
              src="/assets/profile/searchicn.svg"
              alt=""
              className="lg:w-auto md:w-5"
            />
            <input
              type="text"
              placeholder={t("COMMON.SEARCH_VOLUNTEERS")}
              className="flex-1 outline-none bg-transparent px-2 2xl:text-[25px] lg:text-lg xss:text-base laptopmain:text-xl lg:w-auto md:w-[150px] w-[150px] placeholder:text-[#181822CC]/80"
              onChange={(event) => setSearchVolunteerTerm(event.target.value)}
            />
          </div>

          {selectedVolunteers.length > 0 && (
            <div className="mb-4 text-primary-5 font-medium">
              {t("COMMON.SELECTED_VOLUNTEERS")}: {selectedVolunteers.length}
            </div>
          )}

          {availableVolunteersQuery.isLoading && volunteerPage === 1 ? (
            <div className="max-h-96 overflow-y-auto">
              <Loader />
            </div>
          ) : displayedVolunteers.length === 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <div className="text-center text-gray-500 p-4">
                {t("COMMON.NO_VOLUNTEERS_FOUND")}
              </div>
            </div>
          ) : (
            <div
              id="volunteers-scroll-container"
              className="max-h-96 overflow-y-auto"
            >
              <InfiniteScroll
                dataLength={allVolunteers.length}
                next={loadMoreVolunteers}
                hasMore={hasMoreVolunteers}
                hasChildren={displayedVolunteers.length > 0}
                loader={
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-5" />
                  </div>
                }
                endMessage={
                  <div className="text-center text-gray-500 py-4 text-sm">
                    {t("COMMON.NO_MORE_VOLUNTEERS")}
                  </div>
                }
                scrollableTarget="volunteers-scroll-container"
              >
                <div className="space-y-2">
                  {displayedVolunteers.map((volunteer: any) => {
                    const volunteerId = Number(
                      volunteer.user_id || volunteer.user?.id || volunteer.id
                    );
                    const isSelected = selectedVolunteers.includes(volunteerId);

                    return (
                      <div
                        key={volunteerId}
                        className={`border rounded-md p-3 flex items-center gap-3 ${
                          isSelected ? "bg-primary-5/10 border-primary-5" : ""
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <img
                            src={
                              volunteer.user?.profile_pic ||
                              getDefaultProfileImage(
                                volunteer?.user?.gender_display?.value_en,
                                "/assets/profile/male_profile.svg",
                                "/assets/profile/female_profile.svg",
                                "/assets/profile/org_profile.svg"
                              )
                            }
                            alt={volunteer.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        </div>
                        <div className="flex-grow">
                          <div className="font-medium">
                            <span
                              className="cursor-pointer text-primary-5"
                              onClick={() =>
                                goToProfile(
                                  volunteer.user,
                                  volunteer.user_id || volunteer.id
                                )
                              }
                            >
                              {volunteer.full_name}
                            </span>
                          </div>
                          {(volunteer.civil_id || volunteer.user?.civil_id) && (
                            <div className="text-xs text-gray-500">
                              {volunteer.civil_id || volunteer.user?.civil_id}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            {volunteer.email}
                          </div>
                        </div>
                        <div className="flex-shrink-0 p-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleVolunteerSelection(volunteerId)}
                            className="h-5 w-5 text-primary-5 rounded focus:ring-primary-5 cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </InfiniteScroll>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() =>
          !unregisterVolunteersMutation.isPending && setShowDeleteModal(false)
        }
        title={t("COMMON.UNREGISTER_VOLUNTEER")}
        size="sm"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              disabled={unregisterVolunteersMutation.isPending}
              onClick={handleDeleteVolunteer}
            >
              {t("COMMON.CONFIRM")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => setShowDeleteModal(false)}
              disabled={unregisterVolunteersMutation.isPending}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </div>
        }
      >
        <div className="pb-10 text-center text-lg">
          <p>{t("COMMON.DELETE_VOLUNTEER_CONFIRMATION")}</p>
        </div>
      </Modal>

      <div className="border-t border-[#000]">
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px] mx-auto relative">
          <div className="flex justify-between items-center mobilescreen:flex-col mobilescreen:gap-4">
            <h2 className="2xl:text-[40px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-5 font-bold">
              {t("COMMON.LIST_TITLE")}
            </h2>{" "}
            <div className="flex gap-6 extrasmall:gap-2">
              <Button
                onClick={() => setOpenteam(true)}
                variant="primary"
                size="medium"
                className="extrasmall:!w-[115px]"
              >
                {t("COMMON.TEAM")}
              </Button>
              <Button
                onClick={openRoleModal}
                variant="primary"
                size="medium"
                className="extrasmall:!w-[115px]"
              >
                {t("COMMON.ROLE")}
              </Button>
            </div>
          </div>

          <div className="mobilescreen:w-[100%] flex justify-center pt-12 pb-12">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-center w-full max-w-4xl">
              <div className="w-full lg:w-auto flex-1">
                <Searchbar
                  onFilterClick={() => setOpen(true)}
                  onSearchChange={(value) => setSearchQuery(value)}
                />
              </div>
              {opportunity_start_date && opportunity_end_date && (
                <div className="w-full lg:w-auto flex-1">
                  <DateRangePicker
                    selectedDate={selectedDate}
                    startDate={opportunity_start_date}
                    endDate={effectiveEndDate}
                    onDateChange={(date) => setSelectedDate(date)}
                    placeholder={t("COMMON.DATES")}
                  />
                </div>
              )}
            </div>
          </div>

          {/* How long is left to record attendance, or that the window shut. */}
          <CheckInWindowBanner
            window={checkInWindow}
            className="mb-6 max-w-2xl mx-auto"
          />

          {checkInWindow.requiresCheckIn && (
            <div className="flex justify-center mb-6">
              <div className="mx-auto px-4 md:px-6 lg:px-8">
                <p className="text-center mobilescreen:text-[18px] mediumscreen3:text-[18px] text-[24px] text-[#181822CC]/70 leading-relaxed mb-4">
                  {t("COMMON.CONFIRM_ATTENDANCE")}
                </p>

                {/* QR and manual are offered together — the organizer picks. */}
                {checkInWindow.qrEnabled && checkInWindow.isOpen && (
                  <div className="flex justify-center">
                    <Button
                      variant="secondary"
                      size="medium"
                      onClick={() =>
                        router.push(`/scan-qr?opportunity_id=${opportunityId}`)
                      }
                    >
                      {t("COMMON.SCAN_QR_CODE")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="selectfiled voulnteerlist relative">
            <div
              id="registrations-scroll-container"
              style={{ maxHeight: "500px", overflowY: "auto" }}
            >
              <InfiniteScroll
                dataLength={allRegistrations.length}
                next={loadMoreRegistrations}
                hasMore={hasMoreRegistrations}
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
                scrollableTarget="registrations-scroll-container"
                scrollThreshold={0.8}
              >
                <Table
                  columns={columns}
                  data={allRegistrations}
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
                                goToProfile(user, rowData.user_id || rowData.id)
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
                        <div className="relative z-10">
                          <Select
                            className="w-full"
                            options={teamOptions}
                            value={
                              teamOptions.find(
                                (option) =>
                                  option.value ===
                                  String(rowData[column.key]?.id || "")
                              ) || teamOptions[0]
                            }
                            onChange={async (option: SelectOption | null) => {
                              await handleUpdate(
                                rowData.id,
                                "team",
                                option?.value || undefined
                              );
                            }}
                            onMenuScrollToBottom={handleTeamMenuScroll}
                            isLoading={teamsLoading}
                            isDisabled={
                              teamsLoading ||
                              (updatingId === rowData.id && updating === "team")
                            }
                            placeholder={t("COMMON.TEAM")}
                            menuPortalTarget={
                              typeof document !== "undefined"
                                ? document.body
                                : undefined
                            }
                            menuPosition="fixed"
                            styles={selectStyles}
                            menuShouldBlockScroll={false}
                            isSearchable={false}
                          />
                        </div>
                      );
                    }

                    if (column.type === "role") {
                      return (
                        <div className="relative z-10">
                          <Select
                            className="w-full"
                            options={roleOptions}
                            value={
                              roleOptions.find(
                                (option) =>
                                  option.value === String(rowData.role?.id || "")
                              ) || roleOptions[0]
                            }
                            onChange={async (option: SelectOption | null) => {
                              await handleUpdate(
                                rowData.id,
                                "role",
                                option?.value || undefined
                              );
                            }}
                            onMenuScrollToBottom={handleRoleMenuScroll}
                            isLoading={rolesLoading}
                            isDisabled={
                              rolesLoading ||
                              (updatingId === rowData.id && updating === "role")
                            }
                            placeholder={t("COMMON.ROLE")}
                            menuPortalTarget={
                              typeof document !== "undefined"
                                ? document.body
                                : undefined
                            }
                            menuPosition="fixed"
                            styles={selectStyles}
                            menuShouldBlockScroll={false}
                            isSearchable={false}
                          />
                        </div>
                      );
                    }

                    if (column.type === "attendance") {
                      const volunteerUuid = rowData.volunteer_uuid;
                      const formatted = toApiDate(selectedDate);
                      const isAttendedOnSelectedDate = (
                        rowData.date_wise_attended || []
                      ).includes(formatted);
                      const isSelected =
                        selectedAttendance.includes(volunteerUuid);
                      const isCheckboxDisabled =
                        isAttendedOnSelectedDate ||
                        !manual_tracking ||
                        !isDateValidForVolunteer(rowData, selectedDate) ||
                        !canMarkAttendanceForDate(rowData, selectedDate);

                      return (
                        <div className="flex justify-center">
                          <label
                            className={
                              isCheckboxDisabled
                                ? "cursor-not-allowed"
                                : "cursor-pointer"
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
                                    handleAttendanceCheckboxChange(volunteerUuid)
                                  }
                                  disabled={isCheckboxDisabled}
                                  className={`absolute inset-0 w-full h-full opacity-0 ${
                                    isCheckboxDisabled
                                      ? "cursor-not-allowed"
                                      : "cursor-pointer"
                                  }`}
                                />
                              </div>
                            </div>
                          </label>
                        </div>
                      );
                    }

                    if (column.type === "attendance_hours") {
                      const apiDate = toApiDate(selectedDate);
                      const isAttended = (
                        rowData.date_wise_attended || []
                      ).includes(apiDate);

                      if (!isAttended) {
                        return <span className="text-gray-400">-</span>;
                      }

                      const record = resolveAttendanceRecord(rowData, apiDate);
                      const key = attendanceKey(rowData.volunteer_uuid, apiDate);

                      // No id means no way to address the record — show the
                      // hours read-only until the API sends attendance ids.
                      if (!record) {
                        return (
                          <span className="text-secondary-102">
                            {rowData.total_hours ?? "-"}
                          </span>
                        );
                      }

                      if (editingHoursKey === key) {
                        return (
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number"
                              min={0}
                              max={24}
                              step="0.5"
                              value={hoursDraft}
                              autoFocus
                              onChange={(event) =>
                                setHoursDraft(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  void handleSaveHours(record.id, key, hoursDraft);
                                }
                                if (event.key === "Escape") {
                                  setEditingHoursKey(null);
                                }
                              }}
                              className="w-16 border border-primary-5 rounded px-1 py-0.5 text-center"
                              aria-label={t("COMMON.ATTENDANCE_HOURS")}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void handleSaveHours(record.id, key, hoursDraft)
                              }
                              disabled={updateAttendanceHoursMutation.isPending}
                              className="text-primary-5 disabled:opacity-50"
                              aria-label={t("COMMON.SAVE")}
                            >
                              <FaCheck size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingHoursKey(null)}
                              className="text-secondary-102"
                              aria-label={t("COMMON.CANCEL")}
                            >
                              <RxCross1 size={14} />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center gap-2 justify-center">
                          <span className="text-secondary-102">
                            {record.total_hours ?? rowData.total_hours ?? "-"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingHoursKey(key);
                              setHoursDraft(
                                record.total_hours != null
                                  ? String(record.total_hours)
                                  : ""
                              );
                            }}
                            className="text-primary-5 hover:text-primary-5/80"
                            title={t("COMMON.EDIT_HOURS")}
                            aria-label={t("COMMON.EDIT_HOURS")}
                          >
                            <FaPen size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingUndo({
                                attendanceId: record.id,
                                key,
                                volunteerName:
                                  rowData.full_name || rowData.user_full_name || "",
                              })
                            }
                            className="text-[#D32F2F] hover:text-[#D32F2F]/80"
                            title={t("COMMON.UNDO_ATTENDANCE")}
                            aria-label={t("COMMON.UNDO_ATTENDANCE")}
                          >
                            <FaRotateLeft size={12} />
                          </button>
                        </div>
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
                      const participationStarted =
                        hasVolunteerParticipationStarted(rowData);
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
                              setDeletingVolunteerId(userId);
                              setShowDeleteModal(true);
                            }}
                            className={`text-primary-5 ${
                              participationStarted
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                            title={t("COMMON.DELETE")}
                            disabled={participationStarted}
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
                    isParticipantsFull ? undefined : handleAddVolunteerClick
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
                onClick={handleMarkAttendanceClick}
                disabled={
                  markAttendanceMutation.isPending ||
                  selectedAttendance.length === 0
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
