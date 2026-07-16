"use client";

/**
 * HomepageBannerClient — client-side banner for the authenticated homepage.
 *
 * Fetches banner images and statistics via React Query (same cache key as
 * the server-fetched data, so if the public homepage already populated the
 * cache the data is reused immediately).
 */
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import BannerCarousel from "./BannerCarousel";
import type { BannerImage, BannerStatistics } from "@/lib/api/server";

const FALLBACK_STATS: BannerStatistics = {
  volunteer_count: 0,
  volunteer_team_count: 0,
  organization_count: 0,
};

export default function HomepageBannerClient() {
  const { data } = useQuery({
    queryKey: ["banner-images"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/banner-images/");
      return data;
    },
    staleTime: 60 * 1000,
  });

  const bannerImages: BannerImage[] =
    data?.data?.banner_images?.map((item: any) => ({
      image: item.image,
      banner_url: item.banner_url,
    })) ?? [];

  const statistics: BannerStatistics = data?.data?.statistics ?? FALLBACK_STATS;

  return <BannerCarousel bannerImages={bannerImages} statistics={statistics} />;
}
