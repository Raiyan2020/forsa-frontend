"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import Title from "@/components/shared/Title";
import { healthConcernOptions, occupationOptions } from "@/data/Constants";
import { useLanguageStore } from "@/store/languageStore";

const asset = (path: string) => `/assets/${path}`;

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

/**
 * Class names are spelled out in full rather than interpolated — Tailwind only
 * extracts literal strings, so `border-${x}` would never make it into the CSS.
 */
const STAT_COLORS = {
  hours: { border: "border-primary-501", text: "text-primary-501" },
  opportunities: { border: "border-primary-502", text: "text-primary-502" },
  certificates: { border: "border-primary-503", text: "text-primary-503" },
} as const;

interface LocalizedValue {
  id: number;
  value_en: string;
  value_ar: string;
}

interface VolunteerBackgroundInformationProps {
  full_name?: string;
  occupation?: string;
  interest_display?: LocalizedValue[];
  health_concerns?: string;
  instagram_link?: string | null;
  facebook_link?: string | null;
  whatsapp_link?: string | null;
  linkedin_link?: string | null;
  twitter_link?: string | null;
  /** Flat counters, used when the response carries no `statistics` object. */
  total_volunteer_hours?: number;
  total_opportunities?: number;
  total_certificates?: number;
  statistics?: {
    all_time?: {
      total_hours?: number;
      total_opportunities?: number;
      total_certificates?: number;
    };
  };
  /** The public profile hides health concerns. */
  isPublicProfile?: boolean;
}

