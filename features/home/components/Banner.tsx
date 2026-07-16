/**
 * Banner — Server Component
 *
 * Data is fetched on the server (ISR, revalidate 60 s) so the first banner
 * image is present in the initial HTML response.  The browser can therefore
 * start downloading the LCP image as soon as the first byte arrives —
 * eliminating the previous client-side waterfall (hydration → API call → render).
 *
 * Interactive behaviour (auto-advance, dot clicks) lives in BannerCarousel.
 */
import { fetchBannerData } from "@/lib/api/server";
import BannerCarousel from "./BannerCarousel";

const FALLBACK_STATS = {
  volunteer_count: 0,
  volunteer_team_count: 0,
  organization_count: 0,
};

export default async function Banner() {
  const data = await fetchBannerData();

  const bannerImages = data?.banner_images ?? [];
  const statistics = data?.statistics ?? FALLBACK_STATS;

  return (
    <BannerCarousel bannerImages={bannerImages} statistics={statistics} />
  );
}
