"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import InfiniteScroll from "react-infinite-scroll-component";
import { FiDownload, FiShare2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import Searchbar from "@/components/ui/Searchbar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import ProfileEventCard from "@/features/events/components/ProfileEventCard";
import { downloadUserCertificate, getUserCertificates } from "@/features/profile/services/profileApi";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import ProfileFilterForm, {
  EMPTY_PROFILE_FILTERS,
  FiltersData,
} from "./ProfileFilterForm";
import ProfileVolunteerCard from "./ProfileVolunteerCard";

const TAB_TRIGGER_CLASS =
  "xsl:w-[150px] xss:w-[110px] shrink-0 relative px-6 xs:px-2 2xl:py-5 lg:py-3 md:py-3 py-3 xss:py-3 laptopmain:py-5 rounded-t-[20px] rounded-b-[0px] data-[state=active]:bg-white border-t border-l border-r data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-primary-5 data-[state=inactive]:border-primary-5 data-[state=active]:text-primary-5 data-[state=active]:font-bold data-[state=inactive]:bg-[#D2D8F6] before:content-[''] before:absolute before:top-[96%] data-[state=active]:before:top-[99%] before:left-0 before:w-full before:h-[3px] before:bg-[#D2D8F6] before:hidden data-[state=active]:before:block data-[state=active]:before:bg-[#fff] after:content-[''] after:absolute after:w-[16px] after:bg-primary-5 after:left-[-16px] rtl:after:left-[0] rtl:after:right-[-16px] after:bottom-[-1px] after:block";

/**
 * The opportunity tabs split by type on top of the organized/sponsored tag.
 * `opportunity_type` is the value `/list-all-opportunities/` accepts.
 */
type OpportunityTypeFilter = "all" | "volunteer" | "development";

const OPPORTUNITY_TYPE_TABS: Array<{
  value: OpportunityTypeFilter;
  labelKey: string;
  param?: string;
}> = [
  { value: "all", labelKey: "COMMON.ALL" },
  { value: "volunteer", labelKey: "COMMON.VOLUNTEER", param: "volunteer_opportunity" },
  { value: "development", labelKey: "COMMON.LEARN_SERVE", param: "learn_serve_opportunity" },
];

function OpportunityTypeChips({
  value,
  onChange,
}: {
  value: OpportunityTypeFilter;
  onChange: (value: OpportunityTypeFilter) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2">
      {OPPORTUNITY_TYPE_TABS.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={`rounded-full border border-primary-5 px-4 py-2 text-sm font-bold whitespace-nowrap ${
            value === type.value
              ? "bg-primary-5 text-white"
              : "bg-white text-primary-5"
          }`}
        >
          {t(type.labelKey)}
        </button>
      ))}
    </div>
  );
}

const TAB_CONTENT_CLASS =
  "mt-0 border-t border-primary-5 2xl:pt-16 laptopmain:pt-8 lg:pt-5 pt-5 md:pt-5 lg:pb-[50px] md:pb-[20px] pb-[20px]";

interface ProfileDescriptionTabsProps {
  isVolunteerTeam: boolean;
  isPublicProfile?: boolean;
  user_id?: string;
  /**
   * A volunteer's own profile lists what they registered for and attended; a
   * team or entity lists what it organised (and sponsored).
   */
  isVolunteer?: boolean;
}

