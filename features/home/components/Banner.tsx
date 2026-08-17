/**
 * Banner — Server Component
 *
 * Hero slides, headline and platform statistics all come from the CMS
 * (`GET /home/`, ISR 60 s) so the first banner image is present in the initial
 * HTML response. The browser can therefore start downloading the LCP image as
 * soon as the first byte arrives.
 *
 * Interactive behaviour (auto-advance, dot clicks) lives in BannerCarousel.
 */
import { fetchHomeCms } from "@/lib/api/server";
import type { HomeStatistics } from "@/lib/api/cms";
import BannerCarousel from "./BannerCarousel";

const FALLBACK_STATS: HomeStatistics = {
  volunteer_count: 0,
  volunteer_team_count: 0,
  organization_count: 0,
};

export default async function Banner() {
  const cms = await fetchHomeCms();

  return (
    <BannerCarousel
      banners={cms?.hero?.banners ?? []}
      statistics={cms?.statistics ?? FALLBACK_STATS}
      heroTitleEn={cms?.hero?.title_en}
      heroTitleAr={cms?.hero?.title_ar}
    />
  );
}
