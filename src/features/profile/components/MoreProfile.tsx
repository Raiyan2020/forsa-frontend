"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import Searchbar from "@/components/ui/Searchbar";
import Title from "@/components/shared/Title";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import MoreProfileFilterForm, { MoreProfileFilters } from "./MoreProfileFilterForm";
import {
  getOrganizationProfilesList,
  getVolunteerProfilesList,
  getVolunteerTeamProfilesList,
} from "@/features/profile/services/profileApi";
import { SponsorsClient } from "@/features/home";
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

export interface UserProfile {
  id: number;
  is_public: boolean;
  nickname: string;
  user_details: UserDetails;
}

type Bucket = "volunteer" | "volunteer_team" | "organization";

const TABS: { bucket: Bucket; labelKey: string }[] = [
  { bucket: "volunteer", labelKey: "COMMON.VOLUNTEER" },
  { bucket: "volunteer_team", labelKey: "COMMON.VOLUNTEER.TEAM" },
  { bucket: "organization", labelKey: "COMMON.ORGANIZATION" },
];

interface ProfilesListParams {
  page: number;
  limit: number;
  search: string;
  name: string;
  nickname: string;
}

/** Each bucket's own dedicated, independently-paginated endpoint. */
const BUCKET_FETCHERS: Record<Bucket, (params: ProfilesListParams) => Promise<ProfilesListResponse>> = {
  volunteer: getVolunteerProfilesList,
  volunteer_team: getVolunteerTeamProfilesList,
  organization: getOrganizationProfilesList,
};

const LIMIT = 15;

/** Shape shared by `/profiles/volunteers|organizations|volunteer-teams/` — a flat array with a top-level `meta.pagination`. */
interface ProfilesListResponse {
  data?: UserProfile[];
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
    timestamp?: string;
  };
}

function isBucket(value: string | null): value is Bucket {
  return value === "volunteer" || value === "volunteer_team" || value === "organization";
}

/**
 * The three former standalone list pages (`/volunteer-profiles-list`,
 * `/volunteer-team-profiles-list`, `/entities-profiles-list`) merged into one
 * page with an in-page tab switcher — the old routes now redirect here with
 * `?tab=`. Switching tabs keeps the current search/filters and swaps which
 * bucket's endpoint drives the grid below.
 */
