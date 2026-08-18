"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import Title from "@/components/shared/Title";
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

interface BackgroundInformationProps {
  company_name?: string;
  sector_display?: {
    id: number;
    choice_type: string;
    value_en: string;
    value_ar: string;
  } | null;
  interests?: {
    id: number;
    value_en: string;
    value_ar: string;
  }[];
  instagram_link?: string | null;
  facebook_link?: string | null;
  whatsapp_link?: string | null;
  linkedin_link?: string | null;
  twitter_link?: string | null;
  isVolunteerTeam?: boolean;
  organization_hours?: number | null;
  learn_opportunity_organized?: number | null;
  vol_opportunity_organized?: number | null;
  sponsored_count?: number | null;
}

/**
 * Class names are spelled out in full rather than interpolated — Tailwind only
 * extracts literal strings, so `border-${x}` would never make it into the CSS.
 */
const STAT_COLORS = {
  hours: { border: "border-primary-501", text: "text-primary-501" },
  volunteer: { border: "border-primary-502", text: "text-primary-502" },
  learnServe: { border: "border-primary-503", text: "text-primary-503" },
  sponsored: { border: "border-primary-504", text: "text-primary-504" },
} as const;

function StatCard({
  icon,
  alt,
  value,
  label,
  color,
  heightClass,
  labelHeightClass = "",
}: {
  icon: string;
  alt: string;
  value: string | number;
  label: string;
  color: keyof typeof STAT_COLORS;
  heightClass: string;
  labelHeightClass?: string;
}) {
  const { border, text } = STAT_COLORS[color];
  return (
    <div
      className={`${heightClass} border-[3px] ${border} p-4 items-center flex flex-col shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] rounded-tl-none rounded-tr-[40px] rounded-bl-[40px] rounded-br-[40px]`}
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
          className={`${text} font-semibold 2xl:text-base lg:text-sm pt-2 text-center ${labelHeightClass}`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

export default function OrganizerBackgroundInformation({
  company_name,
  sector_display,
  interests,
  instagram_link,
  facebook_link,
  whatsapp_link,
  linkedin_link,
  twitter_link,
  isVolunteerTeam = false,
  organization_hours,
  learn_opportunity_organized,
  vol_opportunity_organized,
  sponsored_count,
}: BackgroundInformationProps) {
  const { t } = useTranslation();
  const currentLanguage = useLanguageStore((s) => s.language);

  const socialLinks: Array<[string | null | undefined, string, string]> = [
    [facebook_link, asset("profile/facebook.svg"), "Facebook"],
    [twitter_link, asset("profile/twitter.svg"), "X"],
    [whatsapp_link, asset("profile/whatsapp.svg"), "WhatsApp"],
    [instagram_link, asset("profile/instagram.svg"), "Instagram"],
    [linkedin_link, asset("profile/linkdin.svg"), "LinkedIn"],
  ];
  const hasSocialLinks = socialLinks.some(([href]) => Boolean(href));

  // Team profiles hide the "sponsored" card, so their cards are slightly taller.
  const cardHeight = isVolunteerTeam
    ? "xl:h-[210px] lg:h-[210px] md:h-[230px] msscreen1:h-[215px] miniscreen10:h-[230px] xss3:h-[230px]"
    : "xl:h-[210px] lg:h-[210px] md:h-[210px] msscreen1:h-[215px] miniscreen10:h-[210px] xss3:h-[230px]";
  const labelHeight = isVolunteerTeam ? "" : "h-[60px]";

  return (
    <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:pt-[70px] laptopmain:2xl:pt-[40px] lg:pt-[40px] md:pt-[40px] pt-[40px]">
      <div className="lg:flex md:block gap-8 mb-12">
        {/* Background Info */}
        <div className="2xl:w-1/2 laptopmain:w-1/2 lg:w-full mobilescreen:w-full">
          <h2 className="flex">
            <Title text={t("COMMON.ABOUT.ME")} variant="default" />
          </h2>
          <div className="lg:w-[80%]">
            <div className="pb-5 items-center">
              <h3 className="font-bold inline-block text-primary-5 text-lg laptopmain:text-xl xss:text-base">
                {t("COMMON.COMPANYNAME")} :
              </h3>
              <span className="text-primary-5 text-lg xss:text-base">
                {company_name}
              </span>
            </div>

            {sector_display && (
              <div className="pb-5 items-center">
                <h3 className="font-bold inline-block text-primary-5 text-lg laptopmain:text-xl xss:text-base">
                  {t("COMMON.SECTOR")} :
                </h3>
                <span className="text-primary-5 text-lg xss:text-base">
                  {currentLanguage === "en"
                    ? sector_display.value_en
                    : sector_display.value_ar}
                </span>
              </div>
            )}

            {interests && interests.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-5 items-start flex-col">
                <div>
                  <h3 className="text-primary-5 font-bold text-lg mobilescreen:text-[16px]">
                    {t("COMMON.INTEREST")}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 items-center rounded-[20px] border border-[#29246D] py-[12px] px-[17px]">
                  {interests.map((interest) => (
                    <Badge
                      key={interest.id}
                      variant="outline"
                      className="bg-[#eaeaf1] text-primary-5 rounded-full px-4 py-2 font-normal xss:text-base"
                    >
                      {currentLanguage === "en"
                        ? interest.value_en
                        : interest.value_ar}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {hasSocialLinks && (
              <div className="pb-5 items-center">
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
                        className="text-primary-5"
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
        <div
          className={`laptopmain:w-[80%] w-full ${
            isVolunteerTeam ? "2xl:w-[70%]" : "2xl:w-[45%]"
          }`}
        >
          <h2 className="flex">
            <Title text={t("COMMON.ACHIEVEMENT")} variant="default" />
          </h2>
          <div
            className={
              isVolunteerTeam
                ? "grid 2xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-3 mobilescreen:grid-cols-1 gap-[30px] mobilescreen:gap-5"
                : "grid grid-cols-2 xss:grid-cols-1 gap-[30px] xss:gap-5"
            }
          >
            <StatCard
              icon={asset("profile/statistics/n_Volunteerhours.svg")}
              alt="Volunteer hours"
              value={convertDecimalHoursToDisplay(organization_hours)}
              label={t("COMMON.VOLUNTEER_HOURS-")}
              color="hours"
              heightClass={cardHeight}
              labelHeightClass={labelHeight}
            />
            <StatCard
              icon={asset("profile/statistics/n_volunteer_organization.svg")}
              alt="Volunteer opportunities"
              value={vol_opportunity_organized || 0}
              label={t("COMMON.VOLUNTEER_OPPORTUNITIES-")}
              color="volunteer"
              heightClass={cardHeight}
              labelHeightClass={labelHeight}
            />
            {/* Hours and volunteer opportunities always show, even at zero;
                development and sponsorship only once they have a value. */}
            {(learn_opportunity_organized ?? 0) > 0 && (
              <StatCard
                icon={asset("profile/statistics/n_learnServeicn.svg")}
                alt="Development opportunities"
                value={learn_opportunity_organized || 0}
                label={t("COMMON.OPPORTUNITIESORGANIZED--")}
                color="learnServe"
                heightClass={cardHeight}
                labelHeightClass={labelHeight}
              />
            )}
            {!isVolunteerTeam && (sponsored_count ?? 0) > 0 && (
              <StatCard
                icon={asset("profile/statistics/n_sponseredbyus.svg")}
                alt="Sponsored"
                value={sponsored_count || 0}
                label={t("COMMON.SPONSERED.ORGANIZED")}
                color="sponsored"
                heightClass={cardHeight}
                labelHeightClass={labelHeight}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
