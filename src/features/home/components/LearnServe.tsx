"use client";

import { useTranslation } from "react-i18next";
import VolunteerCard from "./VolunteerCard";
import Title from "./Title";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import type { HomeOpportunity } from "@/lib/api/server";

interface LearnServeProps {
  /** Pre-fetched opportunities from the server (optional — client fetches if absent) */
  initialOpportunities?: HomeOpportunity[];
}

export default function LearnServe({ initialOpportunities = [] }: LearnServeProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const hasNoOpportunities = initialOpportunities.length === 0;

  return (
    <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative 2xl:py-[70px] laptopmain:py-[50px] py-[40px] lg:py-[40px] mobilescreen:py-[40px] dotlist-white">
      <div className="px-[17px] flex mobilescreen:px-[13px] justify-between items-center">
        <h2>
          <Title
            text={t("COMMON.LEARN_SHARE")}
            variant="cyan"
            hasMargin={false}
          />
        </h2>
        {!hasNoOpportunities && (
          <Link
            href="/learn-and-share-list"
            className="text-primary-803 font-bold lg:text-lg md:text-lg text-base 2xl:text-xl"
            aria-label={t("COMMON.SHOW_ALL_LEARN_SERVE_OPPORTUNITIES")}
          >
            {t("COMMON.SHOW.ALL")}
          </Link>
        )}
      </div>

      <VolunteerCard
        buttonText={undefined}
        isLearnServe
        currentUser={user}
        is_homepage={true}
        initialData={initialOpportunities}
      />
    </div>
  );
}
