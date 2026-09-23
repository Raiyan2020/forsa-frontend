"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/lib/api/errors";
import { NAV_STATE_KEYS, setNavState } from "@/lib/navigationState";
import { getVolunteerAttendanceCodes } from "@/features/opportunities/services/selfCheckIn";
import { useLanguageStore } from "@/store/languageStore";
import AttendanceQrModal from "../AttendanceQrModal";
import type { VolunteerOpportunityDetail } from "./types";
import { opportunityTitle, type VolunteerEventView } from "./volunteerEventView";

const LIST_BUTTON_CLASS =
  "xs4:w-[125px] 2xl:!text-lg xss:w-auto laptop:!w-full text-sm px-1 font-bold text-primary-5 border-b border-primary-5 xsmall:text-xs !rounded-[20px] md:h-[60px]";
const LIST_BUTTON_LABEL_CLASS =
  "xl:w-[140px] 2xl:w-[200px] lg:w-[95px] xsl:w-[150px] xss:w-[90px] smallscreen1:w-full smallscreen1:text-sm";
/** The creator's mobile "Scan QR" label has always been sized a touch differently. */
const SCAN_QR_LABEL_CLASS =
  "xl:w-[150px] lg:w-[95px] xsl:w-[150px] xss:w-[90px] smallscreen1:w-full smallscreen1:text-sm";

function PanelButton({
  onClick,
  mobile = false,
  labelClassName = LIST_BUTTON_LABEL_CLASS,
  children,
}: {
  onClick: () => void;
  /** The mobile rows let each button take the full width on the narrowest screens. */
  mobile?: boolean;
  labelClassName?: string;
  children: ReactNode;
}) {
  return (
    <Button
      variant="primary"
      size="medium"
      onClick={onClick}
      className={
        mobile
          ? `${LIST_BUTTON_CLASS} smallscreen1:w-full smallscreen1:text-sm`
          : LIST_BUTTON_CLASS
      }
    >
      <span className={labelClassName}>{children}</span>
    </Button>
  );
}

interface AttendancePanelProps {
  data: VolunteerOpportunityDetail;
  view: Pick<
    VolunteerEventView,
    | "isCreator"
    | "checkInWindow"
    | "canManageAttendance"
    | "canGenerateAttendanceQr"
    | "canShowScanPermission"
    | "canShowScanQR"
  >;
}

/**
 * The organizer's attendance controls — volunteer list, the printed QR pair,
 * scan delegation — and, for a volunteer they delegated to, the scanner.
 *
 * Two layouts: one row on desktop / tablet, two stacked rows on mobile. A
 * delegated scanner who is not the creator gets only the mobile scanner,
 * because scanning is something done with a phone in hand.
 */
