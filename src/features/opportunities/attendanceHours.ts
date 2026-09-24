import moment from "moment";

import { SELF_CHECK_OUT_GRACE_HOURS } from "./selfCheckOutWindow";

/**
 * How many hours a day's attendance may carry, and what to offer the organizer
 * when a volunteer checked in and never scanned out.
 *
 * The client's rule, for a 5 → 9 session:
 * - A volunteer who arrived at 5:30 and forgot the departure scan is credited
 *   **arrival → session end** (3h 30m) by default.
 * - The organizer may adjust that either way, up to **two hours past the
 *   session's end**, counted from arrival: 5:30 → 11:00, so 5h 30m at most.
 * - A departure scan inside those two hours is credited in full — scanning in
 *   at 5:30 and out at 10:30 counts 5 hours.
 *
 * The two hours are the same two hours the departure scan stays open for, so
 * one constant serves both: time after the scan closes could never be credited
 * by a scan anyway.
 *
 * BE-91 asks the backend to send both numbers on each `attendances[]` entry
 * (`max_hours`, `suggested_hours`) and to enforce the cap itself; until then
 * they are derived here from the schedule the detail page forwarded.
 */
export const EXTRA_HOURS_AFTER_SESSION = SELF_CHECK_OUT_GRACE_HOURS;

export interface AttendanceScheduleSource {
  start_time?: string | null;
  end_time?: string | null;
  time_slots?:
    | {
        date?: string | null;
        start_time?: string | null;
        end_time?: string | null;
        hours?: number | null;
      }[]
    | null;
}

export interface SessionOnDate {
  startsAt: moment.Moment;
  endsAt: moment.Moment;
  /** Scheduled length in hours. */
  hours: number;
}

/** `"17:00"` / `"17:00:00"` onto a given day. Null for anything unparseable. */
function atTimeOfDay(day: moment.Moment, time?: string | null) {
  if (!time) return null;
  const [h, m, s] = String(time).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m ?? 0)) return null;
  return day
    .clone()
    .startOf("day")
    .add({ hours: h, minutes: m || 0, seconds: s || 0 });
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The session scheduled on `apiDate` (`YYYY-MM-DD`). A per-day slot wins over
 * the opportunity's own times; an end at or before the start rolls to the next
 * day, the same overnight reading `durationInHours()` uses on the backend.
 */
export function sessionOnDate(
  schedule: AttendanceScheduleSource | null | undefined,
  apiDate: string
): SessionOnDate | null {
  if (!schedule || !apiDate) return null;
  const day = moment(apiDate, "YYYY-MM-DD", true);
  if (!day.isValid()) return null;

  const slot = schedule.time_slots?.find((entry) => entry?.date === apiDate);
  const startsAt = atTimeOfDay(day, slot?.start_time ?? schedule.start_time);
  let endsAt = atTimeOfDay(day, slot?.end_time ?? schedule.end_time);
  if (!startsAt || !endsAt) return null;
  if (endsAt.isSameOrBefore(startsAt)) endsAt = endsAt.add(1, "day");

  const hours =
    typeof slot?.hours === "number"
      ? slot.hours
      : round2(endsAt.diff(startsAt, "minutes") / 60);

  return { startsAt, endsAt, hours };
}

/** When credit starts: arrival, but never before the session starts. */
function creditStartsAt(
  session: SessionOnDate,
  checkedInAt: string | null | undefined
): moment.Moment {
  const arrival = checkedInAt ? moment(checkedInAt) : null;
  return arrival?.isValid()
    ? moment.max(arrival, session.startsAt)
    : session.startsAt;
}

const hoursBetween = (from: moment.Moment, to: moment.Moment) =>
  Math.max(0, round2(to.diff(from, "minutes") / 60));

/**
 * Arrival → session end — the default for a forgotten departure scan. Arriving
 * early does not add time.
 */
export function suggestedHoursFromCheckIn(
  session: SessionOnDate | null,
  checkedInAt: string | null | undefined
): number | null {
  if (!session || !checkedInAt || !moment(checkedInAt).isValid()) return null;
  return hoursBetween(creditStartsAt(session, checkedInAt), session.endsAt);
}

/**
 * The most an organizer may credit for the day: arrival (or the session's
 * start, for a volunteer marked present by hand) → two hours past the end.
 */
export function maxCreditableHours(
  session: SessionOnDate | null,
  checkedInAt: string | null | undefined
): number | null {
  if (!session) return null;
  const until = session.endsAt
    .clone()
    .add(EXTRA_HOURS_AFTER_SESSION, "hours");
  return hoursBetween(creditStartsAt(session, checkedInAt), until);
}

/** 3.5 → `{ hours: 3, minutes: 30 }`, for showing a decimal as a duration. */
export function splitHours(value: number): { hours: number; minutes: number } {
  const totalMinutes = Math.round(value * 60);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
