"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import Searchbar from "@/components/ui/Searchbar";
import Title from "@/components/shared/Title";
import ProfileFilterForm, {
  EMPTY_PROFILE_FILTERS,
  FiltersData,
} from "./ProfileFilterForm";
import {
  getAllOpportunities,
  getPublicProfile,
  getUserCertificates,
  getUserOpportunities,
} from "@/features/services/api";
import { occupationOptions } from "@/data/Constants";
import { formatDateRange, getDefaultProfileImage } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";

interface LocalizedValue {
  id?: string | number;
  value_en?: string;
  value_ar?: string;
}

interface ProfileStatistics {
  all_time?: {
    total_hours?: number;
    total_opportunities?: number;
    total_certificates?: number;
    opportunities_organized?: number;
  };
}

interface ProfileData {
  id: string | number;
  nickname?: string;
  full_name?: string;
  manual_id?: string;
  profile_pic?: string | null;
  registration_number?: string;
  documents?: Array<{ id: string; document: string }>;
  company_name?: string;
  sector_display?: LocalizedValue | null;
  interest_display?: LocalizedValue[];
  occupation?: string;
  experience?: string;
  gender_display?: LocalizedValue;
  facebook_link?: string | null;
  twitter_link?: string | null;
  whatsapp_link?: string | null;
  instagram_link?: string | null;
  linkedin_link?: string | null;
  organization_hours?: number | null;
  learn_opportunity_organized?: number | null;
  vol_opportunity_organized?: number | null;
  sponsored?: number | null;
  total_volunteer_hours?: number;
  total_opportunities?: number;
  total_certificates?: number;
  opportunities_organized?: number;
  statistics?: ProfileStatistics;
}

interface PublicProfileResponse {
  user_type: "organization" | "volunteer";
  is_public?: boolean;
  is_volunteer_team?: boolean;
  badge_info?: { id: number; name: string } | null;
  profile_data: ProfileData;
}

interface OpportunityItem {
  id: string | number;
  title_en?: string;
  title_ar?: string;
  opportunity_type?: string;
  opportunity_status?: string;
  event_status?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location_en?: string;
  location_ar?: string;
  from_age?: number;
  to_age?: number;
  format?: string;
  format_display?: LocalizedValue;
  learning_type_display?: LocalizedValue;
  event_type_display?: LocalizedValue;
  participation_type_display?: LocalizedValue;
  interest_display?: LocalizedValue[];
  opportunity_images?: Array<{ image: string }>;
  event_images?: Array<{ image: string }>;
}

interface CertificateItem {
  registration_id: number;
  certificate_image: string;
  opportunity__title_en?: string;
  opportunity__title_ar?: string;
}

type ProfileSection = "opportunities" | "events" | "certificates";
type ListingMode = "organized" | "sponsored";

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

function localizedError(error: unknown, language: string, fallback: string) {
  const payload = (
    error as {
      response?: { data?: { msg?: string; message_en?: string; message_ar?: string } };
    }
  )?.response?.data;
  return payload?.msg || (language === "ar" ? payload?.message_ar : payload?.message_en) || fallback;
}

