"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { getDefaultProfileImage } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

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

interface VolunteerProfileInformationProps {
  nickname?: string;
  manual_id?: string | number;
  profile_pic?: string | null;
  gender_display?: {
    id?: number;
    choice_type?: string;
    value_en?: string;
    value_ar?: string;
  };
  badge_info?: {
    id: number;
    name: string;
  } | null;
}

/**
 * Header block of the volunteer's own profile: photo, nickname, member id and
 * the earned badge. The organizer counterpart is OrganizerProfileInformation —
 * same layout, but it shows a license number and has no gender-based fallback
 * avatar.
 */
export default function VolunteerProfileInformation({
  nickname,
  manual_id,
  profile_pic,
  gender_display,
  badge_info,
}: VolunteerProfileInformationProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const badgeSrc = badgeImage(badge_info?.name);

  const defaultImage = getDefaultProfileImage(
    gender_display?.value_en,
    asset("profile/male_profile.svg"),
    asset("profile/female_profile.svg"),
    asset("profile/org_profile.svg")
  );

  return (
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
                src={profile_pic || defaultImage}
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
                  {nickname}
                </p>
                <h3 className="text-primary-5 font-bold pt-[40px] mobilescreen:pt-5">
                  {t("COMMON.ID")}
                </h3>
                <p
                  className={`text-primary-5 font-normal xss:text-xs xs:w-[120px] break-words ${
                    selectedLanguage === "ar" ? "xss:pt-[3px]" : ""
                  }`}
                >
                  {manual_id}
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
  );
}
