"use client";

/**
 * HomepageBannerClient — client-side banner for screens that render entirely on
 * the client (authenticated homepage, FAQ, CMS pages).
 *
 * Reads the same `GET /home/` payload as the server-rendered `Banner`, through
 * the shared React Query cache.
 */
import BannerCarousel from "./BannerCarousel";
import { useHomeCms } from "@/features/cms/hooks/useHomeCms";
import type { HomeStatistics } from "@/lib/api/cms";

const FALLBACK_STATS: HomeStatistics = {
  volunteer_count: 0,
  volunteer_team_count: 0,
  organization_count: 0,
};

export default function HomepageBannerClient() {
  const { cms } = useHomeCms();

  return (
    <BannerCarousel
      banners={cms?.hero?.banners ?? []}
      statistics={cms?.statistics ?? FALLBACK_STATS}
      heroTitleEn={cms?.hero?.title_en}
      heroTitleAr={cms?.hero?.title_ar}
    />
  );
}
