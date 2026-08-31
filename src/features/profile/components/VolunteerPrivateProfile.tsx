"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Loader from "@/components/ui/Loader";
import Title from "@/components/shared/Title";
import { getPublicProfile } from "@/features/profile/services/profileApi";
import { getDefaultProfileImage } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

interface ProfileData {
  nickname?: string;
  manual_id?: string;
  full_name?: string;
  occupation?: string;
  field_of_experience?: string;
  interest_display?: string[];
  health_concerns?: string;
  facebook_link?: string;
  twitter_link?: string;
  whatsapp_link?: string;
  linkedin_link?: string;
  instagram_link?: string;
  profile_pic?: string;
  total_volunteer_hours?: number;
  total_opportunities?: number;
  total_certificates?: number;
  opportunities_organized?: number;
  gender_display?: {
    id: number;
    choice_type: string;
    value_en: string;
    value_ar: string;
  };
}

/**
 * Backend sends decimal hours (7.5); the design shows them verbatim rather than
 * converting the fraction to minutes.
 */
const convertDecimalHoursToDisplay = (
  decimalHours: number | null | undefined
): string => {
  if (decimalHours === null || decimalHours === undefined) {
    return "0";
  }
  return decimalHours.toString();
};

function badgeImage(name?: string) {
  switch (name) {
    case "Gold Badge":
      return asset("profile/badge.svg");
    case "Silver Badge":
      return asset("profile/silver_badge.svg");
    case "Super Gold Badge":
      return asset("profile/super_gold_badge.svg");
    case "Bronze Badge":
      return asset("profile/bronze_badge.svg");
    default:
      return null;
  }
}

