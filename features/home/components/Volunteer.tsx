"use client";

import { useTranslation } from "react-i18next";
import VolunteerCard from "./VolunteerCard";
import Title from "./Title";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import type { HomeOpportunity } from "@/lib/api/server";

interface VolunteerProps {
  /** Pre-fetched opportunities from the server (optional — client fetches if absent) */
  initialOpportunities?: HomeOpportunity[];
}

export default function Volunteer({ initialOpportunities = [] }: VolunteerProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const hasNoOpportunities = initialOpportunities.length === 0;

  return (
    <div className="border-b border-b-[#000000]/20 relative">
      <div className="profilevolunteer 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto 2xl:py-[70px] laptopmain:py-[50px] py-[40px] lg:py-[40px] mobilescreen:py-[40px] relative dotlist-white">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] flex justify-between items-center">
          <h2>
            <Title
              text={t("COMMON.VOLUNTEER")}
              variant="blue"
              hasMargin={false}
            />
          </h2>
          {!hasNoOpportunities && (
            <Link
              href="/volunteer-opportunities-list"
              className="text-primary-802 font-bold lg:text-lg md:text-lg text-base 2xl:text-xl"
              aria-label={t("COMMON.SHOW_ALL_VOLUNTEER_OPPORTUNITIES")}
            >
              {t("COMMON.SHOW.ALL")}
            </Link>
          )}
        </div>
        <VolunteerCard
          isOpportunity
          currentUser={user}
          buttonText={undefined}
          is_homepage={true}
          initialData={initialOpportunities}
        />
      </div>
    </div>
  );
}
