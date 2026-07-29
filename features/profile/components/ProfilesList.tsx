"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Searchbar from "@/components/ui/Searchbar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import Title from "@/components/shared/Title";
import SponsorsClient from "@/features/home/components/SponsorsClient";
import { getAllProfiles } from "@/features/services/api";
import { ProfileCard, type UserProfile } from "./MoreProfile";
import MoreProfileFilterForm from "./MoreProfileFilterForm";

// Use consistent limit for all pages
const LIMIT = 15;

interface ProfilesListProps {
  /** Key under `data` (and `meta.pagination`) holding this list's profiles. */
  bucket: "volunteer" | "organization" | "volunteer_team";
  /** Translation key for the section heading. */
  titleKey: string;
}

/**
 * Shared body for the three "more profiles" pages. In the React app each page
 * was a verbatim copy that differed only in which response bucket it read and
 * in its heading.
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
  const isInitialMount = useRef(true);
  const [open, setOpen] = useState(false);
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const [filters, setFilters] = useState({
    name: searchParams.get("name") || "",
    nickname: searchParams.get("nickname") || "",
    user_type: "",
  });

  // For infinite scroll
  const [currentPage, setCurrentPage] = useState(1);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const {
    data: profileData,
    isLoading: profileLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "all-profiles",
      bucket,
      currentPage,
      debouncedSearch,
      filters.name,
      filters.nickname,
    ],
    queryFn: () =>
      getAllProfiles({
        page: currentPage,
        limit: LIMIT,
        search: debouncedSearch,
        name: filters.name,
        nickname: filters.nickname,
      }),
    enabled: hasMore,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      // Only reset profiles and page if search query actually changed (not on initial mount)
      if (!isInitialMount.current) {
        setCurrentPage(1);
        setAllProfiles([]);
        setHasMore(true);
      } else {
        isInitialMount.current = false;
      }
    }, 500); // 500ms delay

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

  // Effect to accumulate profiles data
  useEffect(() => {
    if (profileData && !profileLoading) {
      const newData: UserProfile[] = profileData.data?.[bucket] || [];
      if (currentPage === 1) {
        setAllProfiles(newData);
      } else {
        setAllProfiles((prev) => {
          // Avoid duplicates by checking if data is already added
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNewData = newData.filter((p) => !existingIds.has(p.id));
          return uniqueNewData.length > 0 ? [...prev, ...uniqueNewData] : prev;
        });
      }
      setHasMore(
        currentPage <
          (profileData?.meta?.pagination?.[bucket]?.total_pages || 1)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Always-current refs so the observer callback is never stale
  const hasMoreRef = useRef(hasMore);
  const isFetchingRef = useRef(isFetching);
  hasMoreRef.current = hasMore;
  isFetchingRef.current = isFetching;

  // Re-attach observer whenever the profile list changes length
  // (covers initial mount, new pages arriving, and search resets)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !isFetchingRef.current
        ) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0, rootMargin: "0px 0px 300px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [allProfiles.length]);

  // Only show full-page loader on initial load
  if (profileLoading && currentPage === 1 && allProfiles.length === 0) {
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
                    const hasActiveFilters = filters.name || filters.nickname;
                    setFilters({ name: "", nickname: "", user_type: "" });
                    setClearFiltersKey((prev) => prev + 1);
                    if (hasActiveFilters) {
                      setCurrentPage(1);
                      setAllProfiles([]);
                      setHasMore(true);
                    }
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
                setCurrentPage(1);
                setAllProfiles([]);
                setHasMore(true);
                setOpen(false);
              }}
              initialValues={filters}
              onDirtyChange={setIsFilterDirty}
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
              {isFetching && <Loader />}
              {!hasMore && (
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
