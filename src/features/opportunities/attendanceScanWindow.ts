import moment from "moment";
import {
  getSelfCheckOutWindow,
  type SelfCheckOutScheduleSource,
} from "@/features/opportunities/selfCheckOutWindow";

/**
 * How early the navbar scanner appears, relative to the session's scheduled
 * start. Volunteers arrive before the hour they were told, and the backend
 * accepts an arrival scan any time on the session's own date
 * (`isWithinPreparationWindow` is date-based), so opening the button early
 * costs nothing and matching the hour exactly would strand anyone who turns up
 * at 4:45 for a five o'clock start.
 */
export const SCAN_WINDOW_OPENS_HOURS_BEFORE = 1;

export interface AttendanceScanWindow {
  /** When the icon starts showing, or null when no start time was published. */
  opensAt: moment.Moment | null;
  /** When it stops — the departure grace deadline. Null when unknown. */
  closesAt: moment.Moment | null;
  isOpen: boolean;
}

/**
 * Whether *now* falls in the stretch where a participant could plausibly scan:
 * an hour before the session starts, until the departure grace period closes.
 * An opportunity running 5 → 9 is therefore scannable from 4 until 11.
 *
 * This is the navbar's gate, and the navbar knows less than the detail page
 * does: the listing endpoint sends a schedule but no `self_attendance`, so
 * there is no check-in timestamp to anchor on and "which session" can only
 * mean today's. That is the right reading for a live indicator — a pending
 * check-out from last night is yesterday's session, and the detail page owns
 * it.
 *
 * Both gates are deliberately permissive in the same direction: an opportunity
 * that published no times is treated as scannable all day rather than having
 * its button silently removed. The server is the authority on whether a scan
 * is accepted; hiding the icon is a convenience, never a control.
 */
export function getAttendanceScanWindow(
  item: SelfCheckOutScheduleSource | null | undefined,
  { now = moment() }: { now?: moment.Moment } = {}
): AttendanceScanWindow {
  const checkOut = getSelfCheckOutWindow(item, { now });

  const opensAt =
    checkOut.sessionStartsAt
      ?.clone()
      .subtract(SCAN_WINDOW_OPENS_HOURS_BEFORE, "hours") ?? null;

  const hasOpened = !opensAt || !now.isBefore(opensAt);

  return { opensAt, closesAt: checkOut.closesAt, isOpen: hasOpened && !checkOut.hasClosed };
}
