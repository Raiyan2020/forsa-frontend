"use client";

import "react-multi-carousel/lib/styles.css";
import { useTranslation } from "react-i18next";
import Title from "./Title";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import CommunityCard from "./CommunityCard";
import { useState } from "react";
import type { CommunityPost } from "@/lib/api/server";

interface VolunteerContributionsProps {
  /** Pre-fetched posts from the server (optional — client fetches if absent) */
  initialPosts?: CommunityPost[];
}

export default function VolunteerContributions({
  initialPosts = [],
}: VolunteerContributionsProps) {
  const { t } = useTranslation();
  const [navigationVisibility, setNavigationVisibility] = useState(false);

  // Client-side query initialised with server data — no extra network call on mount
  const { data: postsData, refetch } = useQuery({
    queryKey: ["community-posts-homepage"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/posts/", {
        params: { page: 1, limit: 6 },
      });
      return data;
    },
    initialData: { data: initialPosts },
    staleTime: 2 * 60 * 1000, // treat server data as fresh for 2 min
  });

  return (
    <div className="bg-[#1A1A66] mobilescreen:pb-[40px] pb-[40px] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px] relative volunteercontributions dotlist">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative">
        {/* Heading */}
        <div className="flex justify-between items-center mb-[25px] 2xl:mb-[50px] laptop:mb-[40px] lg:mb-[24px] md:mb-[30px] 2xl:px-5 px-3 mobilescreen:px-[13px]">
          <h2>
            <Title
              text={t("COMMON.FORSA.COMMUNITY-")}
              variant="white"
              hasMargin={false}
            />
          </h2>

          {navigationVisibility && (
            <Link
              href="/Community-List"
              className="text-white font-bold lg:text-lg md:text-lg text-base 2xl:text-xl"
              aria-label={t("COMMON.SHOW_ALL_COMMUNITY_POSTS")}
            >
              {t("COMMON.SHOW.ALL")}
            </Link>
          )}
        </div>
        <CommunityCard
          posts={postsData?.data || []}
          onNavigationVisibilityChange={(isVisible) =>
            setNavigationVisibility(isVisible)
          }
          refetch={refetch}
        />
      </div>
    </div>
  );
}
