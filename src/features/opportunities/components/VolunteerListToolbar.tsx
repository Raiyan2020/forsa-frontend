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
  onOpenTeamModal: () => void;
  onOpenRoleModal: () => void;
  onOpenFilterModal: () => void;
  onSearchChange: (value: string) => void;
  checkInWindow: CheckInWindow;
}

/** Page title, team/role shortcuts, search + date filter, and the check-in banner/QR button. */
export default function VolunteerListToolbar({
  opportunityId,
  opportunity_start_date,
  opportunity_end_date,
  selectedDate,
  effectiveEndDate,
  onDateChange,
  onOpenTeamModal,
  onOpenRoleModal,
  onOpenFilterModal,
  onSearchChange,
  checkInWindow,
}: VolunteerListToolbarProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <div className="flex justify-between items-center mobilescreen:flex-col mobilescreen:gap-4">
        <h2 className="2xl:text-[40px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-5 font-bold">
          {t("COMMON.LIST_TITLE")}
        </h2>{" "}
        <div className="flex gap-6 extrasmall:gap-2">
          <Button
            onClick={onOpenTeamModal}
            variant="primary"
            size="medium"
            className="extrasmall:!w-[115px]"
          >
            {t("COMMON.TEAM")}
          </Button>
          <Button
            onClick={onOpenRoleModal}
            variant="primary"
            size="medium"
            className="extrasmall:!w-[115px]"
          >
            {t("COMMON.ROLE")}
          </Button>
        </div>
      </div>

      <div className="mobilescreen:w-[100%] flex justify-center pt-12 pb-12">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-center w-full max-w-4xl">
          <div className="w-full lg:w-auto flex-1">
            <Searchbar onFilterClick={onOpenFilterModal} onSearchChange={onSearchChange} />
          </div>
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
        </div>
      </div>

      {/* How long is left to record attendance, or that the window shut. */}
      <CheckInWindowBanner window={checkInWindow} className="mb-6 max-w-2xl mx-auto" />

      {checkInWindow.requiresCheckIn && (
        <div className="flex justify-center mb-6">
          <div className="mx-auto px-4 md:px-6 lg:px-8">
            <p className="text-center mobilescreen:text-[18px] mediumscreen3:text-[18px] text-[24px] text-[#181822CC]/70 leading-relaxed mb-4">
              {t("COMMON.CONFIRM_ATTENDANCE")}
            </p>
            {/* QR and manual are offered together — the organizer picks. */}
            {checkInWindow.qrEnabled && checkInWindow.isOpen && (
              <div className="flex justify-center">
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
          </div>
        </div>
      )}
    </>
  );
}
