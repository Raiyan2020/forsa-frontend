"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import DateRangePicker from "@/components/ui/DateRangePicker";
import Searchbar from "@/components/ui/Searchbar";
import CheckInWindowBanner from "./CheckInWindowBanner";
import type { CheckInWindow } from "@/features/opportunities/checkInWindow";

interface VolunteerListToolbarProps {
  opportunityId: string | undefined;
  opportunity_start_date: string | undefined;
  opportunity_end_date: string | undefined;
  selectedDate: string;
  effectiveEndDate: string;
  onDateChange: (date: string) => void;
  onOpenRoleModal: () => void;
  onOpenFilterModal: () => void;
  onSearchChange: (value: string) => void;
  onOpenAddVolunteer: () => void;
  /** Disabled once the opportunity already has everyone it asked for. */
  addVolunteerDisabled?: boolean;
  onSendCertificates: () => void;
  sendCertificatesDisabled?: boolean;
  onDownloadSheet: () => void;
  downloadDisabled?: boolean;
  checkInWindow: CheckInWindow;
}

/**
 * Page title, the organizer's action row, the check-in banner, and the
 * search/date/export row.
 *
 * Laid out to the client's mockup: the four actions sit together under the
 * title, the sentence explaining *why* attendance matters comes before the
 * window banner rather than after it, and export moved up beside the filters
 * from the bottom of the page.
 *
 * «الفريق» is gone from here and from the table — the client dropped teams
 * entirely, roles are the only grouping now.
 */
export default function VolunteerListToolbar({
  opportunityId,
  opportunity_start_date,
  opportunity_end_date,
  selectedDate,
  effectiveEndDate,
  onDateChange,
  onOpenRoleModal,
  onOpenFilterModal,
  onSearchChange,
  onOpenAddVolunteer,
  addVolunteerDisabled = false,
  onSendCertificates,
  sendCertificatesDisabled = false,
  onDownloadSheet,
  downloadDisabled = false,
  checkInWindow,
}: VolunteerListToolbarProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <div className="flex flex-col items-center gap-6">
        <h2 className="2xl:text-[40px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-5 font-bold">
          {t("COMMON.LIST_TITLE")}
        </h2>

        {/*
          Wraps rather than scrolling: four medium buttons do not fit one phone
          row, and an organizer needs all of them reachable.

          «إذن تحضير» is deliberately absent — it is not the existing
          `/scan-permission` screen renamed, it is a new permission that lets a
          volunteer add volunteers and set their hours, and no endpoint exists
          for it yet (BE-67). Shipping a dead button would be worse than
          shipping three live ones.
        */}
        <div className="flex flex-wrap justify-center gap-4 extrasmall:gap-2">
          <Button
            onClick={onSendCertificates}
            variant="primary"
            size="medium"
            disabled={sendCertificatesDisabled}
            className="extrasmall:!w-[115px]"
          >
            {t("COMMON.SEND_CERTIFICATES")}
          </Button>
          <Button
            onClick={onOpenRoleModal}
            variant="primary"
            size="medium"
            className="extrasmall:!w-[115px]"
          >
            {t("COMMON.ADD_ROLE")}
          </Button>
          <Button
            onClick={onOpenAddVolunteer}
            variant="primary"
            size="medium"
            disabled={addVolunteerDisabled}
            className="extrasmall:!w-[115px]"
          >
            {t("COMMON.ADD_VOLUNTEER")}
          </Button>
        </div>
      </div>

      {/* Why attendance matters, then the deadline for doing it — in that order,
          so the banner reads as the consequence of the sentence above it. */}
      {checkInWindow.requiresCheckIn && (
        <p className="mx-auto max-w-3xl pt-8 text-center mobilescreen:text-[16px] text-[18px] text-[#181822CC]/70 leading-relaxed">
          {t("COMMON.CONFIRM_ATTENDANCE")}
        </p>
      )}

      <CheckInWindowBanner
        window={checkInWindow}
        className="mt-4 mb-6 max-w-2xl mx-auto"
      />

      {/* QR stays its own affordance under the banner — it is an alternative to
          the manual roster below, not a filter. */}
      {checkInWindow.requiresCheckIn &&
        checkInWindow.qrEnabled &&
        checkInWindow.isOpen && (
          <div className="flex justify-center mb-6">
            <Button
              variant="secondary"
              size="medium"
              onClick={() =>
                router.push(`/scan-qr?opportunity_id=${opportunityId}`)
              }
            >
              {t("COMMON.SCAN_QR_CODE")}
            </Button>
          </div>
        )}

      <div className="mobilescreen:w-[100%] flex justify-center pt-4 pb-12">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-center w-full max-w-5xl">
          <Button
            variant="primary"
            size="medium"
            className="w-full lg:w-auto shrink-0 gap-2"
            onClick={onDownloadSheet}
            disabled={downloadDisabled}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/voluneteerevent/downloadsheet.svg" alt="" />
            {t("COMMON.SHEET")}
          </Button>
          {opportunity_start_date && opportunity_end_date && (
            <div className="w-full lg:w-auto flex-1">
              <DateRangePicker
                selectedDate={selectedDate}
                startDate={opportunity_start_date}
                endDate={effectiveEndDate}
                onDateChange={onDateChange}
                placeholder={t("COMMON.DATES")}
              />
            </div>
          )}
          <div className="w-full lg:w-auto flex-1">
            <Searchbar
              onFilterClick={onOpenFilterModal}
              onSearchChange={onSearchChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}
