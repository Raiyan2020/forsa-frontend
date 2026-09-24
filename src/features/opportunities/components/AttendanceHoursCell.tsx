"use client";

import { useTranslation } from "react-i18next";
import { FaCheck, FaPen, FaRotateLeft } from "react-icons/fa6";
import { RxCross1 } from "react-icons/rx";
import {
  type AttendanceScheduleSource,
  maxCreditableHours,
  sessionOnDate,
  splitHours,
  suggestedHoursFromCheckIn,
} from "../attendanceHours";
import { AttendanceRecordRef, UntypedRow, toApiDate } from "./volunteerListHelpers";

interface AttendanceHoursCellProps {
  rowData: UntypedRow;
  selectedDate: string;
  schedule: AttendanceScheduleSource;
  editingHoursKey: string | null;
  setEditingHoursKey: (key: string | null) => void;
  hoursDraft: string;
  setHoursDraft: (value: string) => void;
  onSaveHours: (
    attendanceId: string | number,
    key: string,
    rawValue: string,
    maxHours?: number | null
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
}

/**
 * Logged hours for a session, editable inline, with an undo affordance.
 *
 * A volunteer who checked in and never scanned out sits at 0 hours. Opening the
 * editor on such a row pre-fills arrival → session end (5:30 for a 5 → 9
 * session gives 3.5), which the organizer can adjust either way up to two hours
 * past the session's end — the client's rule, see `attendanceHours.ts`.
 */
export default function AttendanceHoursCell({
  rowData,
  selectedDate,
  schedule,
  editingHoursKey,
  setEditingHoursKey,
  hoursDraft,
  setHoursDraft,
  onSaveHours,
  isSavingHours,
  resolveAttendanceRecord,
  onRequestUndo,
}: AttendanceHoursCellProps) {
  const { t } = useTranslation();

  const apiDate = toApiDate(selectedDate);
  const isAttended = (rowData.date_wise_attended || []).includes(apiDate);

  if (!isAttended) {
    return <span className="text-gray-400">-</span>;
  }

  const record = resolveAttendanceRecord(rowData, apiDate);
  const key = `${rowData.volunteer_uuid}|${apiDate}`;

  // No id means no way to address the record — show the hours read-only.
  // BE-67.2 makes this the rare case rather than the norm: `attendances[]` now
  // carries the id for every attended date, so this only trips on a row whose
  // check-in the list has not refetched yet.
  if (!record) {
    return (
      <span className="text-secondary-102">{rowData.total_hours ?? "-"}</span>
    );
  }

  // Server values win once BE-91 sends them; the schedule is the fallback.
  const session = sessionOnDate(schedule, apiDate);
  const maxHours =
    record.max_hours ?? maxCreditableHours(session, record.checked_in_at);
  const missingCheckOut = Boolean(record.checked_in_at && !record.checked_out_at);
  const suggestedHours = missingCheckOut
    ? record.suggested_hours ??
      suggestedHoursFromCheckIn(session, record.checked_in_at)
    : null;
  const hasLoggedHours = (record.total_hours ?? 0) > 0;

  const draftValue = Number(hoursDraft);
  const draftDuration =
    hoursDraft.trim() && Number.isFinite(draftValue) && draftValue >= 0
      ? splitHours(draftValue)
      : null;

  if (editingHoursKey === key) {
    const save = () => void onSaveHours(record.id, key, hoursDraft, maxHours);
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 justify-center">
          <input
            type="number"
            min={0}
            max={maxHours ?? 24}
            step="0.25"
            value={hoursDraft}
            autoFocus
            onChange={(event) => setHoursDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") setEditingHoursKey(null);
            }}
            className="w-16 border border-primary-5 rounded px-1 py-0.5 text-center"
            aria-label={t("COMMON.ATTENDANCE_HOURS")}
          />
          <button
            type="button"
            onClick={save}
            disabled={isSavingHours}
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
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {draftDuration && t("COMMON.DURATION_HOURS_MINUTES", draftDuration)}
          {draftDuration && maxHours != null && " · "}
          {maxHours != null &&
            t("COMMON.ATTENDANCE_HOURS_MAX_HINT", { max: maxHours })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-center">
      <span className="text-secondary-102">
        {record.total_hours ?? rowData.total_hours ?? "-"}
      </span>
      {missingCheckOut && !hasLoggedHours && (
        <span className="rounded bg-[#FFF4E5] px-1.5 py-0.5 text-xs text-[#B26A00] whitespace-nowrap">
          {t("COMMON.NO_CHECK_OUT")}
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setEditingHoursKey(key);
          // A forgotten departure scan opens on arrival → session end rather
          // than on the 0 the check-in left behind.
          const initial =
            !hasLoggedHours && suggestedHours != null
              ? suggestedHours
              : record.total_hours;
          setHoursDraft(initial != null ? String(initial) : "");
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
          onRequestUndo({
            attendanceId: record.id,
            key,
            volunteerName: rowData.full_name || rowData.user_full_name || "",
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