export default function ProfileDescriptionTabs({
  isVolunteerTeam = false,
  isPublicProfile = false,
  user_id,
  isVolunteer = false,
}: ProfileDescriptionTabsProps) {
  const selectedLanguage = useLanguageStore((s) => s.language);
  const { t } = useTranslation();

  return (
    <Tabs
      defaultValue="opportunity"
      dir={selectedLanguage === "en" ? "ltr" : "rtl"}
    >
      <div className="flex 2xl:px-5 px-3 mobilescreen:px-[13px]">
        <TabsList className="scrollbar-hidden h-auto max-w-full justify-start gap-[38px] overflow-x-auto bg-transparent p-0 xs:gap-3">
          <TabsTrigger value="opportunity" className={TAB_TRIGGER_CLASS}>
            <span className="2xl:text-[30px] lg:text-[20px] md:text-[18px] font-bold text-primary-5">
              {t("COMMON.OPPORTUNITIES-")}
            </span>
          </TabsTrigger>
          {isVolunteer && (
            <TabsTrigger value="certificates" className={TAB_TRIGGER_CLASS}>
              <span className="2xl:text-[30px] lg:text-[20px] md:text-[18px] font-bold text-primary-5">
                {t("COMMON.CERTIFICATES")}
              </span>
            </TabsTrigger>
          )}
          <TabsTrigger value="event" className={TAB_TRIGGER_CLASS}>
            <span className="2xl:text-[30px] lg:text-[20px] md:text-[18px] font-bold text-primary-5">
              {t("COMMON.EVENTS-")}
            </span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="opportunity" className={TAB_CONTENT_CLASS}>
        <OpportunityTabs
          isVolunteerTeam={isVolunteerTeam}
          isPublicProfile={isPublicProfile}
          user_id={user_id}
          isVolunteer={isVolunteer}
        />
      </TabsContent>

      {isVolunteer && (
        <TabsContent value="certificates" className={TAB_CONTENT_CLASS}>
          <CertificateTabs user_id={user_id} />
        </TabsContent>
      )}

      <TabsContent value="event" className={TAB_CONTENT_CLASS}>
        <MyEventsTabs
          isVolunteerTeam={isVolunteerTeam}
          isPublicProfile={isPublicProfile}
          user_id={user_id}
        />
      </TabsContent>
    </Tabs>
  );
}

interface ProfileCertificate {
  registration_id: number;
  certificate_image: string;
  opportunity__title_en?: string;
  opportunity__title_ar?: string;
}

const EMPTY_PROFILE_CERTIFICATES: ProfileCertificate[] = [];

