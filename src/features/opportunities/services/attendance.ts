import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";

// ─── Scan Permissions ────────────────────────────────────────────────────────

export const getAllVolunteers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  opportunity_id?: string | number;
  event_id?: string | number;
}) => apiClient.get("/all-volunteers/", { params }).then((r) => r.data);

export const getScanPermissionsList = (params?: {
  opportunity_id?: string | number;
  event_id?: string | number;
  search?: string;
  page?: number;
  limit?: number;
  download?: boolean;
}) => apiClient.get("/scan-permissions/list/", { params }).then((r) => r.data);

export const downloadScanPermissions = (params: {
  opportunity_id?: string | number;
  event_id?: string | number;
  search?: string;
  download?: boolean;
}): Promise<{ data: { downloadUrl: string } }> =>
  apiClient.get("/scan-permissions/list/", { params }).then((r) => r.data);

/**
 * One entry per requested user in the bulk-update `data[]`, in request order.
 * The backend `updateOrCreate`s on (user_id, opportunity_id/event_id), so
 * repeating a call updates the same row — `scan_permission_id` stays stable.
 */
export interface ScanPermissionBulkUpdateEntry {
  user_id: number;
  /** The persisted value — trust this over what was sent. */
  is_allowed: boolean;
  scan_permission_id: number;
}

export const bulkUpdateScanPermissions = (data: {
  user_ids: number[];
  is_allowed: boolean;
  opportunity_id?: string | number;
  event_id?: string | number;
}): Promise<ApiResponse<ScanPermissionBulkUpdateEntry[]>> =>
  apiClient.post("/scan-permissions/bulk-update/", data).then((r) => r.data);

// ─── Attendance (QR scan + manual) ───────────────────────────────────────────

export const markVolunteerAttendance = (data: {
  opportunity_id?: string | number;
  event_id?: string | number;
  volunteer_uuid?: string;
  volunteer_ids?: string[];
  attendance_date?: string;
}) => apiClient.post("/volunteer-attendance/scan/", data).then((r) => r.data);

/**
 * Marks a registered volunteer present without a QR scan. Runs alongside
 * `markVolunteerAttendance` (the scan flow) rather than replacing it — the
 * organizer picks whichever fits. `total_hours` is optional; omitting it makes
 * the backend derive the hours from the opportunity's duration.
 *
 * The volunteer is identified by any one of `user_id` / `registration_id` /
 * `volunteer_uuid`.
 */
export const markManualVolunteerAttendance = (data: {
  opportunity_id: string | number;
  user_id?: string | number;
  registration_id?: string | number;
  volunteer_uuid?: string;
  attendance_date?: string;
  total_hours?: number;
}) => apiClient.post("/volunteer-attendance/manual/", data).then((r) => r.data);

/** Corrects the logged hours on an attendance record — manual or QR alike. */
export const updateVolunteerAttendanceHours = ({
  attendance_id,
  total_hours,
}: {
  attendance_id: string | number;
  total_hours: number;
}) =>
  apiClient
    .patch(`/volunteer-attendance/${attendance_id}/hours/`, { total_hours })
    .then((r) => r.data);

/**
 * Reverses a check-in and returns the hours to the volunteer's balance. The
 * same volunteer can then be checked in again for the same day with corrected
 * hours — that re-check-in is the point of the endpoint.
 */
export const undoVolunteerAttendance = (attendance_id: string | number) =>
  apiClient
    .post(`/volunteer-attendance/${attendance_id}/undo/`)
    .then((r) => r.data);

/**
 * Admin-only: reopens a closed check-in window, either by extending it
 * `extra_hours` past its current end or by naming an explicit `reopen_until`
 * timestamp. Non-admins get a 403.
 */
export const reopenOpportunityCheckIn = ({
  opportunity_id,
  extra_hours,
  reopen_until,
}: {
  opportunity_id: string | number;
  extra_hours?: number;
  reopen_until?: string;
}) =>
  apiClient
    .post(
      `/admin/volunteer-opportunities/${opportunity_id}/reopen-check-in/`,
      reopen_until ? { reopen_until } : { extra_hours }
    )
    .then((r) => r.data);

export const scanQRCode = (data: any) =>
  apiClient.post("/scan-qr/", data).then((r) => r.data);
