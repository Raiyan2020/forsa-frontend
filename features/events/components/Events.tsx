"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Searchbar from "@/components/ui/Searchbar";
import { Button } from "@/components/ui/Button";
import { TiPlus } from "react-icons/ti";
import Title from "@/components/shared/Title";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import AllEventFilterModal, {
  AllEventsFiltersData,
} from "./AllEventFilterModal";
import { useAuthStore } from "@/store/authStore";
import PlacementBanner from "@/components/shared/PlacementBanner";
import EventListCard from "./EventListCard";

export default function Events() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearFiltersKey, setClearFiltersKey] = useState(0);
  const [isFilterDirty, setIsFilterDirty] = useState(false);

  const tagsFromUrl = searchParams ? searchParams.get("tags") : null;

  const [filters, setFilters] = useState<AllEventsFiltersData>({
    startDate: "",
    endDate: "",
    tags: tagsFromUrl ? [tagsFromUrl] : [],
    location: "",
    gender: "",
    age: [null, null],
    type: "",
    participation_type: "",
    matchMyInterest: false,
    status: "",
  });

  const user = useAuthStore((s) => s.user);
  const isOrganization = user?.user_type === "organization";

  useEffect(() => {
    const tagsFromUrl = searchParams ? searchParams.get("tags") : null;
    if (tagsFromUrl) {
      setFilters((prev) => ({
        ...prev,
        tags: [tagsFromUrl],
      }));
    }
  }, [searchParams]);

  const handleApplyFilters = (newFilters: AllEventsFiltersData) => {
    setFilters(newFilters);
    setOpen(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

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
                const form = document.querySelector("form") as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={!isFilterDirty}
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
                  type: "",
                  participation_type: "",
                  matchMyInterest: false,
                  status: "",
                });
                setClearFiltersKey((prev) => prev + 1);
              }}
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
          isInnerModal={false}
        />
      </Modal>

      <div className="border-t border-[#000] opp-itm-shadow">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] py-[40px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] relative">
          <PlacementBanner placement="events" />
          <div className="flex justify-between items-center mobilescreen:flex-col mobilescreen:gap-5">
            <div className="w-[668px] mobilescreen:w-[100%]">
              <Searchbar
                onSearchChange={(value) => setSearchQuery(value)}
                onFilterClick={() => setOpen(true)}
              />
            </div>

            {isOrganization &&
              user &&
              user?.is_verified === true && (
                <Link
                  className="w-[200px] mobilescreen:w-[100%] xss:rounded-[20px] h-[60px] 2xl:h-[60px] 2xl:w-[280px] lg:w-[250px] md:w-[380px] rounded-[30px] mediumscreen1:w-[260px] font-bold text-base bg-primary-5 text-white flex items-center justify-center gap-2"
                  href="/event-form"
                >
                  <TiPlus />
                  {t("COMMON.CREATE.EVENTS")}
                </Link>
              )}
          </div>

          <div className="2xl:pt-[70px] laptopmain:pt-[50px] laptop:pt-[40px] pt-[40px] dotlist-white horizontal_scroll">
            <h1 className="flex">
              <Title
                text={t("COMMON.LATEST.EVENTS")}
                variant="orange"
                className="setpadding !mb-7"
              />
            </h1>

            <EventListCard
              event_type=""
              filters={filters}
              searchQuery={debouncedSearch}
              is_homepage={true}
            />
          </div>
        </div>
      </div>
    </>
  );
}