/** Mirrors the certificate gallery from the React volunteer profile. */
function CertificateTabs({ user_id }: { user_id?: string }) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const user = useAuthStore((s) => s.user);
  const userId = user_id || user?.id?.toString();
  const pageSizeRef = useRef(9);
  const [displayedCount, setDisplayedCount] = useState(9);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ["user-certificates", userId],
    queryFn: () => getUserCertificates(userId as string),
    enabled: Boolean(userId),
  });

  const allCertificates: ProfileCertificate[] = Array.isArray(response?.data)
    ? response.data
    : EMPTY_PROFILE_CERTIFICATES;
  const certificates = allCertificates.slice(0, displayedCount);
  const hasMore = displayedCount < allCertificates.length;

  const updatePageSize = useCallback(() => {
    const width = window.innerWidth;
    const nextPageSize = width >= 1200 ? 9 : width >= 768 ? 8 : 9;
    if (pageSizeRef.current !== nextPageSize) {
      pageSizeRef.current = nextPageSize;
      setDisplayedCount(nextPageSize);
    }
  }, []);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updatePageSize);
    window.addEventListener("resize", updatePageSize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updatePageSize);
    };
  }, [updatePageSize]);

  const loadMore = useCallback(() => {
    setDisplayedCount((current) =>
      Math.min(current + pageSizeRef.current, allCertificates.length)
    );
  }, [allCertificates.length]);

  const handleDownloadCertificate = async (
    certificate: ProfileCertificate,
    index: number
  ) => {
    try {
      setDownloadingId(certificate.registration_id);
      const { blob, filename } = await downloadUserCertificate({
        registration_id: certificate.registration_id,
        fallbackName: `certificate_${index}`,
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(t("COMMON.TOAST.DOWNLOAD_IMAGE_SUCCESS"));
    } catch (error) {
      console.error("Certificate download error:", error);
      toast.error(t("COMMON.TOAST.DOWNLOAD_IMAGE_FAILED"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShareToLinkedIn = (imageUrl: string) => {
    try {
      const linkedInShareUrl =
        "https://www.linkedin.com/sharing/share-offsite/?url=" +
        encodeURIComponent(imageUrl);
      window.open(linkedInShareUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error sharing certificate to LinkedIn:", error);
      toast.error(t("COMMON.TOAST.SHARE_FAILED"));
    }
  };

  if (isLoading) {
    return <Loader inline className="py-20" />;
  }

  if (allCertificates.length === 0) {
    return (
      <p className="py-8 text-center text-lg font-medium text-secondary-102">
        {t("COMMON.NO_CERTIFICATES_AVAILABLE")}
      </p>
    );
  }

  return (
    <InfiniteScroll
      dataLength={certificates.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<Loader inline className="py-8" />}
      endMessage={
        <p className="pb-2 pt-8 text-center text-secondary-102">
          {t("COMMON.NO_MORE_CERTIFICATES")}
        </p>
      }
      className="overflow-hidden pt-[25px] md:pt-[30px] lg:pt-[24px] laptop:pt-[40px] 2xl:pt-[50px]"
    >
      <div className="grid grid-cols-1 gap-[25px] md:grid-cols-2 xl:grid-cols-3">
        {certificates.map((certificate, index) => {
          const title =
            (selectedLanguage === "ar"
              ? certificate.opportunity__title_ar
              : certificate.opportunity__title_en) ||
            t("COMMON.CERTIFICATE-");
          const isDownloading = downloadingId === certificate.registration_id;

          return (
            <div
              key={`${certificate.registration_id}-${index}`}
              className="mobilescreen:pb-6"
            >
              <div className="relative w-full">
                <a
                  href={certificate.certificate_image}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={title}
                >
                  <Image
                    src={certificate.certificate_image}
                    alt={title}
                    width={800}
                    height={566}
                    unoptimized
                    className="h-auto w-full cursor-pointer rounded-lg shadow-md transition-shadow hover:shadow-xl"
                  />
                </a>

                {user && (
                  <div className="absolute end-2 top-2 flex gap-2">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400 bg-white text-blue-500 shadow transition-all duration-200 hover:scale-110 hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                      onClick={() =>
                        handleDownloadCertificate(certificate, index)
                      }
                      disabled={isDownloading}
                      title={t("COMMON.DOWNLOAD_CERTIFICATE")}
                      aria-label={t("COMMON.DOWNLOAD_CERTIFICATE")}
                    >
                      {isDownloading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      ) : (
                        <FiDownload size={16} aria-hidden="true" />
                      )}
                    </button>

                    {user.id.toString() === userId && (
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400 bg-white text-blue-500 shadow transition-all duration-200 hover:scale-110 hover:bg-blue-100"
                        onClick={() =>
                          handleShareToLinkedIn(certificate.certificate_image)
                        }
                        title={t("COMMON.SHARE_TO_LINKEDIN")}
                        aria-label={t("COMMON.SHARE_TO_LINKEDIN")}
                      >
                        <FiShare2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </InfiniteScroll>
  );
}

/** Shared filter modal for both tab groups. */
function FilterModal({
  open,
  onClose,
  clearFiltersKey,
  formikRef,
  isFilterDirty,
  setIsFilterDirty,
  onApply,
  onClear,
  filters,
  isEventFilter,
  type,
  activeTab,
}: {
  open: boolean;
  onClose: () => void;
  clearFiltersKey: number;
  formikRef: React.RefObject<{ submitForm: () => Promise<void> } | null>;
  isFilterDirty: boolean;
  setIsFilterDirty: (dirty: boolean) => void;
  onApply: (filters: FiltersData) => void;
  onClear: () => void;
  filters: FiltersData;
  isEventFilter: boolean;
  type?: boolean;
  activeTab?: string;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("COMMON.FILTER")}
      size="md"
      footer={
        <div className="flex justify-center w-full gap-5 xss:flex-col">
          <Button
            variant="primary"
            size="medium"
            className="xss:w-full"
            type="button"
            onClick={async () => {
              if (formikRef.current) {
                await formikRef.current.submitForm();
              }
            }}
            disabled={!isFilterDirty}
          >
            {t("COMMON.APPLY")}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            className="xss:w-full"
            type="button"
            onClick={onClear}
          >
            {t("COMMON.CLEAR")}
          </Button>
        </div>
      }
    >
      <ProfileFilterForm
        key={clearFiltersKey}
        formikRef={formikRef}
        onApply={onApply}
        initialValues={filters}
        onDirtyChange={setIsFilterDirty}
        isEventFilter={isEventFilter}
        type={type}
        activeTab={activeTab}
      />
    </Modal>
  );
}

function MyEventsTabs({
  isVolunteerTeam,
  isPublicProfile = false,
  user_id,
}: ProfileDescriptionTabsProps) {
  const [activeTab, setActiveTab] = useState("organized_events");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const [filters, setFilters] = useState<FiltersData>(EMPTY_PROFILE_FILTERS);
  const formikRef = useRef<{ submitForm: () => Promise<void> } | null>(null);

  const hasAppliedFilters =
    !!filters.startDate ||
    !!filters.endDate ||
    !!filters.category ||
    !!filters.status ||
    (filters.tags?.length ?? 0) > 0 ||
    !!filters.opportunity_type ||
    !!filters.opportunity_status;

  const handleApplyFilters = (newFilters: FiltersData) => {
    setFilters(newFilters);
    setOpen(false);
  };

  useEffect(() => {
    if (isVolunteerTeam && activeTab === "sponsored_events") {
      setActiveTab("organized_events");
    }
  }, [isVolunteerTeam, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // True while the user has typed but the debounce hasn't fired yet
  const isSearching = searchQuery !== debouncedSearch;

  return (
    <>
      <FilterModal
        open={open}
        onClose={() => setOpen(false)}
        clearFiltersKey={clearFiltersKey}
        formikRef={formikRef}
        isFilterDirty={isFilterDirty}
        setIsFilterDirty={setIsFilterDirty}
        onApply={handleApplyFilters}
        onClear={() => {
          setFilters(EMPTY_PROFILE_FILTERS);
          setClearFiltersKey((prev) => prev + 1);
        }}
        filters={filters}
        isEventFilter
      />

      <div className="relative dotlist-white">
        <div className="flex justify-between items-center 2xl:px-5 px-3 mobilescreen:px-[13px] mobilescreen:block">
          <div className="flex gap-8 mobilescreen:gap-7 mobilescreen:mb-5 mobilescreen:justify-center">
            <button
              className={`pb-1 ${
                activeTab === "organized_events"
                  ? "text-primary-5 border-b-2 border-primary-5 text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-bold"
                  : "text-[#000000] text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-normal"
              }`}
              onClick={() => setActiveTab("organized_events")}
            >
              {t("COMMON.ORGANIZER_TAG")}
            </button>
            {!isVolunteerTeam && (
              <button
                className={`pb-1 ${
                  activeTab === "sponsored_events"
                    ? "text-primary-5 border-b-2 border-primary-5 text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-bold"
                    : "text-[#000000] text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-normal"
                }`}
                onClick={() => setActiveTab("sponsored_events")}
              >
                {t("COMMON.SPONSOR")}
              </button>
            )}
          </div>
          <Searchbar
            onFilterClick={() => setOpen(true)}
            onSearchChange={(value) => setSearchQuery(value)}
            hasActiveFilters={hasAppliedFilters}
            isLoading={isSearching}
            onClearFilters={() => {
              setFilters(EMPTY_PROFILE_FILTERS);
              setClearFiltersKey((prev) => prev + 1);
            }}
          />
        </div>
      </div>

      {activeTab === "organized_events" && (
        <ProfileEventCard
          filter_type="organized_events"
          filters={filters}
          searchQuery={debouncedSearch}
          currentUser={user}
          isPublicProfile={isPublicProfile}
          user_id={user_id}
        />
      )}
      {activeTab === "sponsored_events" && !isVolunteerTeam && (
        <ProfileEventCard
          filter_type="sponsored_events"
          filters={filters}
          searchQuery={debouncedSearch}
          currentUser={user}
          isPublicProfile={isPublicProfile}
          user_id={user_id}
        />
      )}
    </>
  );
}

function OpportunityTabs({
  isVolunteerTeam,
  isPublicProfile = false,
  user_id,
  isVolunteer = false,
}: ProfileDescriptionTabsProps) {
  const [activeTab, setActiveTab] = useState(
    isVolunteer ? "registered" : "organized"
  );
  const [typeFilter, setTypeFilter] = useState<OpportunityTypeFilter>("all");
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const user = useAuthStore((s) => s.user);
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const [filters, setFilters] = useState<FiltersData>(EMPTY_PROFILE_FILTERS);
  const formikRef = useRef<{ submitForm: () => Promise<void> } | null>(null);

  const hasAppliedFilters =
    !!filters.startDate ||
    !!filters.endDate ||
    !!filters.category ||
    !!filters.status ||
    (filters.tags?.length ?? 0) > 0 ||
    !!filters.opportunity_type ||
    !!filters.opportunity_status;

  // If switching to organized tab when on sponsored tab and isVolunteerTeam becomes true
  useEffect(() => {
    if (isVolunteerTeam && activeTab === "sponsored") {
      setActiveTab("organized");
    }
  }, [isVolunteerTeam, activeTab]);

  const handleApplyFilters = (newFilters: FiltersData) => {
    setFilters(newFilters);
    setOpen(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // True while the user has typed but the debounce hasn't fired yet
  const isSearching = searchQuery !== debouncedSearch;

  // The chips win over the filter modal's type when one is picked.
  const typeParam = OPPORTUNITY_TYPE_TABS.find(
    (type) => type.value === typeFilter
  )?.param;
  const typedFilters: FiltersData = typeParam
    ? { ...filters, opportunity_type: typeParam }
    : filters;

  return (
    <>
      <FilterModal
        open={open}
        onClose={() => setOpen(false)}
        clearFiltersKey={clearFiltersKey}
        formikRef={formikRef}
        isFilterDirty={isFilterDirty}
        setIsFilterDirty={setIsFilterDirty}
        onApply={handleApplyFilters}
        onClear={() => {
          setFilters(EMPTY_PROFILE_FILTERS);
          setClearFiltersKey((prev) => prev + 1);
        }}
        filters={filters}
        isEventFilter={false}
        type
      />

      <div className="relative dotlist-white">
        <div className="flex justify-between items-center 2xl:px-5 px-3 mobilescreen:px-[13px] mobilescreen:block">
          <div className="flex gap-8 mobilescreen:gap-7 mobilescreen:mb-5 mobilescreen:justify-center">
            {/* A volunteer sees Registered / Attended; a team or entity sees
                Organizer (and Sponsor, which volunteer teams don't have). */}
            {isVolunteer && (
              <button
                className={`pb-1 ${
                  activeTab === "registered"
                    ? "text-primary-5 border-b-2 border-primary-5 text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-bold"
                    : "text-[#000000] text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-normal"
                }`}
                onClick={() => setActiveTab("registered")}
              >
                {t("COMMON.REGISTERED")}
              </button>
            )}
            <button
              className={`pb-1 ${
                activeTab === "organized"
                  ? "text-primary-5 border-b-2 border-primary-5 text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-bold"
                  : "text-[#000000] text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-normal"
              }`}
              onClick={() => setActiveTab("organized")}
            >
              {t(isVolunteer ? "COMMON.ATTENDED--" : "COMMON.ORGANIZER_TAG")}
            </button>
            {!isVolunteerTeam && !isVolunteer && (
              <button
                className={`pb-1 ${
                  activeTab === "sponsored"
                    ? "text-primary-5 border-b-2 border-primary-5 text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-bold"
                    : "text-[#000000] text-[18px] 2xl:text-[25px] lg:text-[18px] md:text-[18px] xs:text-[13px] font-normal"
                }`}
                onClick={() => setActiveTab("sponsored")}
              >
                {t("COMMON.SPONSOR")}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 mobilescreen:flex-col mobilescreen:items-start">
            <OpportunityTypeChips value={typeFilter} onChange={setTypeFilter} />
            <div className="orgsearch">
              <Searchbar
                onFilterClick={() => setOpen(true)}
                onSearchChange={(value) => setSearchQuery(value)}
                hasActiveFilters={hasAppliedFilters}
                isLoading={isSearching}
                onClearFilters={() => {
                  setFilters(EMPTY_PROFILE_FILTERS);
                  setClearFiltersKey((prev) => prev + 1);
                }}
              />
            </div>
          </div>
        </div>

        {activeTab === "registered" && isVolunteer && (
          <ProfileVolunteerCard
            buttonText={undefined}
            filter_type="registered"
            filters={typedFilters}
            searchQuery={debouncedSearch}
            currentUser={user}
            isPublicProfile={isPublicProfile}
            user_id={user_id}
            type="registered"
            useNewApi
          />
        )}

        {activeTab === "organized" && (
          <ProfileVolunteerCard
            buttonText={undefined}
            filter_type="organized"
            filters={typedFilters}
            searchQuery={debouncedSearch}
            currentUser={user}
            isPublicProfile={isPublicProfile}
            user_id={user_id}
            type="organized"
            useNewApi={isVolunteer}
          />
        )}

        {activeTab === "sponsored" && !isVolunteerTeam && (
          <ProfileVolunteerCard
            buttonText={undefined}
            filter_type="sponsored"
            filters={typedFilters}
            searchQuery={debouncedSearch}
            currentUser={user}
            isPublicProfile={isPublicProfile}
            user_id={user_id}
            type="sponsored"
          />
        )}
      </div>
    </>
  );
}
