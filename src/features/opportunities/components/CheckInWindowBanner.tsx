"use client";

import moment from "moment";
import { useTranslation } from "react-i18next";

import type { CheckInWindow } from "@/lib/checkInWindow";
import { getCheckInCountdown } from "@/lib/checkInWindow";

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
}: {
  window: CheckInWindow;
  className?: string;
}) {
  const { t } = useTranslation();

  if (!checkInWindow.requiresCheckIn) return null;

  if (checkInWindow.isClosed) {
    return (
      <div
        className={`rounded-lg border border-[#D32F2F] bg-[#D32F2F]/10 px-4 py-3 text-[#D32F2F] text-sm font-semibold ${className}`}
        role="status"
      >
        {t("COMMON.CHECK_IN_WINDOW_CLOSED")}
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
      <span className="font-semibold">
        {t("COMMON.CHECK_IN_WINDOW_CLOSES_IN", { time: countdown })}
      </span>{" "}
      <span className="text-secondary-102">
        {/* Hour-precise, because the deadline is a timestamp rather than a date */}
        {checkInWindow.endsAt.format("DD MMM YYYY, hh:mm A")}
      </span>
      {checkInWindow.wasReopened && (
        <span className="block pt-1 text-secondary-102">
          {t("COMMON.CHECK_IN_WINDOW_REOPENED")}
        </span>
      )}
    </div>
  );
}

/** Kept beside the banner so callers can re-render it on a timer if they want. */
export function checkInWindowRemaining(checkInWindow: CheckInWindow) {
  return checkInWindow.endsAt
    ? moment.duration(checkInWindow.endsAt.diff(moment())).asMilliseconds()
    : null;
}