function ProfileHeader({
  profile,
  badge,
  userType,
}: {
  profile: ProfileData;
  badge?: PublicProfileResponse["badge_info"];
  userType: PublicProfileResponse["user_type"];
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const defaultImage =
    userType === "organization"
      ? asset("profile/org_profile.svg")
      : getDefaultProfileImage(
          profile.gender_display?.value_en,
          asset("profile/male_profile.svg"),
          asset("profile/female_profile.svg"),
          asset("profile/org_profile.svg")
        );
  const badgeSrc = badgeImage(badge?.name);
  const secondaryValue =
    userType === "organization" ? profile.registration_number : profile.manual_id;

  return (
    <section className="border-b border-black/20 px-3 pt-10 2xl:px-5 2xl:pt-[70px]">
      <div
        className={`relative flex items-center gap-[100px] px-[75px] pb-10 lg:pb-[70px] md:gap-[60px] md:px-0 mobilescreen:flex-col mobilescreen:gap-8 mobilescreen:px-0 ${
          language === "ar"
            ? "2xl:right-[8%] lg:right-[4%] md:right-[2%]"
            : "2xl:left-[8%] lg:left-[4%] md:left-[2%]"
        }`}
      >
        <div className="flex items-center gap-[50px] mobilescreen:w-full mobilescreen:flex-col mobilescreen:gap-8">
          <Image
            src={profile.profile_pic || defaultImage}
            alt={profile.nickname || profile.full_name || "Profile"}
            width={168}
            height={168}
            className="h-[168px] w-[168px] rounded-full border-[5px] border-primary-5 object-cover"
            unoptimized
          />
          <div className="flex mobilescreen:w-full mobilescreen:justify-center xss:gap-4">
            <div className="details mobilescreen:w-full">
              <h1 className="text-lg font-bold text-primary-5 mobilescreen:text-base">
                {t("COMMON.NICKNAME")}
              </h1>
              <p className="font-normal text-primary-5">
                {profile.nickname || profile.full_name || "—"}
              </p>
              {secondaryValue && (
                <>
                  <h2 className="pt-10 font-bold text-primary-5 mobilescreen:pt-5">
                    {t(
                      userType === "organization"
                        ? "COMMON.ENTER_LICENSE_NUMBER"
                        : "COMMON.ID"
                    )}
                  </h2>
                  <p className="break-words font-normal text-primary-5">
                    {secondaryValue}
                  </p>
                </>
              )}
            </div>
            {badgeSrc && (
              <div className="hidden items-center gap-5 mobilescreen:flex">
                <div className="h-[120px] w-[2px] bg-black/20" />
                <Image
                  src={badgeSrc}
                  alt={badge?.name || "badge"}
                  width={70}
                  height={70}
                />
              </div>
            )}
          </div>
        </div>
        {badgeSrc && (
          <div className="flex items-center gap-[70px] mobilescreen:hidden">
            <div className="h-[176px] w-px bg-black/20" />
            <Image
              src={badgeSrc}
              alt={badge?.name || "badge"}
              width={90}
              height={90}
              className="h-auto w-[90px]"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function SocialLinks({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation();
  const links = [
    [profile.facebook_link, "profile/facebook.svg", "Facebook"],
    [profile.twitter_link, "profile/twitter.svg", "Twitter"],
    [profile.whatsapp_link, "profile/whatsapp.svg", "WhatsApp"],
    [profile.instagram_link, "profile/instagram.svg", "Instagram"],
    [profile.linkedin_link, "profile/linkdin.svg", "LinkedIn"],
  ] as const;
  if (!links.some(([href]) => href)) return null;

  return (
    <div className="pb-5">
      <h3 className="text-lg font-bold text-primary-5">
        {t("COMMON.SOCIAL_MEDIA")}
      </h3>
      <div className="mt-3 flex gap-3">
        {links.map(([href, icon, label]) =>
          href ? (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              <Image src={asset(icon)} alt="" width={31} height={31} />
            </a>
          ) : null
        )}
      </div>
    </div>
  );
}

function AchievementCard({
  icon,
  value,
  label,
  colorClass,
}: {
  icon: string;
  value: string | number;
  label: string;
  colorClass: string;
}) {
  return (
    <div
      className={`flex min-h-[195px] flex-col items-center rounded-bl-[40px] rounded-br-[40px] rounded-tr-[40px] border-[3px] p-4 text-center shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] ${colorClass}`}
    >
      <Image src={icon} alt="" width={60} height={60} className="mb-2 h-[60px] w-auto" />
      <strong className="text-[30px]">{value}</strong>
      <span className="pt-2 font-semibold">{label}</span>
    </div>
  );
}

function BackgroundAndAchievements({
  profile,
  userType,
  isVolunteerTeam,
}: {
  profile: ProfileData;
  userType: PublicProfileResponse["user_type"];
  isVolunteerTeam: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const occupation = occupationOptions.find((option) => option.value === profile.occupation);
  const interests = profile.interest_display || [];
  const volunteerStats = {
    hours:
      profile.statistics?.all_time?.total_hours ?? profile.total_volunteer_hours ?? 0,
    opportunities:
      profile.statistics?.all_time?.total_opportunities ?? profile.total_opportunities ?? 0,
    certificates:
      profile.statistics?.all_time?.total_certificates ?? profile.total_certificates ?? 0,
  };
  const organizationCards = [
    {
      icon: "profile/statistics/n_Volunteerhours.svg",
      value: profile.organization_hours ?? 0,
      label: t("COMMON.VOLUNTEER_HOURS-"),
      color: "border-primary-501 text-primary-501",
    },
    {
      icon: "profile/statistics/n_volunteer_organization.svg",
      value: profile.vol_opportunity_organized ?? 0,
      label: t("COMMON.VOLUNTEER_OPPORTUNITIES-"),
      color: "border-primary-502 text-primary-502",
    },
    {
      icon: "profile/statistics/n_learnServeicn.svg",
      value: profile.learn_opportunity_organized ?? 0,
      label: t("COMMON.OPPORTUNITIESORGANIZED--"),
      color: "border-primary-503 text-primary-503",
    },
    ...(!isVolunteerTeam
      ? [
          {
            icon: "profile/statistics/n_sponseredbyus.svg",
            value: profile.sponsored ?? 0,
            label: t("COMMON.SPONSERED.ORGANIZED"),
            color: "border-primary-504 text-primary-504",
          },
        ]
      : []),
  ];
  const volunteerCards = [
    {
      icon: "profile/statistics/n_Volunteerhours.svg",
      value: volunteerStats.hours,
      label: t("COMMON.VOLUNTEER_HOURS-"),
      color: "border-primary-501 text-primary-501",
    },
    {
      icon: "profile/statistics/n_VolunteerOpportunities.svg",
      value: volunteerStats.opportunities,
      label: t("COMMON.VOLUNTEER_OPPORTUNITIES-"),
      color: "border-primary-502 text-primary-502",
    },
    {
      icon: "profile/statistics/n_Certificate.svg",
      value: volunteerStats.certificates,
      label: t("COMMON.CERTIFICATE-"),
      color: "border-primary-503 text-primary-503",
    },
  ];
  const cards = userType === "organization" ? organizationCards : volunteerCards;

  return (
    <section className="px-3 pt-10 2xl:px-5 2xl:pt-[70px]">
      <div className="mb-12 gap-8 lg:flex">
        <div className="lg:w-1/2">
          <Title text={t("COMMON.ABOUT.ME")} hasMargin={false} className="mb-6 text-start" />
          <div className="space-y-5 text-lg text-primary-5 lg:w-[80%]">
            <p>
              <strong>
                {t(userType === "organization" ? "COMMON.COMPANYNAME" : "COMMON.FULL_NAME")} :{" "}
              </strong>
              {userType === "organization"
                ? profile.company_name || profile.full_name || "—"
                : profile.full_name || "—"}
            </p>
            {userType === "organization" && profile.sector_display && (
              <p>
                <strong>{t("COMMON.SECTOR")} : </strong>
                {profile.sector_display[language === "ar" ? "value_ar" : "value_en"]}
              </p>
            )}
            {userType === "volunteer" && occupation && (
              <p>
                <strong>{t("COMMON.ENTER.OCCIPATION")} : </strong>
                {occupation[language === "ar" ? "name_ar" : "name_en"]}
              </p>
            )}
            {interests.length > 0 && (
              <div>
                <h3 className="mb-2 font-bold">{t("COMMON.INTEREST")}</h3>
                <div className="flex flex-wrap gap-2 rounded-[20px] border border-primary-5 px-[17px] py-3">
                  {interests.map((interest, index) => (
                    <span
                      key={interest.id ?? index}
                      className="rounded-full bg-[#eaeaf1] px-4 py-1 text-[15px]"
                    >
                      {interest[language === "ar" ? "value_ar" : "value_en"]}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <SocialLinks profile={profile} />
          </div>
        </div>
        <div className="mt-10 w-full lg:mt-0 lg:w-1/2">
          <Title text={t("COMMON.ACHIEVEMENT")} hasMargin={false} className="mb-6 text-start" />
          <div className={`grid gap-[30px] md:grid-cols-3 ${cards.length === 4 ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
            {cards.map((card) => (
              <AchievementCard
                key={card.icon}
                icon={asset(card.icon)}
                value={card.value}
                label={card.label}
                colorClass={card.color}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ListingCard({ item, isEvent }: { item: OpportunityItem; isEvent: boolean }) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const title = item[language === "ar" ? "title_ar" : "title_en"] || "";
  const location = item[language === "ar" ? "location_ar" : "location_en"] || "";
  const status = isEvent ? item.event_status : item.opportunity_status;
  const image = isEvent
    ? item.event_images?.[0]?.image
    : item.opportunity_images?.[0]?.image;
  const href = isEvent
    ? `/event-details/${item.id}`
    : item.opportunity_type === "volunteer_opportunity"
      ? `/volunteer-event-detail/${item.id}`
      : `/learn-share-event-detail/${item.id}`;
  const detail = isEvent
    ? item.event_type_display
    : item.opportunity_type === "learn_serve_opportunity"
      ? item.learning_type_display
      : item.format_display;

  return (
    <Link href={href} className="group block pb-6">
      <article className="overflow-hidden rounded-[20px] border border-primary-5 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
        <div className="relative h-[260px] w-full bg-gray-100">
          <Image
            src={image || asset("homepage/treeplanting.png")}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            unoptimized
          />
          {status && (
            <span className="absolute end-4 top-4 rounded-full bg-primary-5 px-4 py-1 text-sm font-medium text-white">
              {t(
                status === "inprogress"
                  ? "COMMON.IN_PROGRESS"
                  : status === "completed"
                    ? "COMMON.FINISHED"
                    : "COMMON.UPCOMING"
              )}
            </span>
          )}
          {item.start_date && item.end_date && (
            <div className="absolute inset-x-0 bottom-0 grid h-10 grid-cols-2 items-center bg-black/70 text-center text-xs text-white">
              <span>
                {formatDateRange(item.start_date, item.end_date, language, t)}
              </span>
              <span>
                {item.start_time && moment(item.start_time, "HH:mm:ss").format("hh:mm a")}
                {item.end_time && ` - ${moment(item.end_time, "HH:mm:ss").format("hh:mm a")}`}
              </span>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="mb-4 line-clamp-1 text-xl font-bold text-secondary-100">
            {title}
          </h3>
          <div className="space-y-3 text-secondary-102">
            {detail && (
              <p className="flex items-center gap-3">
                <Image src={asset("homepage/learn_type.svg")} alt="" width={20} height={20} />
                {detail[language === "ar" ? "value_ar" : "value_en"]}
              </p>
            )}
            {location && (
              <p className="flex items-center gap-3">
                <Image src={asset("homepage/locations.svg")} alt="" width={20} height={20} />
                <span className="line-clamp-1">{location}</span>
              </p>
            )}
            {item.interest_display?.[0] && (
              <p className="flex items-center gap-3">
                <Image src={asset("homepage/health.svg")} alt="" width={20} height={20} />
                {item.interest_display[0][language === "ar" ? "value_ar" : "value_en"]}
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="button" size="xss" variant={isEvent ? "orange" : "secondarys"}>
              {t("COMMON.VIEW")}
            </Button>
          </div>
        </div>
      </article>
    </Link>
  );
}

function PublicProfileListings({
  userId,
  userType,
  isVolunteerTeam,
}: {
  userId: string;
  userType: PublicProfileResponse["user_type"];
  isVolunteerTeam: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const [section, setSection] = useState<ProfileSection>("opportunities");
  const [mode, setMode] = useState<ListingMode>("organized");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const isVolunteer = userType === "volunteer";

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FiltersData>(EMPTY_PROFILE_FILTERS);
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const filterFormRef = useRef<{ submitForm: () => Promise<void> } | null>(null);

  const hasActiveFilters =
    !!filters.startDate ||
    !!filters.endDate ||
    !!filters.category ||
    !!filters.status ||
    (filters.tags?.length ?? 0) > 0 ||
    !!filters.opportunity_type ||
    !!filters.opportunity_status;

  const clearFilters = () => {
    setFilters(EMPTY_PROFILE_FILTERS);
    setClearFiltersKey((prev) => prev + 1);
  };

  // Same param mapping the owner's own profile uses in ProfileVolunteerCard /
  // ProfileEventCard, so both screens filter identically.
  const filterParams = {
    start_date: filters.startDate
      ? moment(filters.startDate).format("YYYY-MM-DD")
      : undefined,
    end_date: filters.endDate
      ? moment(filters.endDate).format("YYYY-MM-DD")
      : undefined,
    tags: filters.tags?.length ? filters.tags : undefined,
  };

  const listingQuery = useQuery({
    queryKey: [
      "public-profile-listing",
      userId,
      userType,
      section,
      mode,
      deferredSearch,
      filters,
    ],
    queryFn: () => {
      if (isVolunteer && section === "opportunities") {
        return getUserOpportunities({
          filter_type: "organized",
          user_id: userId,
          search: deferredSearch || undefined,
          ...filterParams,
          opportunity_type: filters.opportunity_type || undefined,
          opportunity_status: filters.opportunity_status || undefined,
          page: 1,
          limit: 30,
        });
      }
      return getAllOpportunities({
        filter_type:
          section === "events"
            ? mode === "organized"
              ? "organized_events"
              : "sponsored_events"
            : mode,
        user_id: userId,
        search: deferredSearch || undefined,
        ...filterParams,
        opportunity_type:
          filters.opportunity_type || filters.category || undefined,
        status: filters.opportunity_status || filters.status || undefined,
        page: 1,
        limit: 30,
      });
    },
    enabled: section !== "certificates",
  });

  const certificatesQuery = useQuery({
    queryKey: ["public-profile-certificates", userId],
    queryFn: () => getUserCertificates(userId),
    enabled: isVolunteer && section === "certificates",
  });

  const items: OpportunityItem[] = Array.isArray(listingQuery.data?.data)
    ? listingQuery.data.data
    : [];
  const certificates: CertificateItem[] = Array.isArray(certificatesQuery.data?.data)
    ? certificatesQuery.data.data
    : [];
  const loading = section === "certificates" ? certificatesQuery.isLoading : listingQuery.isLoading;

  const sections: Array<{ value: ProfileSection; label: string }> = isVolunteer
    ? [
        { value: "opportunities", label: t("COMMON.OPPORTUNITIES-") },
        { value: "certificates", label: t("COMMON.CERTIFICATES") },
      ]
    : [
        { value: "opportunities", label: t("COMMON.OPPORTUNITIES-") },
        { value: "events", label: t("COMMON.EVENTS-") },
      ];

  return (
    <section className="pb-[50px]">
      <Modal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={t("COMMON.FILTER")}
        size="md"
        footer={
          <div className="flex w-full justify-center gap-5 xss:flex-col">
            <Button
              variant="primary"
              size="medium"
              className="xss:w-full"
              type="button"
              onClick={() => filterFormRef.current?.submitForm()}
              disabled={!isFilterDirty}
            >
              {t("COMMON.APPLY")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:w-full"
              type="button"
              onClick={clearFilters}
            >
              {t("COMMON.CLEAR")}
            </Button>
          </div>
        }
      >
        <ProfileFilterForm
          key={clearFiltersKey}
          formikRef={filterFormRef}
          initialValues={filters}
          onDirtyChange={setIsFilterDirty}
          onApply={(applied) => {
            setFilters(applied);
            setFilterOpen(false);
          }}
          isEventFilter={section === "events"}
          type={section !== "events"}
          activeTab={mode}
        />
      </Modal>

      <div className="flex gap-[38px] px-3 2xl:px-5 xss:gap-2">
        {sections.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setSection(tab.value);
              setMode("organized");
              // Opportunity and event filters don't share the same choices.
              clearFilters();
            }}
            className={`relative rounded-t-[20px] border border-primary-5 px-6 py-4 text-xl font-bold text-primary-5 ${
              section === tab.value ? "border-b-white bg-white" : "bg-[#D2D8F6]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="border-t border-primary-5 px-3 pt-6 2xl:px-5">
        {section !== "certificates" && (
          <div className="mb-8 flex items-center justify-between gap-6 mobilescreen:flex-col">
            <div className="flex gap-8">
              <button
                type="button"
                onClick={() => setMode("organized")}
                className={`pb-1 text-lg ${mode === "organized" ? "border-b-2 border-primary-5 font-bold text-primary-5" : "text-black"}`}
              >
                {t(isVolunteer ? "COMMON.ATTENDED--" : "COMMON.ORGANIZED")}
              </button>
              {!isVolunteerTeam && !isVolunteer && (
                <button
                  type="button"
                  onClick={() => setMode("sponsored")}
                  className={`pb-1 text-lg ${mode === "sponsored" ? "border-b-2 border-primary-5 font-bold text-primary-5" : "text-black"}`}
                >
                  {t("COMMON.SPONSORED")}
                </button>
              )}
            </div>
            <Searchbar
              value={search}
              onSearchChange={setSearch}
              onFilterClick={() => setFilterOpen(true)}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              isLoading={search !== deferredSearch}
            />
          </div>
        )}

        {loading ? (
          <Loader inline className="py-20" />
        ) : section === "certificates" ? (
          certificates.length ? (
            <div className="grid grid-cols-1 gap-[25px] md:grid-cols-2 xl:grid-cols-3">
              {certificates.map((certificate) => {
                const title =
                  certificate[language === "ar" ? "opportunity__title_ar" : "opportunity__title_en"] ||
                  t("COMMON.CERTIFICATE-");
                return (
                  <a
                    key={certificate.registration_id}
                    href={certificate.certificate_image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-lg shadow-md"
                  >
                    <Image
                      src={certificate.certificate_image}
                      alt={title}
                      width={600}
                      height={420}
                      className="h-auto w-full transition-transform group-hover:scale-[1.02]"
                      unoptimized
                    />
                    <span className="absolute end-3 top-3 rounded-full bg-white p-2 text-primary-5 shadow">
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-lg text-secondary-102">
              {t("COMMON.NO_CERTIFICATES_AVAILABLE")}
            </p>
          )
        ) : items.length ? (
          <div className="grid grid-cols-1 gap-[25px] md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ListingCard key={item.id} item={item} isEvent={section === "events"} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-lg text-secondary-102">
            {t(
              section === "events"
                ? "COMMON.NO_EVENTS_AVAILABLE"
                : "COMMON.NO_VOLUNTEER_OPPORTUNITIES_AVAILABLE"
            )}
          </p>
        )}
      </div>
    </section>
  );
}

export default function CommonProfile({ id }: { id: string }) {
  const language = useLanguageStore((state) => state.language);
  const router = useRouter();
  const profileQuery = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => getPublicProfile(id),
    enabled: Boolean(id),
  });
  const response = profileQuery.data?.data as PublicProfileResponse | undefined;

  useEffect(() => {
    if (
      response?.user_type === "volunteer" &&
      response.is_public === false
    ) {
      router.replace(`/volunteer-private-profile/${id}`);
    }
  }, [id, response, router]);

  if (profileQuery.isLoading) return <Loader />;
  if (profileQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl py-24 text-center">
        <p className="mb-6 text-lg text-red-600">
          {localizedError(
            profileQuery.error,
            language,
            language === "ar" ? "لم يتم العثور على الملف الشخصي" : "Profile not found"
          )}
        </p>
        <Button size="medium" onClick={() => profileQuery.refetch()}>
          {language === "ar" ? "إعادة المحاولة" : "Retry"}
        </Button>
      </div>
    );
  }
  if (!response?.profile_data) return null;
  if (response.user_type === "volunteer" && response.is_public === false) {
    return <Loader />;
  }

  const profile = response.profile_data;
  return (
    <div className="border-t border-black opp-itm-shadow">
      <div className="relative mx-auto w-[90%] md:w-[85%] lg:w-[90%] 2xl:w-[75%]">
        <ProfileHeader
          profile={profile}
          badge={response.badge_info}
          userType={response.user_type}
        />
        <BackgroundAndAchievements
          profile={profile}
          userType={response.user_type}
          isVolunteerTeam={Boolean(response.is_volunteer_team)}
        />
        <PublicProfileListings
          userId={String(profile.id)}
          userType={response.user_type}
          isVolunteerTeam={Boolean(response.is_volunteer_team)}
        />
      </div>
    </div>
  );
}
