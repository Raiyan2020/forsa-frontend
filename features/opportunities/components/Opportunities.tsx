"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Searchbar from "@/components/ui/Searchbar";
import { Button } from "@/components/ui/Button";
import { TiPlus } from "react-icons/ti";
import VolunteerCard from "@/features/home/components/VolunteerCard";
import Title from "@/components/shared/Title";
import SponsorsClient from "@/features/home/components/SponsorsClient";
import OpportunityTypeModal from "./OpportunityTypeModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import OpportuniteFilterModal, {
  AllOpportunitiesFiltersData,
} from "./AllOpportuniteFilterModal";
import { useQuery } from "@tanstack/react-query";
import {
  getOpportunitiesList,
  getLearnServeOpportunitiesList,
} from "@/features/services/api";
import { useAuthStore } from "@/store/authStore";
import moment from "moment";

export default function Opportunities() {
  const { t } = useTranslation();
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const [filters, setFilters] = useState<AllOpportunitiesFiltersData>({
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
  });

  const queryParamsForOpportunity = {
    page: 1,
    limit: 6,
    search: debouncedSearch,
    start_date: filters?.startDate ? moment(filters.startDate).format("YYYY-MM-DD") : undefined,
    end_date: filters?.endDate ? moment(filters.endDate).format("YYYY-MM-DD") : undefined,
    tags: filters?.tags,
    location: filters?.location,
    gender: filters?.gender,
    min_age: typeof filters?.age?.[0] === "number" ? filters.age[0] : undefined,
    max_age: typeof filters?.age?.[1] === "number" ? filters.age[1] : undefined,
    opportunity_nationality: filters?.opportunity_nationality,
    type: filters?.type,
    is_relief: filters?.isRelief || undefined,
    is_urgent: filters?.isUrgent || undefined,
    is_supports_disabled: filters?.isSpecialNeed || undefined,
    match_my_interest: filters?.matchMyInterest || undefined,
    status: filters?.status,
  };

  const queryParamsForLearnServe = {
    page: 1,
    limit: 6,
    search: debouncedSearch,
    start_date: filters?.startDate ? moment(filters.startDate).format("YYYY-MM-DD") : undefined,
    end_date: filters?.endDate ? moment(filters.endDate).format("YYYY-MM-DD") : undefined,
    tags: filters?.tags,
    location: filters?.location,
    gender: filters?.gender,
    min_age: typeof filters?.age?.[0] === "number" ? filters.age[0] : undefined,
    max_age: typeof filters?.age?.[1] === "number" ? filters.age[1] : undefined,
    opportunity_nationality: filters?.opportunity_nationality,
    type: filters?.type,
    in_person: filters?.isInPerson || undefined,
    online: filters?.isOnline || undefined,
    match_my_interest: filters?.matchMyInterest || undefined,
    status: filters?.status,
  };

  const { data: opportunityData, refetch: opportinityRefetch } = useQuery({
    queryKey: ["opportunities-check", queryParamsForOpportunity],
    queryFn: () => getOpportunitiesList(queryParamsForOpportunity),
  });

  const { data: learnServeData, refetch: learnserveRefetch } = useQuery({
    queryKey: ["learnserve-check", queryParamsForLearnServe],
    queryFn: () => getLearnServeOpportunitiesList(queryParamsForLearnServe),
  });

  const handleOpportunityTypeSelect = (type: "volunteer" | "learn-serve") => {
    setOpportunityModalOpen(false);
    if (type === "volunteer") {
      router.push("/volunteer-form");
    } else if (type === "learn-serve") {
      router.push("/learn-and-share-form");
    }
  };

  const handleApplyFilters = (newFilters: AllOpportunitiesFiltersData) => {
    setFilters(newFilters);
    setOpen(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasOpportunityData =
    opportunityData?.data && opportunityData?.data?.length > 0;

  const hasLearnServeData =
    learnServeData?.data && learnServeData?.data?.length > 0;

  useEffect(() => {
    opportinityRefetch();
    learnserveRefetch();
  }, [filters, debouncedSearch, opportinityRefetch, learnserveRefetch]);

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
          showLearnServeFields={true}
          showVolunteerFields={true}
        />
      </Modal>

      <OpportunityTypeModal
        open={opportunityModalOpen}
        onClose={() => setOpportunityModalOpen(false)}
        onSelect={handleOpportunityTypeSelect}
      />

      <div className="border-t border-[#000] opp-itm opp-itm-shadow">
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] mx-auto relative">
          <div className="flex justify-between items-center mobilescreen:flex-col mobilescreen:gap-5 2xl:px-5 px-3 mobilescreen:px-[13px]">
            <div className="w-[668px] mobilescreen:w-[100%]">
              <Searchbar
                onFilterClick={() => setOpen(true)}
                onSearchChange={(value) => setSearchQuery(value)}
              />
            </div>
            {user &&
              user?.is_verified === true &&
              user?.user_type === "organization" && (
                <Button
                  variant="primary"
                  onClick={() => setOpportunityModalOpen(true)}
                  className="w-[200px] mobilescreen:w-[100%] xss:rounded-[20px] h-[60px] 2xl:h-[60px] 2xl:w-[280px] lg:w-[250px] md:w-[400px] rounded-[30px] mediumscreen1:w-[300px]"
                  type="button"
                >
                  <TiPlus />
                  {t("COMMON.CREATE.AN.OPPORTUNITIES")}
                </Button>
              )}
          </div>

          <div className="pt-[40px] dotlist-white">
            <h1 className="flex 2xl:px-5 px-3 mobilescreen:px-[13px]">
              <Title text={t("COMMON.OPPORTUNITIES")} variant="default" />
            </h1>

            <div className="2xl:px-5 px-3 mobilescreen:px-[13px] flex justify-between items-center">
              <h2 className="2xl:text-[40px] laptopmain:text-[36px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-802 font-bold leading-none">
                {t("COMMON.VOLUNTEER")}
              </h2>
              {hasOpportunityData && (
                <Link
                  href="/volunteer-opportunities-list"
                  className="text-primary-802 font-bold text-base"
                >
                  {t("COMMON.SHOW.ALL")}
                </Link>
              )}
            </div>

            <VolunteerCard
              buttonText={undefined}
              isOpportunity
              currentUser={user}
              filters={filters}
              searchQuery={debouncedSearch}
              is_homepage={true}
            />
          </div>
        </div>
      </div>

      <div className="py-[40px] bg-[#F0F0F0] opp-itm-shadow">
        <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative dotlist-white">
          <div className="2xl:px-5 px-3 mobilescreen:px-[13px] flex justify-between items-center">
            <h2 className="2xl:text-[40px] laptopmain:text-[36px] lg:text-[32px] md:text-[30px] text-[24px] text-primary-803 font-bold">
              {t("COMMON.LEARN.SERVE")}
            </h2>
            {hasLearnServeData && (
              <Link
                href="/learn-and-share-list"
                className="text-primary-803 font-bold text-base"
              >
                {t("COMMON.SHOW.ALL")}
              </Link>
            )}
          </div>

          <VolunteerCard
            buttonText={undefined}
            isLearnServe
            currentUser={user}
            filters={filters}
            searchQuery={debouncedSearch}
            is_homepage={true}
          />
        </div>
      </div>

      <div className="2xl:pt-[70px] laptopmain:pt-[40px] lg:pt-[40px] md:pt-[40px] pt-[40px]">
        <SponsorsClient />
      </div>
    </>
  );
}
