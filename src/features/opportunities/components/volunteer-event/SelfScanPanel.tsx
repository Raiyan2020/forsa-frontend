"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessages } from "@/lib/api/errors";
import { getSelfCheckOutWindow } from "@/features/opportunities/selfCheckOutWindow";
import { volunteerSelfScan } from "@/features/opportunities/services/selfCheckIn";
import { useLanguageStore } from "@/store/languageStore";
import SelfScanModal from "../SelfScanModal";
import type { VolunteerOpportunityDetail } from "./types";

interface SelfScanPanelProps {
  data: VolunteerOpportunityDetail;
  isCreator: boolean;
  /** Called after a scan lands, so the page re-reads `self_attendance`. */
  onRecorded: () => void;
}

/**
 * BE-61 — the participant's own scanner, pointed at the organizer's printed
 * code.
 *
 * Deliberately separate from the attendance-management block, which is gated
 * on being the creator or a delegated scanner; this one belongs to the
 * participant. `self_attendance` is null unless the backend sees the viewer as
 * registered, so it doubles as the registration check.
 */
export default function SelfScanPanel({
  data,
  isCreator,
  onRecorded,
}: SelfScanPanelProps) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const [open, setOpen] = useState(false);
  const scanMutation = useMutation({ mutationFn: volunteerSelfScan });

  const selfAttendance = data.self_attendance;
  /** Once `next_action` is "done" both scans are in and the button retires. */
  const direction =
    selfAttendance?.next_action === "in" || selfAttendance?.next_action === "out"
      ? selfAttendance.next_action
      : null;

  /*
   * The departure scan closes at the session's end plus the grace period —
   * an opportunity running 5 → 9 accepts it until 11.
   *
   * The server's `self_check_out_closes_at` (BE-75 B) wins outright: it reads
   * the admin-editable `self_check_out_grace_hours`, which no local constant
   * can see. The derivation it replaces stays as the fallback, anchored on
   * `checked_in_at` so a 23:00 session still accepts a 00:30 scan.
   */
  const scheduleSource = {
    ...data,
    self_check_out_closes_at: selfAttendance?.self_check_out_closes_at ?? null,
  };
  const checkOutWindow = () =>
    getSelfCheckOutWindow(scheduleSource, {
      checkedInAt: selfAttendance?.checked_in_at,
    });
  const checkOut = checkOutWindow();

  const isDeparture = direction === "out";
  const departureClosed = isDeparture && checkOut.hasClosed;
  const closesAtLabel = checkOut.closesAt?.format("hh:mm A") ?? "";
  /*
   * Hours stop at the scheduled end even though the scan is accepted for two
   * hours past it (BE-75 C). Said next to the deadline, because "you have
   * until 11" alone reads as "scanning at 10:45 pays until 10:45".
   */
  const countedUntilLabel = checkOut.sessionEndsAt?.format("hh:mm A") ?? "";

  const canScan =
    !isCreator && Boolean(selfAttendance) && direction !== null && !departureClosed;

  if (!canScan && !departureClosed) return null;

  const handleScan = async (code: string) => {
    if (!direction) return;

    /*
     * Re-checked at scan time, not only at render: nothing re-renders this
     * page on a timer, so someone who opened it at 10:00 and scans at 11:05
     * would be looking at a button the deadline has already retired.
     * Returning (not throwing) closes the camera — re-scanning cannot help
     * once the window is shut.
     */
    if (direction === "out") {
      const fresh = checkOutWindow();
      if (fresh.hasClosed) {
        toast.error(
          t("COMMON.CHECK_OUT_GRACE_EXPIRED", {
            time: fresh.closesAt?.format("hh:mm A") ?? "",
          })
        );
        return;
      }
    }

    try {
      await scanMutation.mutateAsync({ code, direction });
      toast.success(
        direction === "in"
          ? t("COMMON.TOAST.CHECK_IN_RECORDED")
          : t("COMMON.TOAST.CHECK_OUT_RECORDED")
      );
      onRecorded();
    } catch (error) {
      // Rethrown so the camera stays up: pointing at the wrong sheet is fixed
      // by pointing somewhere else, not by reopening the dialog.
      const messages = getApiErrorMessages(error, language);
      if (messages.length > 0) messages.forEach((m) => toast.error(m));
      else toast.error(t("COMMON.TOAST.SELF_SCAN_FAILED"));
      throw error;
    }
  };

  return (
    <>
      <div className="flex w-full flex-col items-center gap-2 px-5 pb-10">
        {canScan && (
          <Button
            variant="primary"
            size="medium"
            onClick={() => setOpen(true)}
            className="w-full max-w-[320px] !rounded-[20px]"
          >
            {direction === "in"
              ? t("COMMON.SCAN_CHECK_IN_QR")
              : t("COMMON.SCAN_CHECK_OUT_QR")}
          </Button>
        )}

        {/* Said out loud while the grace period is still running. */}
        {canScan && isDeparture && closesAtLabel && (
          <p className="max-w-[420px] text-center text-sm text-secondary-102">
            {t("COMMON.CHECK_OUT_GRACE_UNTIL", {
              time: closesAtLabel,
              endTime: countedUntilLabel,
            })}
          </p>
        )}

        {/* Missed it. The record is still open and an organizer can close it
            by hand, so the message points there rather than leaving a
            checked-in volunteer with no next step. */}
        {departureClosed && (
          <p className="max-w-[420px] text-center text-sm font-semibold text-[#D32F2F]">
            {t("COMMON.CHECK_OUT_GRACE_EXPIRED", { time: closesAtLabel })}
          </p>
        )}
      </div>

      <SelfScanModal
        open={open}
        onClose={() => setOpen(false)}
        title={
          direction === "in"
            ? t("COMMON.SCAN_CHECK_IN_QR")
            : t("COMMON.SCAN_CHECK_OUT_QR")
        }
        hint={
          direction === "in"
            ? t("COMMON.SCAN_CHECK_IN_HINT")
            : t("COMMON.SCAN_CHECK_OUT_HINT")
        }
        onScan={handleScan}
        isPending={scanMutation.isPending}
      />
    </>
  );
}
