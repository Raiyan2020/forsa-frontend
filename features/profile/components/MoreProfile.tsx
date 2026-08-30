"use client";

import { useEffect, useState, useTransition } from "react";
import Searchbar from "@/components/ui/Searchbar";
import Title from "@/components/shared/Title";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import Carousel from "react-multi-carousel";
import { useLanguageStore } from "@/store/languageStore";
import "react-multi-carousel/lib/styles.css";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import MoreProfileFilterForm, { MoreProfileFilters } from "./MoreProfileFilterForm";
import { getAllProfiles } from "@/features/services/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Loader from "@/components/ui/Loader";
import Image from "next/image";
import { getDefaultProfileImage } from "@/lib/helpers";

const femaleDummy = "/assets/profile/female_profile.svg";
const orgDummy = "/assets/profile/org_profile.svg";
const maleDummy = "/assets/profile/male_profile.svg";

interface UserDetails {
  id: number;
  first_name: string;
  last_name: string;
  gender_display?: { value_en: string; value_ar: string };
  user_type: string;
  profile_pic: string | null;
}

interface UserProfile {
  id: number;
  is_public: boolean;
  nickname: string;
  user_details: UserDetails;
}

export default function MoreProfile() {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const getSearchParam = (key: string) => (searchParams ? searchParams.get(key) || "" : "");

  const [searchQuery, setSearchQuery] = useState(() => getSearchParam("search"));
  const [debouncedSearch, setDebouncedSearch] = useState(() => getSearchParam("search"));
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);

  const [navigationVisibility, setNavigationVisibility] = useState({
    volunteer: false,
    volunteer_team: false,
    organization: false,
  });

  const [filters, setFilters] = useState<MoreProfileFilters>({
    name: getSearchParam("name"),
    nickname: getSearchParam("nickname"),
    user_type: getSearchParam("user_type"),
  });

  const queryParams = {
    page: 1,
    // Capped to exactly one carousel row — this endpoint is a preview, not a
    // full list (see the dedicated `/profiles/*` endpoints ProfilesList uses
    // for "عرض الكل").
    limit: 6,
    search: debouncedSearch,
    name: filters.name,
    nickname: filters.nickname,
    user_type: filters.user_type,
  };

  const [open, setOpen] = useState(false);

  const hasAppliedFilters =
    !!filters.name || !!filters.nickname || !!filters.user_type;

  const { data: profileData, isFetching, isLoading } = useQuery({
    queryKey: ["all-profiles", queryParams],
    queryFn: () => getAllProfiles(queryParams),
    staleTime: 30 * 1000,
    // Every keystroke changes the query key. Without this the results blank
    // out between searches and the whole page falls back to the spinner.
    placeholderData: keepPreviousData,
  });

  // `react-multi-carousel` reads `children.length`, so it must never be handed
  // an undefined list — which is what a map over missing data produces.
  const volunteers: UserProfile[] = profileData?.data?.volunteer ?? [];
  const volunteerTeams: UserProfile[] = profileData?.data?.volunteer_team ?? [];
  const organizations: UserProfile[] = profileData?.data?.organization ?? [];

  const responsive = {
    superLargeDesktop: { breakpoint: { max: 4000, min: 1200 }, items: 5 },
    desktop: { breakpoint: { max: 1200, min: 991 }, items: 4 },
    tablet: { breakpoint: { max: 991, min: 464 }, items: 3 },
    mobile: { breakpoint: { max: 464, min: 420 }, items: 3 },
    mobilesmall: { breakpoint: { max: 420, min: 320 }, items: 2 },
  };

  const [maxVisibleItems, setMaxVisibleItems] = useState(5);

  useEffect(() => {
    const updateMaxVisibleItems = () => {
      if (window.innerWidth >= 1200) {
        setMaxVisibleItems(responsive.superLargeDesktop.items);
      } else if (window.innerWidth >= 991) {
        setMaxVisibleItems(responsive.desktop.items);
      } else if (window.innerWidth >= 464) {
        setMaxVisibleItems(responsive.tablet.items);
      } else if (window.innerWidth >= 420) {
        setMaxVisibleItems(responsive.mobile.items);
      } else {
        setMaxVisibleItems(responsive.mobilesmall.items);
      }
    };

    updateMaxVisibleItems();
    window.addEventListener("resize", updateMaxVisibleItems);
    return () => window.removeEventListener("resize", updateMaxVisibleItems);
  }, []);

  useEffect(() => {
    if (!profileData) return;
    // This endpoint nests `meta` inside `data`, unlike the shared envelope.
    const pagination = profileData?.data?.meta?.pagination;
    setNavigationVisibility({
      volunteer:
        (pagination?.volunteer?.total || 0) > maxVisibleItems,
      volunteer_team:
        (pagination?.volunteer_team?.total || 0) > maxVisibleItems,
      organization:
        (pagination?.organization?.total || 0) > maxVisibleItems,
    });
  }, [profileData, maxVisibleItems]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.name) params.set("name", filters.name);
    if (filters.nickname) params.set("nickname", filters.nickname);
    if (filters.user_type) params.set("user_type", filters.user_type);
    
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }, [debouncedSearch, filters, router, pathname]);

  // `isLoading` is true only while the first results are on the way: with
  // `keepPreviousData` a re-search keeps the previous list on screen instead of
  // replacing the whole page with a spinner.
  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="border-t border-[#000] opp-itm dotlist-white moreprofile">
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("COMMON.FILTER")}
        size="sm"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:w-full"
              onClick={() => {
                const form = document.querySelector("form") as HTMLFormElement;
                if (form) form.requestSubmit();
                setOpen(false);
              }}
              disabled={!isFilterDirty}
              type="button"
            >
              {t("COMMON.APPLY")}
            </Button>
            <Button
              variant="secondary"
              className="xss:w-full"
              size="medium"
              onClick={() => {
                setFilters({
                  name: "",
                  nickname: "",
                  user_type: "",
                });
                setClearFiltersKey((prev) => prev + 1);
              }}
              type="button"
            >
              {t("COMMON.CLEAR")}
            </Button>
          </div>
        }
      >
        <MoreProfileFilterForm
          key={clearFiltersKey}
          onApply={(values) => {
            setFilters(values);
            setOpen(false);
          }}
          initialValues={filters}
          onDirtyChange={setIsFilterDirty}
        />
      </Modal>

      <div className="flex justify-center 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative 2xl:py-[70px] laptopmain:py-[50px] py-[40px]">
        <Searchbar
          value={searchQuery}
          onSearchChange={(value) => setSearchQuery(value)}
          onFilterClick={() => setOpen(true)}
          hasActiveFilters={hasAppliedFilters}
          isLoading={isFetching}
          onClearFilters={() => {
            setFilters({ name: "", nickname: "", user_type: "" });
            setClearFiltersKey((prev) => prev + 1);
          }}
        />
      </div>

      {/* Volunteer Profiles Section */}
      <section className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:pb-[70px] laptopmain:pb-[50px] laptop:pb-[40px] lg:pb-[40px] mx-auto relative ">
        <h1 className="flex 2xl:px-5 px-3 mobilescreen:px-[13px]">
          <Title text={t("COMMON.PROFILES")} variant="default" />
        </h1>

        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] flex justify-between items-center 2xl:mb-[50px] lg:mb-[30px] md:mb-[30px] mb-[30px]">
          <h2 className="2xl:text-[40px] laptop:text-[33px] laptopmain:text-[36px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-5 font-bold leading-none">
            {t("COMMON.VOLUNTEER--")}
          </h2>
          {navigationVisibility.volunteer && (
            <Link
              href={`/volunteer-profiles-list?search=${encodeURIComponent(debouncedSearch)}&name=${encodeURIComponent(filters.name)}&nickname=${encodeURIComponent(filters.nickname)}`}
              className="text-primary-5 font-bold text-base"
            >
              {t("COMMON.SHOW.ALL")}
            </Link>
          )}
        </div>

        {volunteers.length === 0 ? (
          <div className="text-center py-8 text-secondary-102 text-lg font-medium">
            {t("COMMON.NO_PROFILES_AVAILABLE")}
          </div>
        ) : (
          <Carousel
            rtl={selectedLanguage === "ar"}
            responsive={responsive}
            showDots={volunteers.length > maxVisibleItems}
            autoPlay={false}
            autoPlaySpeed={3000}
            arrows={volunteers.length > maxVisibleItems}
            draggable
            swipeable
            containerClass="overflow-hidden"
            dotListClass="custom-dot-list-style"
          >
            {volunteers.map((volunteer: UserProfile) => (
              <ProfileCard key={volunteer?.id} profile={volunteer} />
            ))}
          </Carousel>
        )}
      </section>

      {/* Organization Section */}
      <section className="bg-[#F0F0F0]">
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] pt-[40px] mx-auto relative">
          <div className="2xl:px-5 px-3 mobilescreen:px-[13px] flex justify-between items-center 2xl:mb-[50px] lg:mb-[30px] md:mb-[30px] mb-[30px]">
            <h2 className="2xl:text-[40px] laptop:text-[33px] laptopmain:text-[36px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-5 font-bold leading-none">
              {t("COMMON.ORGANIZATION")}
            </h2>
            {navigationVisibility.organization && (
              <Link
                href={`/entities-profiles-list?search=${encodeURIComponent(debouncedSearch)}&name=${encodeURIComponent(filters.name)}&nickname=${encodeURIComponent(filters.nickname)}`}
                className="text-primary-5 font-bold text-base"
              >
                {t("COMMON.SHOW.ALL")}
              </Link>
            )}
          </div>

          {organizations.length === 0 ? (
            <div className="text-center py-8 text-secondary-102 text-lg font-medium">
              {t("COMMON.NO_PROFILES_AVAILABLE")}
            </div>
          ) : (
            <Carousel
              rtl={selectedLanguage === "ar"}
              responsive={responsive}
              showDots={organizations.length > maxVisibleItems}
              autoPlay={false}
              autoPlaySpeed={3000}
              arrows={organizations.length > maxVisibleItems}
              draggable
              swipeable
              containerClass="overflow-hidden"
              dotListClass="custom-dot-list-style"
            >
              {organizations.map((volunteer: UserProfile) => (
                <ProfileCard key={volunteer?.id} profile={volunteer} />
              ))}
            </Carousel>
          )}
        </div>
      </section>

      {/* Volunteer Team Section */}
      <section>
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] pt-[40px] mx-auto relative">
          <div className="2xl:px-5 px-3 mobilescreen:px-[13px] flex justify-between items-center 2xl:mb-[50px] lg:mb-[30px] md:mb-[30px] mb-[30px]">
            <h2 className="2xl:text-[40px] laptop:text-[33px] laptopmain:text-[36px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-5 font-bold leading-none">
              {t("COMMON.VOLUNTEER.TEAM")}
            </h2>
            {navigationVisibility.volunteer_team && (
              <Link
                href={`/volunteer-team-profiles-list?search=${encodeURIComponent(debouncedSearch)}&name=${encodeURIComponent(filters.name)}&nickname=${encodeURIComponent(filters.nickname)}`}
                className="text-primary-5 font-bold text-base"
              >
                {t("COMMON.SHOW.ALL")}
              </Link>
            )}
          </div>
          {volunteerTeams.length === 0 ? (
            <div className="text-center py-8 text-secondary-102 text-lg font-medium">
              {t("COMMON.NO_PROFILES_AVAILABLE")}
            </div>
          ) : (
            <Carousel
              rtl={selectedLanguage === "ar"}
              responsive={responsive}
              showDots={volunteerTeams.length > maxVisibleItems}
              autoPlay={false}
              autoPlaySpeed={3000}
              arrows={volunteerTeams.length > maxVisibleItems}
              draggable
              swipeable
              containerClass="overflow-hidden"
              dotListClass="custom-dot-list-style"
            >
              {volunteerTeams.map((volunteer: UserProfile) => (
                <ProfileCard key={volunteer?.id} profile={volunteer} />
              ))}
            </Carousel>
          )}
        </div>
      </section>
    </div>
  );
}