function StatCard({
  icon,
  alt,
  value,
  label,
  color,
}: {
  icon: string;
  alt: string;
  value: string | number;
  label: string;
  color: keyof typeof STAT_COLORS;
}) {
  const { border, text } = STAT_COLORS[color];
  return (
    <div
      className={`xl:h-[210px] lg:h-[195px] md:h-[210px] msscreen1:h-[190px] miniscreen10:h-[190px] border-[3px] ${border} p-4 items-center flex flex-col shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-tl-none rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px]`}
    >
      <div className="flex flex-col items-center">
        <Image
          className="h-[60px] w-auto mb-2"
          src={icon}
          alt={alt}
          width={60}
          height={60}
        />
        <h3 className={`text-[30px] font-bold ${text} text-center`}>{value}</h3>
        <p
          className={`${text} font-semibold 2xl:text-base lg:text-sm pt-2 text-center`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

/**
 * "About me" plus the achievement counters on the volunteer's own profile. The
 * organizer counterpart is OrganizerBackgroundInformation.
 */
export default function VolunteerBackgroundInformation({
  full_name,
  occupation,
  interest_display,
  health_concerns,
  instagram_link,
  facebook_link,
  whatsapp_link,
  linkedin_link,
  twitter_link,
  total_volunteer_hours,
  total_opportunities,
  total_certificates,
  statistics,
  isPublicProfile = false,
}: VolunteerBackgroundInformationProps) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const localeKey = selectedLanguage === "ar" ? "name_ar" : "name_en";

  // The endpoint returns either a nested `statistics` block or flat counters.
  const stats = {
    volunteerHours:
      statistics?.all_time?.total_hours ?? total_volunteer_hours ?? 0,
    volunteerOpportunities:
      statistics?.all_time?.total_opportunities ?? total_opportunities ?? 0,
    certificates:
      statistics?.all_time?.total_certificates ?? total_certificates ?? 0,
  };

  const localizedOccupation = occupationOptions.find(
    (option) => option.value === occupation
  )?.[localeKey];

  const localizedHealthConcern = healthConcernOptions.find(
    (option) => option.value === health_concerns
  )?.[localeKey];

  const socialLinks: Array<[string | null | undefined, string, string]> = [
    [facebook_link, asset("profile/facebook.svg"), "Facebook"],
    [twitter_link, asset("profile/twitter.svg"), "X"],
    [whatsapp_link, asset("profile/whatsapp.svg"), "WhatsApp"],
    [instagram_link, asset("profile/instagram.svg"), "Instagram"],
    [linkedin_link, asset("profile/linkdin.svg"), "LinkedIn"],
  ];
  const hasSocialLinks = socialLinks.some(([href]) => Boolean(href));

  return (
    <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:pt-[70px] laptopmain:2xl:pt-[40px] lg:pt-[40px] md:pt-[40px] pt-[40px]">
      <div className="lg:flex mb-12 md:block mobilescreen:block">
        {/* Background Info */}
        <div className="2xl:w-1/2 laptopmain:w-1/2 lg:w-full mobilescreen:w-full">
          <h2 className="text-start flex">
            <Title text={t("COMMON.ABOUT.ME")} variant="default" />
          </h2>
          <div className="lg:w-[80%] mobilescreen:lg:w-full">
            <div className="flex flex-wrap gap-2 pb-5 items-center">
              <h3 className="text-primary-5 font-bold text-lg mobilescreen:text-[16px]">
                {t("COMMON.FULL_NAME")} :
              </h3>
              <span className="text-primary-5 text-lg">{full_name}</span>
            </div>

            {occupation && (
              <div className="flex flex-wrap gap-2 pb-5 items-center">
                <h3 className="text-primary-5 font-bold text-lg mobilescreen:text-[16px]">
                  {t("COMMON.ENTER.OCCIPATION")} :
                </h3>
                <span className="text-primary-5 text-lg">
                  {localizedOccupation}
                </span>
              </div>
            )}

            {!isPublicProfile && health_concerns && (
              <div className="flex flex-wrap gap-2 pb-5 items-center">
                <h3 className="text-primary-5 font-bold text-lg mobilescreen:text-[16px]">
                  {t("COMMON.HEALTH_CONCERN")} :
                </h3>
                <span className="text-primary-5 text-lg">
                  {localizedHealthConcern}
                </span>
                <div className="relative inline-block group">
                  <Image
                    src={asset("voluneteerevent/linkinfo.svg")}
                    alt={t("COMMON.HEALTH_CONCERN")}
                    width={20}
                    height={20}
                    className="cursor-pointer w-5 h-5"
                  />
                  <div
                    className={`absolute ${
                      selectedLanguage === "ar"
                        ? "right-full mr-2"
                        : "left-full ml-2"
                    } top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-[250px] z-50 p-3 xss:w-[220px] xs:w-[200px] xs:left-auto xs:right-0 xs:top-full xs:translate-y-0 xs:mt-2 ltr:xs:mr-0 ltr:xs:right-[-12px] rtl:xs:ml-0 rtl:xs:right-auto rtl:xs:left-[-24px]`}
                  >
                    {t("COMMON.HEALTH_CONCERN_INFO")}
                  </div>
                </div>
              </div>
            )}

            {interest_display && interest_display.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-5 items-start flex-col">
                <div>
                  <h3 className="text-primary-5 font-bold text-lg mobilescreen:text-[16px]">
                    {t("COMMON.INTEREST")}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 items-center rounded-[20px] border border-[#29246D] py-[12px] px-[17px]">
                  {interest_display.map((interest) => (
                    <Badge
                      key={interest.id}
                      variant="outline"
                      className="bg-[#eaeaf1] text-primary-5 rounded-full px-4 py-1 font-normal text-[15px]"
                    >
                      {selectedLanguage === "en"
                        ? interest.value_en
                        : interest.value_ar}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {hasSocialLinks && (
              <div>
                <h3 className="font-bold inline-block text-primary-5 text-lg laptopmain:text-xl xss:text-base">
                  {t("COMMON.SOCIAL_MEDIA")}
                </h3>
                <div className="mt-3 flex gap-3 lg:pb-0 md:pb-11 pb-11">
                  {socialLinks.map(([href, icon, label]) =>
                    href ? (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                      >
                        <Image
                          className="w-[31px] h-[31px]"
                          src={icon}
                          alt={label}
                          width={31}
                          height={31}
                        />
                      </a>
                    ) : null
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="2xl:w-[50%] laptopmain:w-1/2 w-full">
          <h2 className="text-start flex">
            <Title text={t("COMMON.ACHIEVEMENT")} variant="default" />
          </h2>

          <div className="grid 2xl:grid-cols-3 xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-3 mobilescreen:grid-cols-1 gap-[30px] mobilescreen:gap-5">
            <StatCard
              icon={asset("profile/statistics/n_Volunteerhours.svg")}
              alt="Volunteer hours"
              value={convertDecimalHoursToDisplay(stats.volunteerHours)}
              label={t("COMMON.VOLUNTEER_HOURS-")}
              color="hours"
            />
            <StatCard
              icon={asset("profile/statistics/n_VolunteerOpportunities.svg")}
              alt="Volunteer opportunities"
              value={stats.volunteerOpportunities}
              label={t("COMMON.VOLUNTEER_OPPORTUNITIES-")}
              color="opportunities"
            />
            <StatCard
              icon={asset("profile/statistics/n_Certificate.svg")}
              alt="Certificate"
              value={stats.certificates}
              label={t("COMMON.CERTIFICATE-")}
              color="certificates"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
