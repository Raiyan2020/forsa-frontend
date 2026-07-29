"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { TiPlus } from "react-icons/ti";
import Searchbar from "@/components/ui/Searchbar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Title from "@/components/shared/Title";
import SponsorsClient from "@/features/home/components/SponsorsClient";
import { useAuthStore } from "@/store/authStore";
import AllEventFilterModal, {
  AllEventsFiltersData,
} from "./AllEventFilterModal";
import EventListCard from "./EventListCard";

const EMPTY_FILTERS: AllEventsFiltersData = {
  startDate: "",
  endDate: "",
  tags: [],
  location: "",
  gender: "",
  age: [null, null],
  type: "",
  participation_type: "",
  matchMyInterest: false,
  status: "",
};

interface EventCategoryListProps {
  /** `event_type` value the API filters on, e.g. "Hub", "Camps". */
  eventType: string;
  /** Translation key for the section heading. */
  titleKey: string;
}

/**
 * Shared body for the four event-category pages (seminars, exhibitions,
 * sports activities and camps). In the React app each page was a verbatim copy
 * of this markup that differed only in `event_type` and the heading key.
 */
export default function EventCategoryList({
  eventType,
  titleKey,
}: EventCategoryListProps) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isOrganization = user?.user_type === "organization";
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const [filters, setFilters] = useState<AllEventsFiltersData>(EMPTY_FILTERS);

  const handleApplyFilters = (newFilters: AllEventsFiltersData) => {
    setFilters(newFilters); // Update filters state
    setOpen(false); // Close the modal
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
                // Trigger form submission manually if needed, or rely on modal's onSubmit
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
                setFilters(EMPTY_FILTERS);
                setClearFiltersKey((prev) => prev + 1);
              }}
              type="button"
            >
              {t("COMMON.CLEAR")}
            </Button>
          </div>
        }
      >
        <AllEventFilterModal
          key={clearFiltersKey}
          onApply={handleApplyFilters}
          initialValues={filters}
          onDirtyChange={setIsFilterDirty}
          isInnerModal={true}
        />
      </Modal>

      <div className="border-t border-[#000] opp-itm-shadow">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px] relative">
          {/* search bar */}
          <div className="flex justify-between items-center mobilescreen:flex-col mobilescreen:gap-5">
            <div className="w-[668px] mobilescreen:w-[100%]">
              <Searchbar
                onSearchChange={(value) => setSearchQuery(value)}
                onFilterClick={() => setOpen(true)}
              />
            </div>
            {isOrganization &&
              user &&
              user?.is_verified === true &&
              user?.is_banned !== true && (
                <Link
                  className="w-[200px] mobilescreen:w-[100%] xss:rounded-[20px] h-[60px] 2xl:h-[60px] 2xl:w-[280px] lg:w-[250px] md:w-[380px] rounded-[30px] mediumscreen1:w-[260px] font-bold text-base bg-primary-5 text-white flex items-center justify-center gap-2"
                  href="/event-form"
                >
                  <TiPlus />
                  {t("COMMON.CREATE.EVENTS")}
                </Link>
              )}
          </div>

          {/* event list */}
          <div className="2xl:pt-[70px] laptopmain:pt-[50px] laptop:pt-[40px] pt-[40px] dotlist-white horizontal_scroll">
            <h1 className="flex">
              <Title
                text={t(titleKey)}
                variant="default"
                className="setpadding !mb-7"
              />
            </h1>

            <EventListCard
              event_type={eventType}
              filters={filters}
              searchQuery={debouncedSearch}
            />
          </div>
        </div>
      </div>

      {/* forsa sponsors */}
      <div className="border-secondary-100/20 border-t 2xl:pt-[70px] pt-[40px] laptopmain:pt-[50px] laptop:pt-[40px] lg:pt-[40px] mobilescreen:pt-[40px]">
        <SponsorsClient />
      </div>
    </>
  );
}