export default function VolunteerPrivateProfile({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

  // Fetch profile data using the same API as CommonProfile
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => getPublicProfile(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!isLoading && data?.data?.is_public) {
      router.replace(`/public-profile/${id}`);
    }
  }, [isLoading, data, router, id]);

  if (isLoading) return <Loader />;
  if (!data) return null;

  // Handle error state
  if (error) {
    console.error("Error loading profile data:", error);
    return (
      <div className="text-center py-10">
        <p className="text-red-500">
          Failed to load profile data. Please try again later.
        </p>
      </div>
    );
  }

  // Get profile data from the response
  const profileData: ProfileData = data?.data?.profile_data || {
    total_volunteer_hours: 0,
    total_opportunities: 0,
    total_certificates: 0,
    opportunities_organized: 0,
  };
  // Get badge_info from the response (at data.data.badge_info)
  const badge_info = data?.data?.badge_info;
  const badgeSrc = badgeImage(badge_info?.name);

  const defaultImage = getDefaultProfileImage(
    profileData.gender_display?.value_en,
    asset("profile/male_profile.svg"),
    asset("profile/female_profile.svg"),
    asset("profile/org_profile.svg")
  );

  return (
    <div className="border-t border-[#000]">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
        <div className="2xl:px-5 px-3 mobilescreen:px-0 2xl:pt-[70px] laptopmain:2xl:pt-[40px] lg:pt-[40px] md:pt-[40px] mobilescreen:pt-[40px]">
          <div className="border-b border-[#000]/20">
            <div
              className={`relative ${
                selectedLanguage === "ar"
                  ? "2xl:right-[8%] lg:right-[4%] md:right-[2%] right-0"
                  : "2xl:left-[8%] lg:left-[4%] md:left-[2%] left-0"
              } mobilescreen:items-center flex items-center pb-[40px] lg:pb-[70px] md:pb-[40px] px-[75px] md:px-[0px] lg:gap-[100px] md:gap-[60px] mobilescreen:flex-col mobilescreen:px-0 mobilescreen:gap-8`}
            >
              <div className="mobilescreen:w-full flex items-center gap-[50px] mobilescreen:flex-col mobilescreen:gap-8 mobilescreen:items-center">
                <div className="relative w-[168px] h-[168px]">
                  <Image
                    src={profileData.profile_pic || defaultImage}
                    alt="Profile"
                    fill
                    unoptimized
                    className="rounded-full border-[5px] border-[#29246D] object-cover"
                  />
                </div>

                <div className="mobilescreen:w-full flex xsl:gap-10 xs:gap-12 xss:gap-4 extrasmall:gap-[22px]">
                  <div className="mobilescreen:w-full details">
                    <h3 className="text-primary-5 font-bold text-lg mobilescreen:text-[16px] xss:text-sm">
                      {t("COMMON.NICKNAME")}
                    </h3>
                    <p className="text-primary-5 font-normal xss:text-sm">
                      {profileData.nickname}
                    </p>
                    <h3 className="text-primary-5 font-bold pt-[40px] mobilescreen:pt-5">
                      {t("COMMON.ID")}
                    </h3>
                    <p
                      className={`text-primary-5 font-normal xss:text-xs xs:w-[120px] break-words ${
                        selectedLanguage === "ar" ? "xss:pt-[3px]" : ""
                      }`}
                    >
                      {profileData.manual_id}
                    </p>
                  </div>
                  {badgeSrc && (
                    <>
                      <div className="h-[120px] w-[2px] bg-[#000000]/20 hidden mobilescreen:flex xs:relative" />
                      <div className="mobilescreen:w-full flex-col items-center hidden mobilescreen:flex self-center">
                        <Image
                          src={badgeSrc}
                          alt={badge_info?.name || "badge"}
                          width={40}
                          height={40}
                          className="mobilescreen:w-[70px] mobilescreen:h-[70px]"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {badgeSrc && (
                <>
                  <div className="h-[176px] w-[1px] bg-[#000000]/20 mobilescreen:hidden" />

                  <div className="flex flex-col items-center mobilescreen:hidden">
                    <Image
                      src={badgeSrc}
                      alt={badge_info?.name || ""}
                      width={90}
                      height={90}
                      className="w-[90px] h-auto xss:w-[65px]"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="STATISTICS 2xl:px-5 px-3 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]">
          <h2 className="text-start flex">
            <Title text={t("COMMON.ACHIEVEMENT")} variant="default" />
          </h2>
          <div className="2xl:w-[85%] laptop:w-[85%] md:w-full laptopitm:w-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-2 gap-4">
              <div className="border-[3px] border-primary-501 p-4 items-center flex flex-col shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-tl-none rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px]">
                <Image
                  className="h-[60px] w-auto mb-2"
                  src={asset("profile/statistics/n_Volunteerhours.svg")}
                  alt="Volunteer hours"
                  width={60}
                  height={60}
                />
                <h3 className="text-[30px] font-bold text-primary-501">
                  {convertDecimalHoursToDisplay(
                    profileData?.total_volunteer_hours
                  )}
                </h3>
                <p className="text-primary-501 font-semibold 2xl:text-base lg:text-sm pt-2">
                  {t("COMMON.VOLUNTEER_HOURS-")}
                </p>
              </div>

              <div className="shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-[3px] border-primary-502 p-4 items-center flex flex-col rounded-tl-none rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px]">
                <div className="flex flex-col items-center">
                  <Image
                    className="h-[60px] w-auto mb-2 ml-[12px]"
                    src={asset(
                      "profile/statistics/n_VolunteerOpportunities.svg"
                    )}
                    alt="Volunteer opportunities"
                    width={60}
                    height={60}
                  />
                  <h3 className="text-[30px] font-bold text-primary-502">
                    {profileData?.total_opportunities || 0}
                  </h3>
                  <p className="text-primary-502 font-semibold 2xl:text-base lg:text-sm pt-2">
                    {t("COMMON.VOLUNTEER_OPPORTUNITIES-")}
                  </p>
                </div>
              </div>

              <div className="border-[3px] border-primary-503 p-4 items-center flex flex-col shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-tl-none rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px]">
                <div className="flex flex-col items-center">
                  <Image
                    className="h-[60px] w-auto mb-2"
                    src={asset("profile/statistics/n_Certificate.svg")}
                    alt="Certificate"
                    width={60}
                    height={60}
                  />
                  <h3 className="text-[30px] font-bold text-primary-503 text-center">
                    {profileData?.total_certificates || 0}
                  </h3>
                  <p className="text-primary-503 font-semibold 2xl:text-base lg:text-sm pt-2">
                    {t("COMMON.CERTIFICATE-")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
