"use client";

import { useQuery } from "@tanstack/react-query";

import Loader from "@/components/ui/Loader";
import { getAccountInfo, getOrganizerProfile } from "@/features/services/api";
import { useAuthStore } from "@/store/authStore";
import OrganizerBackgroundInformation from "./OrganizerBackgroundInformation";
import OrganizerProfileInformation from "./OrganizerProfileInformation";
import ProfileDescriptionTabs from "./ProfileDescriptionTabs";

export default function OrganizerProfile() {
  const authToken = useAuthStore((s) => s.user?.auth_token);

  const {
    data: organizerProfileData,
    isLoading: isLoadingOrganizerProfile,
    refetch: refetchOrganizerProfile,
  } = useQuery({
    queryKey: ["organizer-profile"],
    queryFn: getOrganizerProfile,
    enabled: Boolean(authToken),
    refetchOnMount: "always",
  });

  const { data: accountInfoData, isLoading: isLoadingAccountInfo } = useQuery({
    queryKey: ["account-info"],
    queryFn: getAccountInfo,
    enabled: Boolean(authToken),
    refetchOnMount: "always",
  });

  if (isLoadingOrganizerProfile || isLoadingAccountInfo) return <Loader />;

  const profile = organizerProfileData?.data;

  return (
    <div className="border-t border-[#000] opp-itm-shadow">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
        <OrganizerProfileInformation
          profile_pic={accountInfoData?.data?.profile_pic}
          full_name={profile?.nickname}
          registration_number={profile?.license_number}
          onUpdateSuccess={() => refetchOrganizerProfile()}
          documents={profile?.documents}
          badge_info={profile?.badge_info}
        />
        <OrganizerBackgroundInformation
          company_name={profile?.company_name}
          interests={profile?.interest_display}
          instagram_link={profile?.instagram_link}
          whatsapp_link={profile?.whatsapp_link}
          facebook_link={profile?.facebook_link}
          twitter_link={profile?.twitter_link}
          linkedin_link={profile?.linkedin_link}
          isVolunteerTeam={profile?.is_volunteer_team}
          organization_hours={profile?.organization_hours}
          learn_opportunity_organized={profile?.learn_opportunity_organized}
          vol_opportunity_organized={profile?.vol_opportunity_organized}
          sponsored_count={profile?.sponsored_count}
        />
        <ProfileDescriptionTabs isVolunteerTeam={profile?.is_volunteer_team} />
      </div>
    </div>
  );
}
