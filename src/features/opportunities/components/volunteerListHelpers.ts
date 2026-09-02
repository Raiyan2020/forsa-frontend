import type { useRouter } from "next/navigation";

/**
 * The registrations API's row shape isn't modeled — this codebase already
 * treats it as `any` throughout. Declared once so passing it between the
 * split-out components reuses one alias instead of repeating `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UntypedRow = any;

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
export interface AttendanceRecordRef {
  id: string | number;
  total_hours?: number | null;
}

/** The attendance-carrying fields a registration row might expose. */
export interface AttendanceBearingRow {
  attendance_id?: string | number | null;
  attendance_date?: string | null;
  total_hours?: number | null;
  attendance?: AttendanceEntry | null;
  attendances?: AttendanceEntry[] | null;
  date_wise_attendance?: AttendanceEntry[] | null;
}

export interface AttendanceEntry {
  id?: string | number | null;
  attendance_date?: string | null;
  date?: string | null;
  total_hours?: number | null;
}

/** One volunteer's outcome from a fanned-out manual check-in. */
export interface ManualAttendanceResult {
  volunteerUuid: string;
  record: AttendanceEntry | null;
}

export interface Team {
  id: string;
  team_name_en: string;
  team_name_ar: string;
  [key: string]: string | number;
}

export interface Role {
  id: string;
  role_name_en: string;
  role_name_ar: string;
  [key: string]: string | number;
}

export interface SelectOption {
  label: string;
  value: string;
}

export function readAttendanceRecord(
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

/** Local `YYYY-MM-DD`, matching what the attendance API returns. */
export const toApiDate = (value: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

export const atMidnight = (value: string | Date): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Whether this volunteer may be marked present on `date`. */
export function canMarkAttendanceForDate(
  rowData: any,
  date: string,
  opportunity_end_time: string | undefined
): boolean {
  if (!rowData?.registration_date || !date || !opportunity_end_time) {
    return false;
  }

  const registrationDate = atMidnight(rowData.registration_date);
  const selectedDateObj = atMidnight(date);

  if (selectedDateObj < registrationDate) return false;
  if (selectedDateObj > registrationDate) return true;

  // Same day: they only count if they registered before the session ended
  const registrationDateTime = new Date(rowData.registration_date);
  const [endHours, endMinutes] = opportunity_end_time.split(":").map(Number);
  const eventEndTime = new Date(registrationDate);
  eventEndTime.setHours(endHours, endMinutes, 0, 0);

  return registrationDateTime <= eventEndTime;
}

/** A volunteer's first eligible day is the later of start date / signup date. */
export function isDateValidForVolunteer(
  volunteer: any,
  date: string,
  opportunity_start_date: string | undefined
): boolean {
  if (!date || !volunteer?.registration_date || !opportunity_start_date) {
    return true;
  }
  const earliestValidDate =
    atMidnight(volunteer.registration_date) > atMidnight(opportunity_start_date)
      ? atMidnight(volunteer.registration_date)
      : atMidnight(opportunity_start_date);
  return atMidnight(date) >= earliestValidDate;
}

export function selectableAttendanceUuids(
  rows: any[],
  date: string,
  opportunity_start_date: string | undefined,
  opportunity_end_time: string | undefined
): string[] {
  const formatted = toApiDate(date);
  return rows
    .filter((volunteer) => {
      const alreadyAttended = (volunteer.date_wise_attended || []).includes(
        formatted
      );
      return (
        !alreadyAttended &&
        isDateValidForVolunteer(volunteer, date, opportunity_start_date) &&
        canMarkAttendanceForDate(volunteer, date, opportunity_end_time)
      );
    })
    .map((volunteer) => volunteer.volunteer_uuid)
    .filter(Boolean);
}

export function calculateAgeAtRegistration(
  dob: string,
  registrationDate: string
): number | null {
  if (!dob || !registrationDate) return null;

  const birthDate = new Date(dob);
  const regDate = new Date(registrationDate);
  let age = regDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = regDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && regDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/** Emergency contacts are only relevant for volunteers who signed up under 18. */
export function shouldShowEmergencyContact(rowData: any): boolean {
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
}

/**
 * Registrations can't be deleted once the volunteer's own first session has
 * begun — which may be later than the opportunity start if they signed up
 * after that day's session ended.
 */
export function hasVolunteerParticipationStarted(
  rowData: any,
  opportunity_start_date: string | undefined,
  opportunity_start_time: string | undefined,
  opportunity_end_time: string | undefined
): boolean {
  if (!rowData?.registration_date || !opportunity_start_date || !opportunity_start_time) {
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
}

export function goToProfile(
  router: ReturnType<typeof useRouter>,
  user: any,
  fallbackId?: number | string
) {
  const id = user?.id || fallbackId;
  if (!id) return;
  router.push(
    user?.is_public ? `/public-profile/${id}` : `/volunteer-private-profile/${id}`
  );
}
