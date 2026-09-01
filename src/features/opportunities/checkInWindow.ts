import moment from "moment";

/**
 * The attendance ("preparation") window: how long after an opportunity ends its
 * organizer can still mark volunteers present.
 *
 * The backend owns the deadline — the default moved from 48 to 72 hours and is
 * now admin-configurable, so nothing here recomputes it. We read the fields it
 * sends and only fall back to a local guess for records predating them.
 *
 * Field precedence for the deadline:
 *   1. `preparation_reopened_until` — an admin reopened a closed window
 *   2. `preparation_valid_until_at` — hour-precise, the one to prefer
 *   3. `preparation_valid_until`    — date only, so treated as end-of-day
 *   4. end_date + 72h               — legacy fallback only
 */

export interface CheckInWindowSource {
  start_date?: string | null;
  end_date?: string | null;
  preparation_valid_until?: string | null;
  preparation_valid_until_at?: string | null;
  is_preparation_window_closed?: boolean | null;
  preparation_reopened_until?: string | null;
  requires_check_in?: boolean | null;
  qr_attendance_enabled?: boolean | null;
  manual_attendance_enabled?: boolean | null;
  manual_tracking?: boolean | null;
}

export interface CheckInWindow {
  /** End of the window, or null when nothing in the payload pins it down. */
  endsAt: moment.Moment | null;
  /** True once the window has shut — the backend's flag wins when it is sent. */
  isClosed: boolean;
  /** True while attendance may actually be recorded. */
  isOpen: boolean;
  /** An admin extended this window past its original deadline. */
  wasReopened: boolean;
  /** False for workshops and consultations, which need no check-in at all. */
  requiresCheckIn: boolean;
  /** QR scanning is offered for this opportunity. */
  qrEnabled: boolean;
  /** Marking someone present by hand is offered for this opportunity. */
  manualEnabled: boolean;
}

/** Legacy fallback matching the backend's current default of 72 hours. */
const FALLBACK_WINDOW_HOURS = 72;

export function getCheckInWindow(
  item: CheckInWindowSource | null | undefined,
  now: moment.Moment = moment()
): CheckInWindow {
  // Only `false` opts out; a missing field means the older payload shape, where
  // every opportunity needed a check-in.
  const requiresCheckIn = item?.requires_check_in !== false;

  if (!item) {
    return {
      endsAt: null,
      isClosed: false,
      isOpen: false,
      wasReopened: false,
      requiresCheckIn,
      qrEnabled: false,
      manualEnabled: false,
    };
  }

  const wasReopened = Boolean(item.preparation_reopened_until);

  let endsAt: moment.Moment | null = null;
  if (item.preparation_reopened_until) {
    endsAt = moment(item.preparation_reopened_until);
  } else if (item.preparation_valid_until_at) {
    endsAt = moment(item.preparation_valid_until_at);
  } else if (item.preparation_valid_until) {
    // Date-only value, so the window runs to the end of that day.
    endsAt = moment(item.preparation_valid_until).endOf("day");
  } else if (item.end_date) {
    endsAt = moment(item.end_date).endOf("day").add(FALLBACK_WINDOW_HOURS, "hours");
  }

  if (endsAt && !endsAt.isValid()) endsAt = null;

  // A reopened window overrides a stale `is_preparation_window_closed: true`.
  const closedByBackend =
    !wasReopened && item.is_preparation_window_closed === true;
  const isClosed =
    closedByBackend || (endsAt ? now.isSameOrAfter(endsAt) : false);

  // Attendance cannot be taken before the opportunity itself starts.
  const hasStarted = item.start_date
    ? now.isSameOrAfter(moment(item.start_date).startOf("day"))
    : true;

  const isOpen = requiresCheckIn && hasStarted && !isClosed;

  return {
    endsAt,
    isClosed,
    isOpen,
    wasReopened,
    requiresCheckIn,
    // Absent flags keep the pre-existing behaviour: QR was always available,
    // manual needed an explicit opt-in.
    qrEnabled: requiresCheckIn && item.qr_attendance_enabled !== false,
    manualEnabled:
      requiresCheckIn &&
      (item.manual_attendance_enabled ?? item.manual_tracking ?? false),
  };
}

/**
 * Human-readable time left in the window, e.g. "2 days" / "5 hours". Returns
 * null once the window has closed or when there is no deadline to count to.
 */
export function getCheckInCountdown(
  window: CheckInWindow,
  now: moment.Moment = moment()
): string | null {
  if (!window.endsAt || window.isClosed) return null;
  return moment.duration(window.endsAt.diff(now)).humanize();
}