export const ProfileCard = ({ profile }: { profile: UserProfile }) => {
  const profileUrl =
    !profile?.is_public && profile?.user_details?.user_type === "volunteer"
      ? `/volunteer-private-profile/${profile?.user_details?.id}`
      : `/public-profile/${profile?.user_details?.id}`;

  return (
    <div className="flex flex-col items-center pb-8">
      <div className="flex justify-center items-center w-full h-full">
        <Link href={profileUrl}>
          <div className="relative lg:w-48 lg:h-48 md:w-32 md:h-32 mobilescreen:w-24 mobilescreen:h-24">
            <Image
              className="rounded-full cursor-pointer border-2 border-primary-5 hover:opacity-90 transition-opacity object-cover"
              src={
                profile?.user_details?.profile_pic ||
                getDefaultProfileImage(
                  profile?.user_details?.gender_display?.value_en,
                  maleDummy,
                  femaleDummy,
                  orgDummy
                )
              }
              alt={profile?.user_details?.first_name + " " + profile?.user_details?.last_name}
              fill
              unoptimized
            />
          </div>
        </Link>
      </div>
      <h3 className="text-center font-semibold 2xl:text-[25px] lg:text-lg mediumscreen:text-xl mobilescreen:text-sm text-lg text-secondary-100 pt-2">
        <Link href={profileUrl} className="cursor-pointer hover:underline">
          {profile?.nickname || profile?.user_details?.first_name + " " + profile?.user_details?.last_name}
        </Link>
      </h3>
    </div>
  );
};
export type { UserProfile };
