import moment from "moment";

/**
 * How long after a session's scheduled end a volunteer may still scan the
 * departure code. The client's rule: an opportunity running 5 → 9 accepts the
 * leave scan until 11.
 *
 * It is a grace period, not an extension of the session: the two hours exist
 * because people leave the site and remember the code in the car park, not
 * because the opportunity ran longer. The hours credited for the day are the
 * backend's business (see BE-75) — this constant only governs the button.
 *
 * Deliberately not read from the payload: no field carries it today. When the
 * backend starts sending one (BE-75 asks for `self_check_out_closes_at`), read
 * that instead of recomputing, exactly as `checkInWindow.ts` prefers
 * `preparation_valid_until_at` over its own fallback.
 */
export const SELF_CHECK_OUT_GRACE_HOURS = 2;

export interface SelfCheckOutScheduleSource {
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  /**
   * Per-day schedule. When a row exists for the session's date its own times
   * win — a non-consecutive opportunity can in principle run different hours
   * on different days, even though the publish form currently writes the same
   * pair onto every row.
   */
  time_slots?:
    | {
        date?: string | null;
        start_time?: string | null;
        end_time?: string | null;
      }[]
    | null;
  /** BE-75: the server-computed deadline, preferred over anything derived here. */
  self_check_out_closes_at?: string | null;
}

export interface SelfCheckOutWindow {
  /**
   * Scheduled start of that session. Null when it cannot be derived — either
   * no `start_time` was published, or the deadline came from the server and
   * carries no start with it. The navbar scanner opens an hour before this.
   */
  sessionStartsAt: moment.Moment | null;
  /** Scheduled end of the session the pending check-out belongs to. */
  sessionEndsAt: moment.Moment | null;
  /** Last moment the departure code may be scanned, or null when unknown. */
  closesAt: moment.Moment | null;
  /** True while the scan is still allowed — and true when no deadline is known. */
  isOpen: boolean;
  /** True only when a deadline is known *and* it has passed. */
  hasClosed: boolean;
}

/** `"17:00"` / `"17:00:00"` onto a given day. Null for anything unparseable. */
function atTimeOfDay(
  day: moment.Moment,
  time?: string | null
): moment.Moment | null {
  if (!time) return null;

  const [rawHours, rawMinutes, rawSeconds] = String(time).split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes ?? 0);
  const seconds = Number(rawSeconds ?? 0);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return day.clone().startOf("day").add({
    hours,
    minutes,
    seconds: Number.isFinite(seconds) ? seconds : 0,
  });
}

/**
 * When the departure scan stops being offered.
 *
 * Anchored on **the day the volunteer checked in**, not on today, so an
 * evening session that ends at 23:00 still accepts a 00:30 scan: the pending
 * check-out belongs to yesterday's session, and pinning it to `now` would move
 * the deadline to the wrong day the moment midnight passed.
 *
 * Missing or unparseable times mean **no gate**. A deadline we cannot compute
 * must never silently take the button away — an opportunity with no `end_time`
 * would otherwise strand every volunteer on it.
 */
export function getSelfCheckOutWindow(
  item: SelfCheckOutScheduleSource | null | undefined,
  {
    checkedInAt,
    now = moment(),
  }: { checkedInAt?: string | null; now?: moment.Moment } = {}
): SelfCheckOutWindow {
  const open: SelfCheckOutWindow = {
    sessionStartsAt: null,
    sessionEndsAt: null,
    closesAt: null,
    isOpen: true,
    hasClosed: false,
  };

  if (!item) return open;

  // The backend's own answer wins outright once it sends one.
  if (item.self_check_out_closes_at) {
    const serverClosesAt = moment(item.self_check_out_closes_at);
    if (serverClosesAt.isValid()) {
      const hasClosed = now.isAfter(serverClosesAt);
      return {
        // The server sends a deadline, not a schedule — the session's start is
        // not recoverable from it, and guessing one would be worse than null.
        sessionStartsAt: null,
        sessionEndsAt: serverClosesAt
          .clone()
          .subtract(SELF_CHECK_OUT_GRACE_HOURS, "hours"),
        closesAt: serverClosesAt,
        isOpen: !hasClosed,
        hasClosed,
      };
    }
  }

  const checkedIn = checkedInAt ? moment(checkedInAt) : null;
  const sessionDay = checkedIn?.isValid() ? checkedIn : now;

  const slot = item.time_slots?.find(
    (entry) => entry?.date && moment(entry.date).isSame(sessionDay, "day")
  );

  const startTime = slot?.start_time ?? item.start_time;
  const endTime = slot?.end_time ?? item.end_time;

  let sessionEndsAt = atTimeOfDay(sessionDay, endTime);
  if (!sessionEndsAt) return open;

  /*
   * An overnight session — 21:00 → 01:00 — stores an end that is numerically
   * before its start, so the naive combination lands it 20 hours in the past
   * and every scan looks late. Rolling it to the next day is the only reading
   * that makes sense of the pair.
   */
  const sessionStartsAt = atTimeOfDay(sessionDay, startTime);
  if (sessionStartsAt && sessionEndsAt.isSameOrBefore(sessionStartsAt)) {
    sessionEndsAt = sessionEndsAt.add(1, "day");
  }

  const closesAt = sessionEndsAt
    .clone()
    .add(SELF_CHECK_OUT_GRACE_HOURS, "hours");
  const hasClosed = now.isAfter(closesAt);

  return { sessionStartsAt, sessionEndsAt, closesAt, isOpen: !hasClosed, hasClosed };
}