export default function AttendancePanel({ data, view }: AttendancePanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const [showQr, setShowQr] = useState(false);

  const id = String(data.id);

  /**
   * BE-61 — the organizer's printable pair. Fetched only once the dialog is
   * open: the call is idempotent but *creates* the codes on first use, so
   * there is no reason to mint them for someone merely viewing the page.
   */
  const codesQuery = useQuery({
    queryKey: ["volunteer-attendance-codes", id],
    queryFn: () => getVolunteerAttendanceCodes(id),
    enabled: showQr,
    staleTime: Infinity,
  });

  const {
    isCreator,
    checkInWindow,
    canManageAttendance,
    canGenerateAttendanceQr,
    canShowScanPermission,
    canShowScanQR,
  } = view;

  if (!canManageAttendance && !canShowScanQR) return null;

  const goToVolunteerList = () => {
    // The volunteer list's contract. `requires_check_in` used to ride along
    // too, but the detail endpoint never sends it for volunteering, and
    // `setNavState` JSON-encodes — an undefined key was already being dropped.
    setNavState(NAV_STATE_KEYS.registerList, {
      id: data.id,
      opportunity_status: data.opportunity_status,
      // Manual attendance runs alongside QR; the backend owns the deadline.
      manual_tracking: checkInWindow.manualEnabled && checkInWindow.isOpen,
      qr_attendance_enabled: data.qr_attendance_enabled,
      manual_attendance_enabled: data.manual_attendance_enabled,
      preparation_valid_until: data.preparation_valid_until,
      preparation_valid_until_at: data.preparation_valid_until_at,
      is_preparation_window_closed: data.is_preparation_window_closed,
      preparation_reopened_until: data.preparation_reopened_until,
      // Deleting registrations locks from the start *day*. Deliberately not
      // the server's `has_started`, which flips at the start *time* — that
      // would reopen deletion for the morning of the first day.
      disableDeleteAfterPeriod: moment().isAfter(
        moment(data.start_date).startOf("day")
      ),
      start_date: data.start_date,
      end_date: data.end_date,
      start_time: data.start_time,
      end_time: data.end_time,
      participants_needed: data.participants_needed,
      // BE-69 — who is looking. `can_manage_attendance` covers the organizer
      // and a granted volunteer; `is_creator` separates them, since only the
      // organizer may grant the permission on.
      is_creator: isCreator,
      can_manage_attendance: data.can_manage_attendance ?? isCreator,
    });
    router.push("/volunteerlist");
  };

  const goToScanPermission = () => {
    setNavState(NAV_STATE_KEYS.scanPermission, {
      id: data.id,
      opportunity_status: data.opportunity_status,
    });
    router.push("/scan-permission");
  };

  const goToScanner = () => router.push(`/scan-qr?opportunity_id=${id}`);

  const title = opportunityTitle(data);
  const codes = codesQuery.data?.data;

  return (
    <>
      <div
        className={`w-[100%] flex flex-col items-center relative bg-[#E5E5E5] md:bottom-[50px] msscreen1:bottom-[70px] mdscreen:bottom-[75px] bottom-[50px] pt-[50px] lg:bottom-[100px] px-5 2xl:pb-[70px] lg:pb-[40px] pb-[40px] ${
          !isCreator && canShowScanQR ? "hidden miniscreen9:flex" : ""
        }`}
      >
        {/* Desktop / tablet — no scanner here; scanning is a phone task. */}
        {canManageAttendance && (
          <div className="flex gap-5 items-center extrasmall:gap-[10px] miniscreen9:hidden flex-wrap justify-center w-full">
            <PanelButton onClick={goToVolunteerList}>
              {t("COMMON.LIST_OF_VOLUNTEERS")}
            </PanelButton>
            {/* BE-61 — the real self check-in QR. «التحضير الذاتي QR» beside it
                is the *delegation* screen for the organizer-scans-volunteer
                flow the client retired; it stays until that flow's kill
                switch is flipped, which is a coordinated release. */}
            {canGenerateAttendanceQr && (
              <PanelButton onClick={() => setShowQr(true)}>
                {t("COMMON.ATTENDANCE_QR")}
              </PanelButton>
            )}
            {canShowScanPermission && (
              <PanelButton onClick={goToScanPermission}>
                {t("COMMON.SCAN_PERMISSION")}
              </PanelButton>
            )}
          </div>
        )}

        {/* Mobile — two rows. */}
        {canManageAttendance && (
          <div className="hidden smallscreen1:!flex-col miniscreen9:flex miniscreen9:flex-row flex-col gap-2 w-fit min-w-[0] relative">
            <div className="flex miniscreen9:block items-start justify-start gap-x-2 smallscreen:gap-x-2 pb-2 smallscreen1:pb-0">
              <PanelButton mobile onClick={goToVolunteerList}>
                {t("COMMON.LIST_OF_VOLUNTEERS")}
              </PanelButton>
              {canGenerateAttendanceQr && (
                <PanelButton mobile onClick={() => setShowQr(true)}>
                  {t("COMMON.ATTENDANCE_QR")}
                </PanelButton>
              )}
            </div>

            {canShowScanPermission && (
              <div className="smallscreen1:flex-col smallscreen1:gap-2 flex items-start justify-start w-full gap-x-2 smallscreen:gap-x-2">
                <PanelButton mobile onClick={goToScanPermission}>
                  {t("COMMON.SCAN_PERMISSION")}
                </PanelButton>
                {checkInWindow.isOpen && (
                  <PanelButton
                    mobile
                    onClick={goToScanner}
                    labelClassName={SCAN_QR_LABEL_CLASS}
                  >
                    {t("COMMON.SCAN_QR_CODE")}
                  </PanelButton>
                )}
              </div>
            )}
          </div>
        )}

        {/* Delegated scanner (not the creator) — mobile only. */}
        {canShowScanQR && (
          <div className="hidden miniscreen9:flex flex-col gap-2 w-full min-w-[0] relative items-center">
            <Button
              variant="primary"
              size="medium"
              onClick={goToScanner}
              className="w-full 2xl:!text-lg smallscreen1:text-sm text-sm px-4 font-bold text-primary-5 border-b border-primary-5 !rounded-[20px] md:h-[60px]"
            >
              <span className="w-full text-center smallscreen1:text-sm">
                {t("COMMON.SCAN_QR_CODE")}
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* BE-61 — the organizer's two printed sheets. */}
      <AttendanceQrModal
        open={showQr}
        onClose={() => setShowQr(false)}
        title={t("COMMON.ATTENDANCE_QR")}
        instructions={t("COMMON.ATTENDANCE_QR_INSTRUCTIONS")}
        isLoading={codesQuery.isLoading}
        error={
          codesQuery.isError
            ? getApiErrorMessage(codesQuery.error, language) ||
              t("COMMON.TOAST.ATTENDANCE_QR_FAILED")
            : null
        }
        sheets={
          codes
            ? [
                { code: codes.check_in.code, label: t("COMMON.CHECK_IN_QR"), caption: title },
                { code: codes.check_out.code, label: t("COMMON.CHECK_OUT_QR"), caption: title },
              ]
            : []
        }
      />
    </>
  );
}
