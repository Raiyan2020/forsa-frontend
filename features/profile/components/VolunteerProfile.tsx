"use client";

import { useQuery } from "@tanstack/react-query";

import Loader from "@/components/ui/Loader";
import { getAccountInfo, getVolunteerProfile } from "@/features/services/api";
import { useAuthStore } from "@/store/authStore";
import ProfileDescriptionTabs from "./ProfileDescriptionTabs";
import VolunteerBackgroundInformation from "./VolunteerBackgroundInformation";
import VolunteerProfileInformation from "./VolunteerProfileInformation";

/**
 * The signed-in volunteer's own profile. Mirrors OrganizerProfile: identity and
 * avatar come from /account/, everything else from /volunteer-profile/, and the
 * opportunity / event history lives in the shared tabs.
 */
export default function VolunteerProfile() {
  const user = useAuthStore((s) => s.user);
  const authToken = user?.auth_token;

  const { data: volunteerProfileData, isLoading: isLoadingVolunteerProfile } =
    useQuery({
      queryKey: ["volunteer-profile"],
      queryFn: getVolunteerProfile,
      enabled: Boolean(authToken),
      refetchOnMount: "always",
    });

  const { data: accountInfoData, isLoading: isLoadingAccountInfo } = useQuery({
    queryKey: ["account-info"],
    queryFn: getAccountInfo,
    enabled: Boolean(authToken),
    refetchOnMount: "always",
  });

  if (isLoadingVolunteerProfile || isLoadingAccountInfo) return <Loader />;

  const account = accountInfoData?.data;
  const profile = volunteerProfileData?.data;

  // The account endpoint owns name and avatar; fall back to the signed-in user
  // so the header is never blank while a request is being refetched.
  const fullName =
    account?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  return (
    <div className="border-t border-[#000] opp-itm-shadow">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
        <VolunteerProfileInformation
          nickname={profile?.nickname}
          manual_id={account?.manual_id || user?.manual_id}
          profile_pic={account?.profile_pic || profile?.profile_pic}
          gender_display={profile?.gender_display}
          badge_info={profile?.badge_info}
        />
        <VolunteerBackgroundInformation
          full_name={fullName}
          occupation={profile?.occupation}
          interest_display={profile?.interest_display}
          health_concerns={profile?.health_concerns}
          facebook_link={profile?.facebook_link}
          twitter_link={profile?.twitter_link}
          whatsapp_link={profile?.whatsapp_link}
          instagram_link={profile?.instagram_link}
          linkedin_link={profile?.linkedin_link}
          total_volunteer_hours={profile?.total_volunteer_hours}
          total_opportunities={profile?.total_opportunities}
          total_certificates={profile?.total_certificates}
          statistics={profile?.statistics}
        />
        <ProfileDescriptionTabs isVolunteerTeam={false} />
      </div>
    </div>
  );
}
