"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import SelfScanModal from "@/features/opportunities/components/SelfScanModal";
import { useLiveAttendanceScans } from "@/features/opportunities/hooks/useLiveAttendanceScans";
import {
  learnServeSelfScan,
  volunteerSelfScan,
} from "@/features/opportunities/services/selfCheckIn";
import { getApiErrorMessages, isApiSuccess } from "@/lib/api/errors";
import { useLanguageStore } from "@/store/languageStore";

function QrIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM19 19h2M19 14h2v2M14 19v2h2" />
    </svg>
  );
}

/**
 * The navbar attendance scanner.
 *
 * A participant registered in something happening right now gets a QR button in
 * the header and records arrival or departure without navigating to the
 * opportunity first. Same camera, same endpoints as the detail page — only the
 * entry point is new.
 *
 * **It deliberately knows nothing about which opportunity it is scanning
 * into.** Since BE-78 B the scan endpoint takes `code` alone and derives both
 * the opportunity and the direction from the scanned string, so there is
 * nothing to look up before the camera opens and nothing for the participant to
 * pick from when they are registered in two things at once. The code they are
 * about to scan is the answer to both questions.
 *
 * The one thing it does need to know is *whether to appear at all*, which is
 * `useLiveAttendanceScans`.
 *
 * Volunteering and learn & serve are different endpoints, and the button cannot
 * tell which it is holding until the scan lands, so it tries the volunteering
 * one first and falls through to learn & serve when the code is not one of its
 * own. That costs a wasted request only for learn & serve participants, who
 * scan once ever.
 */
export default function AttendanceScanButton({
  enabled,
  mobile = false,
}: {
  enabled: boolean;
  mobile?: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const scans = useLiveAttendanceScans(enabled);

  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /** Is any of the live sessions a learn & serve one? */
  const mayBeLearnServe = scans.some((scan) => scan.kind === "learn_serve");
  const mayBeVolunteering = scans.some((scan) => scan.kind === "volunteer");

  if (!enabled || scans.length === 0) return null;

  const handleScan = async (code: string) => {
    setSubmitting(true);
    try {
      if (mayBeVolunteering) {
        try {
          const response = await volunteerSelfScan({ code });
          if (isApiSuccess(response)) {
            // The direction the server settled on, read back off the record
            // rather than predicted — there is nothing to predict it from here.
            const recordedDeparture = Boolean(response.data?.checked_out_at);
            toast.success(
              recordedDeparture
                ? t("COMMON.TOAST.CHECK_OUT_RECORDED")
                : t("COMMON.TOAST.CHECK_IN_RECORDED")
            );
            setScanning(false);
            return;
          }
          throw new Error("scan rejected");
        } catch (error) {
          // Only fall through when a learn & serve code is actually plausible;
          // otherwise this is a real failure and the volunteering error is the
          // one worth showing.
          if (!mayBeLearnServe) throw error;
        }
      }

      await learnServeSelfScan({ code });
      toast.success(t("COMMON.TOAST.ATTENDANCE_RECORDED"));
      setScanning(false);
    } catch (error) {
      /*
       * Rethrown so the camera stays up. From the navbar the likeliest failure
       * is pointing at the wrong sheet entirely — a second attempt at another
       * code fixes it, reopening the dialog does not.
       */
      const messages = getApiErrorMessages(error, language);
      if (messages.length > 0) messages.forEach((m) => toast.error(m));
      else toast.error(t("COMMON.TOAST.SELF_SCAN_FAILED"));
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setScanning(true)}
        aria-label={t("COMMON.SCAN_ATTENDANCE_QR")}
        title={t("COMMON.SCAN_ATTENDANCE_QR")}
        className="relative text-primary-5 focus:outline-none"
      >
        <QrIcon className={mobile ? "w-[35px] h-[35px]" : "w-10 h-10"} />
        {/* A live session is the whole reason the button is here, so it says so
            rather than looking like one more permanent navbar icon. */}
        <span
          className="absolute top-[3px] ltr:right-[3px] rtl:left-[3px] w-2 h-2 rounded-full bg-orange-500"
          aria-hidden="true"
        />
      </button>

      <SelfScanModal
        open={scanning}
        onClose={() => setScanning(false)}
        title={t("COMMON.SCAN_ATTENDANCE_QR")}
        hint={t("COMMON.SCAN_ATTENDANCE_HINT")}
        onScan={handleScan}
        isPending={submitting}
      />
    </>
  );
}
