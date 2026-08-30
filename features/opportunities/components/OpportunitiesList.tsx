"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TiPlus } from "react-icons/ti";

import Searchbar from "@/components/ui/Searchbar";
import Button from "@/components/ui/Button";
import Title from "@/components/shared/Title";
import SponsorsClient from "@/features/home/components/SponsorsClient";
import { Modal } from "@/components/ui/Modal";
import { useAuthStore } from "@/store/authStore";
import PlacementBanner from "@/components/shared/PlacementBanner";
import OpportunityTypeModal from "./OpportunityTypeModal";
import OpportunitiesListCard from "./OpportunitiesListCard";
import OpportuniteFilterModal, { AllOpportunitiesFiltersData } from "./AllOpportuniteFilterModal";

export default function OpportunitiesList() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Get tags from URL parameters if available
  const tagsFromUrl = searchParams.get("tags");

  // Initialize with the correct filter structure
  const [filters, setFilters] = useState<AllOpportunitiesFiltersData>({
    startDate: "",
    endDate: "",
    tags: tagsFromUrl ? [tagsFromUrl] : [],
    location: "",
    gender: "",
    age: [null, null],
    opportunity_nationality: "",
    type: "",
    isRelief: false,
    isUrgent: false,
    isSpecialNeed: false,
    isInPerson: false,
    isOnline: false,
    matchMyInterest: false,
    status: "",
    sortBy: "",
  });

  useEffect(() => {
    const tagsFromUrl = searchParams.get("tags");
    if (tagsFromUrl) {
      setFilters((prev) => ({
        ...prev,
        tags: [tagsFromUrl],
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpportunityTypeSelect = () => {
    setOpportunityModalOpen(false);
  };

  const handleApplyFilters = (newFilters: AllOpportunitiesFiltersData) => {
    setFilters(newFilters);
    setOpen(false);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("COMMON.FILTER")}
        size="md"
        footer={
          <div className="flex xss:flex-col justify-center w-full gap-5">
            <Button
              variant="primary"
              size="medium"
              className="xss:!w-full"
              onClick={() => {
                const form = document.querySelector("form") as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={!isFilterDirty}
              type="button"
            >
              {t("COMMON.APPLY")}
            </Button>
            <Button
              variant="secondary"
              size="medium"
              className="xss:!w-full"
              onClick={() => {
                setFilters({
                  startDate: "",
                  endDate: "",
                  tags: [],
                  location: "",
                  gender: "",
                  age: [null, null],
                  opportunity_nationality: "",
                  type: "",
                  isRelief: false,
                  isUrgent: false,
                  isSpecialNeed: false,
                  isInPerson: false,
                  isOnline: false,
                  matchMyInterest: false,
                  status: "",
                  sortBy: "",
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
        <OpportuniteFilterModal
          key={clearFiltersKey}
          onApply={handleApplyFilters}
          initialValues={filters}
          onDirtyChange={setIsFilterDirty}
          showLearnServeFields={false}
          showVolunteerFields={true}
        />
      </Modal>

      <OpportunityTypeModal
        open={opportunityModalOpen}
        onClose={() => setOpportunityModalOpen(false)}
        onSelect={handleOpportunityTypeSelect}
      />
      <div className="border-t border-[#000]">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] opp-itm-shadow 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] py-[40px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] relative">
          <PlacementBanner placement="opportunities" />
          <div className="flex justify-between items-center mobilescreen:flex-col mobilescreen:gap-5">
            <div className="w-[668px] mobilescreen:w-[100%]">
              <Searchbar
                onFilterClick={() => setOpen(true)}
                onSearchChange={(value) => setSearchQuery(value)}
              />
            </div>

            {user &&
              user?.is_verified === true &&
              (user as any)?.is_banned !== true &&
              user?.user_type === "organization" && (
                <Link
                  className="w-[200px] mobilescreen:w-[100%] xss:rounded-[20px] h-[60px] 2xl:h-[60px] 2xl:w-[280px] lg:w-[250px] md:w-[380px] rounded-[30px] mediumscreen1:w-[260px] font-bold text-base bg-primary-5 text-white flex items-center justify-center gap-2"
                  href="/volunteer-form"
                >
                  <TiPlus /> {t("COMMON.CREATE.AN.OPPORTUNITIES")}
                </Link>
              )}
          </div>

          <div className="2xl:pt-[70px] laptopmain:pt-[50px] laptop:pt-[40px] pt-[40px] dotlist-white horizontal_scroll">
            <h1 className="flex">
              <Title text={t("COMMON.VOLUNTEER")} variant="blue" className="setpadding !mb-7" />
            </h1>
            <OpportunitiesListCard
              buttonText={undefined}
              currentUser={user}
              filters={filters}
              searchQuery={debouncedSearch}
              is_homepage={true}
              isOpportunity={true}
            />
          </div>
        </div>
      </div>

      <div className="border-secondary-100/20 border-t 2xl:pt-[70px] pt-[40px] laptopmain:pt-[50px] laptop:pt-[40px] lg:pt-[40px] mobilescreen:pt-[40px]">
        <SponsorsClient />
      </div>
    </>
  );
}
