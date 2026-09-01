"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Searchbar from "@/components/ui/Searchbar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import Title from "@/components/shared/Title";
import { SponsorsClient } from "@/features/home";
import { getOrganizationProfilesList, getVolunteerProfilesList, getVolunteerTeamProfilesList } from "@/features/profile/services/profileApi";
import { ProfileCard, type UserProfile } from "./MoreProfile";
import MoreProfileFilterForm from "./MoreProfileFilterForm";

// Use consistent limit for all pages
const LIMIT = 15;

type Bucket = "volunteer" | "organization" | "volunteer_team";

/** Each bucket's own dedicated, independently-paginated endpoint. */
const BUCKET_FETCHERS: Record<Bucket, (params?: any) => Promise<ProfilesListResponse>> = {
  volunteer: getVolunteerProfilesList,
  organization: getOrganizationProfilesList,
  volunteer_team: getVolunteerTeamProfilesList,
};

/** Shape shared by `/profiles/volunteers|organizations|volunteer-teams/` — a flat array with a top-level `meta.pagination`, like the rest of the app's list endpoints. */
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

interface ProfilesListProps {
  /** Which dedicated per-type endpoint (and pagination bucket) this list reads. */
  bucket: Bucket;
  /** Translation key for the section heading. */
  titleKey: string;
}

/**
 * Shared body for the three "more profiles" pages. In the React app each page
 * was a verbatim copy that differed only in which endpoint it called and in
 * its heading.
 *
 * Infinite scroll is driven by the API's own pagination metadata
 * (`meta.pagination.total_pages`) via `useInfiniteQuery`: the next page is
 * fetched only while the returned metadata says one exists.
 */
export default function ProfilesList({ bucket, titleKey }: ProfilesListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const [filters, setFilters] = useState({
    name: searchParams.get("name") || "",
    nickname: searchParams.get("nickname") || "",
    user_type: "",
  });

  // Debounce the search box before it feeds the query key.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync search + filters back to URL so navigating back restores state
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.name) params.set("name", filters.name);
    if (filters.nickname) params.set("nickname", filters.nickname);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [debouncedSearch, filters, pathname, router]);

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
      bucket,
      debouncedSearch,
      filters.name,
      filters.nickname,
    ],
    queryFn: ({ pageParam }) =>
      BUCKET_FETCHERS[bucket]({
        page: pageParam,
        limit: LIMIT,
        search: debouncedSearch,
        name: filters.name,
        nickname: filters.nickname,
      }),
    initialPageParam: 1,
    // Trust the server's pagination metadata: keep going while the fetched
    // page reports another one available.
    getNextPageParam: (lastPage): number | undefined => {
      const items = lastPage?.data ?? [];
      const pagination = lastPage?.meta?.pagination;
      if (!pagination || items.length === 0) return undefined;
      const nextPage = (pagination.page ?? 1) + 1;
      return nextPage <= (pagination.total_pages ?? 1) ? nextPage : undefined;
    },
    // A failed page (e.g. a transient 403) keeps retrying every 2s instead of
    // giving up — `isFetching`/`isFetchingNextPage` stay true across retries,
    // so the spinner keeps showing until one finally succeeds.
    retry: true,
    retryDelay: 2000,
    staleTime: 30 * 1000, // Cache for 30 seconds
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

  // Load the next page whenever the sentinel scrolls into view, waiting 1s
  // between pages instead of firing immediately — keeps rapid scrolling from
  // hammering the endpoint with back-to-back requests. `!isError` stops the
  // loop once a page request fails, rather than retrying the same broken
  // page every second forever.
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

  // Cancel a pending delayed fetch on unmount so it never fires after teardown.
  useEffect(() => {
    return () => {
      if (nextPageTimeoutRef.current) {
        clearTimeout(nextPageTimeoutRef.current);
        nextPageTimeoutRef.current = null;
      }
    };
  }, []);

  // Only show full-page loader on initial load
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
                    const form = document.querySelector(
                      "form"
                    ) as HTMLFormElement;
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

          <div className="flex justify-between items-center mobilescreen:flex-col mobilescreen:gap-5">
            <div className="w-[668px] mobilescreen:w-[100%]">
              <Searchbar
                showFilterIcon
                value={searchQuery}
                onSearchChange={(value) => setSearchQuery(value)}
                onFilterClick={() => setOpen(true)}
              />
            </div>
          </div>

          <div className="2xl:pt-[70px] laptopmain:pt-[50px] laptop:pt-[40px] pt-[40px] dotlist-white">
            <h1 className="flex">
              <Title text={t(titleKey)} variant="default" />
            </h1>
          </div>

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

      <div className="border-secondary-100/20 border-t 2xl:pt-[70px] pt-[40px] laptopmain:pt-[50px] laptop:pt-[40px] lg:pt-[40px] mobilescreen:pt-[40px]">
        <SponsorsClient />
      </div>
    </>
  );
}