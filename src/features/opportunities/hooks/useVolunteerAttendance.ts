"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  markManualVolunteerAttendance,
  markVolunteerAttendance,
  undoVolunteerAttendance,
  updateVolunteerAttendanceHours,
} from "@/features/opportunities/services/attendance";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useLanguageStore } from "@/store/languageStore";
import {
  AttendanceBearingRow,
  AttendanceRecordRef,
  ManualAttendanceResult,
  UntypedRow,
  atMidnight,
  readAttendanceRecord,
  selectableAttendanceUuids,
  toApiDate,
} from "../components/volunteerListHelpers";

interface UseVolunteerAttendanceArgs {
  opportunityId: string | undefined;
  manual_tracking: boolean;
  opportunity_start_date: string | undefined;
  opportunity_end_date: string | undefined;
  allRegistrations: UntypedRow[];
  setAllRegistrations: React.Dispatch<React.SetStateAction<UntypedRow[]>>;
}

/**
 * Everything to do with recording attendance for a session: which date is
 * selected, the manual check-in selection/bulk-mark flow, and inline hours
 * editing + undo. Registration data itself (fetching/pagination) stays owned
 * by the caller — this hook only reads and patches `allRegistrations`.
 */
export function useVolunteerAttendance({
  opportunityId,
  manual_tracking,
  opportunity_start_date,
  opportunity_end_date,
  allRegistrations,
  setAllRegistrations,
}: UseVolunteerAttendanceArgs) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedAttendance, setSelectedAttendance] = useState<string[]>([]);
  const [selectAllAttendance, setSelectAllAttendance] = useState(false);
  const [selectAllAttendanceMode, setSelectAllAttendanceMode] = useState(false);

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

  // markVolunteerAttendance (QR path) is never triggered from this screen —
  // only its `.isPending` backs the "Attended" button's disabled state,
  // mirroring the original component's behavior.
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

  const effectiveEndDate = (() => {
    if (!opportunity_end_date) return "";
    // Attendance can only be recorded for today or earlier
    const today = atMidnight(new Date());
    const endDate = atMidnight(opportunity_end_date);
    return today < endDate ? today.toISOString() : opportunity_end_date;
  })();

  // Changing the date invalidates every pending selection
  useEffect(() => {
    if (manual_tracking) {
      setSelectedAttendance([]);
      setSelectAllAttendance(false);
      setSelectAllAttendanceMode(false);
    }
  }, [manual_tracking, selectedDate]);

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

  /**
   * A new page of registrations just arrived — while "select all" is on,
   * fold in whichever of its rows are eligible so selection stays sticky
   * across pagination.
   */
  const applySelectAllToNewPage = useCallback(
    (newRows: UntypedRow[]) => {
      if (!selectAllAttendanceMode || !manual_tracking) return;
      const newUuids = selectableAttendanceUuids(
        newRows,
        selectedDate,
        opportunity_start_date,
        opportunity_end_date
      );
      if (newUuids.length === 0) return;
      setSelectedAttendance((previous) => [
        ...previous,
        ...newUuids.filter((uuid) => !previous.includes(uuid)),
      ]);
    },
    [
      selectAllAttendanceMode,
      manual_tracking,
      selectedDate,
      opportunity_start_date,
      opportunity_end_date,
    ]
  );

  const handleSelectAllAttendanceChange = (
    opportunity_end_time: string | undefined
  ) => {
    if (!manual_tracking) return;

    const newSelectAll = !selectAllAttendance;
    setSelectAllAttendance(newSelectAll);
    setSelectAllAttendanceMode(newSelectAll);
    setSelectedAttendance(
      newSelectAll
        ? selectableAttendanceUuids(
            allRegistrations,
            selectedDate,
            opportunity_start_date,
            opportunity_end_time
          )
        : []
    );
  };

  const handleAttendanceCheckboxChange = (
    volunteerUuid: string,
    opportunity_end_time: string | undefined
  ) => {
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
    const selectable = selectableAttendanceUuids(
      allRegistrations,
      selectedDate,
      opportunity_start_date,
      opportunity_end_time
    );
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

  return {
    selectedDate,
    setSelectedDate,
    effectiveEndDate,
    selectedAttendance,
    selectAllAttendance,
    handleSelectAllAttendanceChange,
    handleAttendanceCheckboxChange,
    handleMarkAttendanceClick,
    isMarkingAttendance: markAttendanceMutation.isPending,
    editingHoursKey,
    setEditingHoursKey,
    hoursDraft,
    setHoursDraft,
    handleSaveHours,
    isSavingHours: updateAttendanceHoursMutation.isPending,
    pendingUndo,
    setPendingUndo,
    handleConfirmUndo,
    isUndoingAttendance: undoAttendanceMutation.isPending,
    resolveAttendanceRecord,
    applySelectAllToNewPage,
  };
}
