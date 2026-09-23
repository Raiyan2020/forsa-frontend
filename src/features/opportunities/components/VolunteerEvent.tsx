"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Loader from "@/components/ui/Loader";
import { SponsorsClient } from "@/features/home";
import {
  getOpportunityButtonState,
  isOpportunityButtonActionable,
} from "@/features/shared/opportunityButtonState";
import { useAuthStore } from "@/store/authStore";
import AttendancePanel from "./volunteer-event/AttendancePanel";
import CompletionGallery from "./volunteer-event/CompletionGallery";
import LicenseCard from "./volunteer-event/LicenseCard";
import OpportunityDescription from "./volunteer-event/OpportunityDescription";
import OpportunityFacts from "./volunteer-event/OpportunityFacts";
import OpportunityHeader, { ViewerActionButton } from "./volunteer-event/OpportunityHeader";
import OpportunitySchedule from "./volunteer-event/OpportunitySchedule";
import OrganizerCard from "./volunteer-event/OrganizerCard";
import RegistrationFlowModals, {
  type RegistrationStep,
} from "./volunteer-event/RegistrationFlowModals";
import RejectionNotice from "./volunteer-event/RejectionNotice";
import SelfScanPanel from "./volunteer-event/SelfScanPanel";
import SponsorsCard from "./volunteer-event/SponsorsCard";
import { useVolunteerOpportunity } from "./volunteer-event/useVolunteerOpportunity";
import { deriveVolunteerEventView } from "./volunteer-event/volunteerEventView";

/**
 * `/volunteer-event-detail/{id}` — one volunteering opportunity.
 *
 * This file is composition only. What the page *shows* is decided by
 * `deriveVolunteerEventView` (a pure function of the payload and the viewer);
 * each section in `./volunteer-event/` renders one part of it and owns its own
 * dialogs and mutations. The one piece of state left here is which step of the
 * registration flow is open, because the Register button that starts it
 * appears twice — once in the header, once below the details on a phone.
 */
export default function VolunteerEvent({
  opportunityId,
  organizationId,
}: {
  opportunityId: string;
  organizationId?: string;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [registrationStep, setRegistrationStep] =
    useState<RegistrationStep | null>(null);

  const { data, isLoading, refetch } = useVolunteerOpportunity(opportunityId);

  // No data after loading is a 404 on its way to `/404` (the hook redirects),
  // or a failed request. Neither has anything to show.
  if (isLoading || !data) return <Loader />;

  const view = deriveVolunteerEventView(data, {
    id: user?.id,
    signedIn: Boolean(user),
    hasAuthToken: Boolean(user?.auth_token),
    isVerified: user?.is_verified === true,
    userType: user?.user_type,
  });

  /**
   * Where the registration flow starts for this viewer. Only viewers reach it —
   * the creator's Edit / Repost is its own control in the icon row.
   */
  const handleRegisterClick = () => {
    // Started / Ended / Full / Closed never open a flow. The button is
    // disabled for them already; this also guards any other caller.
    if (!isOpportunityButtonActionable(getOpportunityButtonState(data))) return;

    if (!user?.auth_token) {
      setRegistrationStep("login");
      return;
    }
    if (user.is_banned === true && !data.is_registered) {
      toast.error(t("COMMON.BANNED_USER_CANNOT_REGISTER"));
      return;
    }
    setRegistrationStep(
      data.is_registered ? "unregister" : data.total_roles > 0 ? "roles" : "confirm"
    );
  };

  return (
    <div className="w-full">
      <RegistrationFlowModals
        step={registrationStep}
        onStepChange={setRegistrationStep}
        opportunityId={opportunityId}
        organizationId={organizationId}
        opportunityDetails={{
          title_ar: data.title_ar,
          title_en: data.title_en,
          start_date: data.start_date,
        }}
        refetch={refetch}
      />

      <div className="w-[90%] mobilescreen:w-[100%] py-[40px] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] lg:mx-0 md:mx-auto mx-auto">
        <div className="grid grid-cols-1 2xl:grid-cols-[470px_auto] xl:grid-cols-[435px_auto] lg:grid-cols-[380px_auto] 2xl:gap-[69px] gap-0 lg:gap-[30px] md:gap-6">
          {/* Organizer column */}
          <div>
            <div>
              <OrganizerCard data={data} isCreator={view.isCreator} />
              <LicenseCard image={data.license_image} />
              <SponsorsCard sponsors={data.opportunity_sponsor_images} />
              <SelfScanPanel data={data} isCreator={view.isCreator} onRecorded={refetch} />
              <AttendancePanel data={data} view={view} />
            </div>
          </div>

          {/* Details column */}
          <div className="lg:pt-[70px] md:pt-0 mobilescreen:pt-0">
            <div className="mobilescreen:w-[90%] mobilescreen:mx-auto">
              <OpportunityHeader
                data={data}
                view={view}
                onRegisterClick={handleRegisterClick}
                onChanged={refetch}
              />

              {view.isRejected && <RejectionNotice reason={data.rejected_reason} />}

              <OpportunitySchedule data={data} />

              <div className="border-b mb-6">
                <OpportunityFacts data={data} />
                {/* The phone copy of the header's Register button. */}
                <div className="hidden xss:block">
                  <ViewerActionButton
                    view={view}
                    onClick={handleRegisterClick}
                    className="whitespace-nowrap mb-9 w-full !h-14 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <OpportunityDescription data={data} />
              <CompletionGallery data={data} isCreator={view.isCreator} onChanged={refetch} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border pt-[40px] 2xl:pt-[70px] laptopmain:pt-[50px] laptop:pt-[40px] lg:pt-[40px]">
        <SponsorsClient />
      </div>
    </div>
  );
}
