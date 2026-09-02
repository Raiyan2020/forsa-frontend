"use client";

import { useTranslation } from "react-i18next";
import { FaCheck, FaPen, FaRotateLeft } from "react-icons/fa6";
import { RxCross1 } from "react-icons/rx";
import { AttendanceRecordRef, UntypedRow, toApiDate } from "./volunteerListHelpers";

interface AttendanceHoursCellProps {
  rowData: UntypedRow;
  selectedDate: string;
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
}

/** Logged hours for a session, editable inline, with an undo affordance. */
export default function AttendanceHoursCell({
  rowData,
  selectedDate,
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

  // No id means no way to address the record — show the hours read-only
  // until the API sends attendance ids.
  if (!record) {
    return (
      <span className="text-secondary-102">{rowData.total_hours ?? "-"}</span>
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
          onChange={(event) => setHoursDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void onSaveHours(record.id, key, hoursDraft);
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
          onClick={() => void onSaveHours(record.id, key, hoursDraft)}
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
          setHoursDraft(record.total_hours != null ? String(record.total_hours) : "");
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