export default function MoreProfile() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeBucket: Bucket = isBucket(tabParam) ? tabParam : "volunteer";

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => searchParams.get("search") || ""
  );
  const [open, setOpen] = useState(false);
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const [isFilterEmpty, setIsFilterEmpty] = useState(true);
  const [filters, setFilters] = useState<MoreProfileFilters>({
    name: searchParams.get("name") || "",
    nickname: searchParams.get("nickname") || "",
    user_type: "",
  });

  const hasAppliedFilters = !!filters.name || !!filters.nickname;

  // Debounce the search box before it feeds the query key.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync tab + search + filters back to the URL so navigating back restores state.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeBucket);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.name) params.set("name", filters.name);
    if (filters.nickname) params.set("nickname", filters.nickname);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeBucket, debouncedSearch, filters, pathname, router]);

  const {
    data: profileData,
    isLoading: profileLoading,
    isFetching,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ProfilesListResponse>({
    queryKey: [
      "profiles-list",
      activeBucket,
      debouncedSearch,
      filters.name,
      filters.nickname,
    ],
    queryFn: ({ pageParam }) =>
      BUCKET_FETCHERS[activeBucket]({
        page: pageParam as number,
        limit: LIMIT,
        search: debouncedSearch,
        name: filters.name,
        nickname: filters.nickname,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage): number | undefined => {
      const items = lastPage?.data ?? [];
      const pagination = lastPage?.meta?.pagination;
      if (!pagination || items.length === 0) return undefined;
      const nextPage = (pagination.page ?? 1) + 1;
      return nextPage <= (pagination.total_pages ?? 1) ? nextPage : undefined;
    },
    retry: true,
    retryDelay: 2000,
    staleTime: 30 * 1000,
  });

  // Flatten every fetched page into one list (deduped by id for safety).
  const allProfiles = useMemo<UserProfile[]>(() => {
    const pages = profileData?.pages ?? [];
    const seen = new Set<number>();
    const result: UserProfile[] = [];
    for (const page of pages) {
      for (const profile of page?.data ?? []) {
        if (profile && !seen.has(profile.id)) {
          seen.add(profile.id);
          result.push(profile);
        }
      }
    }
    return result;
  }, [profileData]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPendingNextPage, setIsPendingNextPage] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetching &&
          !isError &&
          !nextPageTimeoutRef.current
        ) {
          setIsPendingNextPage(true);
          nextPageTimeoutRef.current = setTimeout(() => {
            nextPageTimeoutRef.current = null;
            setIsPendingNextPage(false);
            fetchNextPage();
          }, 1000);
        }
      },
      { threshold: 0, rootMargin: "0px 0px 300px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [allProfiles.length, hasNextPage, isFetching, isError, fetchNextPage]);

  useEffect(() => {
    return () => {
      if (nextPageTimeoutRef.current) {
        clearTimeout(nextPageTimeoutRef.current);
        nextPageTimeoutRef.current = null;
      }
    };
  }, []);

  const handleTabChange = (value: string) => {
    if (!isBucket(value)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (profileLoading && allProfiles.length === 0) {
    return <Loader />;
  }

  const hasNoProfiles = allProfiles.length === 0 && !isFetching;

  return (
    <>
      <div className="border-t border-[#000] opp-itm-shadow">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px] relative">
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
                    setFilters({ name: "", nickname: "", user_type: "" });
                    setClearFiltersKey((prev) => prev + 1);
                  }}
                  disabled={isFilterEmpty}
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
              onEmptyChange={setIsFilterEmpty}
              hideUserType
            />
          </Modal>

          <Searchbar
            showFilterIcon
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

          <div className="2xl:pt-[70px] laptopmain:pt-[50px] laptop:pt-[40px] pt-[40px] dotlist-white">
            <h1 className="flex">
              <Title text={t("COMMON.PROFILES")} variant="default" />
            </h1>
          </div>

          <Tabs
            value={activeBucket}
            onValueChange={handleTabChange}
            className="2xl:mt-[50px] laptopmain:mt-[35px] mt-[25px]"
          >
            <TabsList className="w-full h-auto flex bg-transparent border border-primary-5 rounded-2xl p-0 overflow-hidden">
              {TABS.map(({ bucket, labelKey }, index) => (
                <TabsTrigger
                  key={bucket}
                  value={bucket}
                  className={`flex-1 rounded-none py-4 text-base md:text-lg font-bold text-primary-5 border-0 ${
                    index > 0 ? "border-l border-primary-5 rtl:border-l-0 rtl:border-r" : ""
                  } data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-b-primary-5`}
                >
                  {t(labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="2xl:pt-[50px] laptopmain:pt-[35px] pt-[25px]">
            {hasNoProfiles ? (
              <div className="text-center py-8 text-secondary-102 text-lg font-medium">
                {t("COMMON.NO_PROFILES_AVAILABLE")}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8 mobilescreen:gap-0 mobilescreen:pb-0">
                  {allProfiles.map((profile) => (
                    <ProfileCard key={profile?.id} profile={profile} />
                  ))}
                </div>
                {(isPendingNextPage || isFetchingNextPage) && (
                  <div className="flex justify-center py-6">
                    <Loader inline size="sm" />
                  </div>
                )}
                {!hasNextPage && allProfiles.length > 0 && !isFetching && (
                  <p className="text-center py-4 text-secondary-102">
                    {t("COMMON.NO_MORE_PROFILES")}
                  </p>
                )}
                <div ref={sentinelRef} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border-secondary-100/20 border-t 2xl:pt-[70px] pt-[40px] laptopmain:pt-[50px] laptop:pt-[40px] lg:pt-[40px] mobilescreen:pt-[40px]">
        <SponsorsClient />
      </div>
    </>
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
