"use client";

import type { ReactNode } from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";

import type { CheckInWindow } from "@/features/opportunities/checkInWindow";
import { getCheckInCountdown } from "@/features/opportunities/checkInWindow";

/**
 * States how much longer attendance can be recorded, or that the window has
 * shut and only an admin can reopen it.
 *
 * Renders nothing for opportunities that need no check-in at all (workshops and
 * consultations, `requires_check_in: false`) — for those the whole attendance
 * surface is hidden, so a banner about it would be noise.
 */
export default function CheckInWindowBanner({
  window: checkInWindow,
  className = "",
  note,
}: {
  window: CheckInWindow;
  className?: string;
  /**
   * Rendered inside the frame, under the deadline. The participants list puts
   * the "70% qualifies them for a certificate" sentence here: it explains what
   * recording attendance *means*, so it belongs with the deadline for doing it
   * rather than as a loose paragraph underneath.
   */
  note?: ReactNode;
}) {
  const { t } = useTranslation();

  if (!checkInWindow.requiresCheckIn) return null;

  if (checkInWindow.isClosed) {
    return (
      <div
        className={`rounded-lg border border-[#D32F2F] bg-[#D32F2F]/10 px-4 py-3 text-[#D32F2F] text-sm ${className}`}
        role="status"
      >
        <span className="font-semibold">
          {t("COMMON.CHECK_IN_WINDOW_CLOSED")}
        </span>
        {note ? (
          <span className="block pt-2 font-normal text-secondary-102">
            {note}
          </span>
        ) : null}
      </div>
    );
  }

  if (!checkInWindow.endsAt) return null;

  const countdown = getCheckInCountdown(checkInWindow);

  return (
    <div
      className={`rounded-lg border border-primary-5 bg-primary-5/5 px-4 py-3 text-secondary-100 text-sm ${className}`}
      role="status"
    >
      {/*
        The deadline leads; the countdown is secondary.

        It used to read «تُغلق بعد ٦ أيام» — the time left from *today*, which
        the client read as "the window is 6 days long" and reported as a bug
        against the agreed 3 days. It is not: the backend closes attendance at
        `end_date + 72h` (`preparation_validity_hours`, verified), and the 6 was
        simply today-to-deadline while the opportunity was still running. Naming
        the date first removes the ambiguity without hardcoding "3", which is an
        admin-configurable setting we must not restate in the UI.
      */}
      <span className="font-semibold">
        {t("COMMON.CHECK_IN_WINDOW_UNTIL", {
          date: checkInWindow.endsAt.format("DD MMM YYYY, hh:mm A"),
        })}
      </span>{" "}
      <span className="text-secondary-102">
        {t("COMMON.CHECK_IN_WINDOW_REMAINING", { time: countdown })}
      </span>
      {/*
        The window's own length, said out loud. The countdown above is
        today-to-deadline, and the client twice read it as the length itself —
        "2 months left" on an opportunity that has not ended yet looks like a
        two-month window when the real one is three days after it finishes.

        Derived from the payload's own two dates, never hardcoded: the length
        is `config.preparation_validity_hours`, which an admin can change, and
        a "3 days" written into the copy would go stale silently the moment
        they did.
      */}
      {checkInWindow.windowDays !== null && (
        <span className="block pt-1 text-secondary-102">
          {/* `days`, not `count`: i18next treats `count` as a plural selector
              and would look for suffixed keys that do not exist — Arabic has
              six plural categories, so that misbehaves rather than falling
              back cleanly. */}
          {t("COMMON.CHECK_IN_WINDOW_LENGTH", {
            days: checkInWindow.windowDays,
          })}
        </span>
      )}
      {checkInWindow.wasReopened && (
        <span className="block pt-1 text-secondary-102">
          {t("COMMON.CHECK_IN_WINDOW_REOPENED")}
        </span>
      )}
      {note ? (
        <span className="block pt-2 text-secondary-102">{note}</span>
      ) : null}
    </div>
  );
}

/** Kept beside the banner so callers can re-render it on a timer if they want. */
export function checkInWindowRemaining(checkInWindow: CheckInWindow) {
  return checkInWindow.endsAt
    ? moment.duration(checkInWindow.endsAt.diff(moment())).asMilliseconds()
    : null;
}
