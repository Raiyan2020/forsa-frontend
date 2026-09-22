import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";

/**
 * BE-61 — self check-in QR.
 *
 * Two different mechanisms behind one idea, so they are deliberately not shared:
 *
 * | | Volunteering | Learn & serve |
 * |---|---|---|
 * | codes | **two**, IN and OUT | **one** |
 * | lifetime | permanent — the organizer prints them once | **2 hours** from issuance |
 * | issued | any time after creation (`GET`, idempotent) | **on the last day only** (`POST`, mutating) |
 * | a scan records | a timestamp, and real worked hours | `is_attended`, nothing more |
 *
 * The API returns the **raw payload string**, never an image — rendering the QR
 * is ours (`react-qr-code`), as is decoding it from the camera (`jsqr`).
 */

// ─── Volunteering: two permanent printed codes ───────────────────────────────

export interface VolunteerAttendanceCode {
  direction: "in" | "out";
  code: string;
}

export interface VolunteerAttendanceCodes {
  check_in: VolunteerAttendanceCode;
  check_out: VolunteerAttendanceCode;
}

/**
 * Creator-only. Idempotent: the server generates the pair once and returns the
 * same strings on every later call, so a sheet printed in March still scans in
 * September.
 */
export const getVolunteerAttendanceCodes = (
  id: string
): Promise<ApiResponse<VolunteerAttendanceCodes>> =>
  apiClient.get(`/volunteer-opportunities/${id}/attendance-qr/`).then((r) => r.data);

/**
 * The volunteer's own scan.
 *
 * **`direction` is optional (BE-78 B).** Omit it and the server resolves the
 * scanned string against both code columns and takes the direction from
 * whichever matched — which is the honest reading, since the two columns hold
 * distinct values and the code has always identified its own direction. A
 * caller that does not already know whether this is an arrival or a departure
 * (the navbar scanner) should leave it out rather than guess.
 *
 * Passing it explicitly still narrows the lookup to that one column, so an IN
 * code sent as `"out"` reads as an invalid code. The detail page passes it
 * because it holds `self_attendance.next_action` anyway.
 */
export const volunteerSelfScan = (payload: {
  code: string;
  direction?: "in" | "out";
}): Promise<ApiResponse<VolunteerSelfScanResult>> =>
  apiClient.post("/volunteer-attendance/self-scan/", payload).then((r) => r.data);

/**
 * What a scan returns. `checked_out_at` is the direction the server settled on,
 * read back: non-null means the departure was just recorded.
 */
export interface VolunteerSelfScanResult {
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  self_check_out_closes_at?: string | null;
  total_hours?: number | string | null;
}

// ─── Learn & serve: one code, last day, two hours ────────────────────────────

export interface LearnServeAttendanceCode {
  code: string;
  expires_at: string;
}

/**
 * Creator-only, and **mutating** — each call issues a fresh code and invalidates
 * the previous one, so it belongs behind a deliberate click, not a page load.
 * Refused unless today is the opportunity's last day, and always for an
 * internship (manual attendance only, by the client's decision).
 */
export const issueLearnServeAttendanceCode = (
  id: string
): Promise<ApiResponse<LearnServeAttendanceCode>> =>
  apiClient.post(`/learn-serve-opportunities/${id}/attendance-qr/`).then((r) => r.data);

/** One scan, no direction: it flips `is_attended` and nothing else. */
export const learnServeSelfScan = (payload: {
  code: string;
}): Promise<ApiResponse<unknown>> =>
  apiClient.post("/learn-serve-attendance/self-scan/", payload).then((r) => r.data);
