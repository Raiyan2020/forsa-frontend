"use client";

/**
 * HomepageAuthenticated — rendered only for logged-in users after hydration.
 *
 * This is a client component rendered by HomepageClientGate.
 * It MUST NOT import async Server Components directly.
 *
 * - Uses BannerCarousel (client) directly with its own useQuery for banner data
 * - Uses SponsorsClient (client) for sponsors with its own useQuery
 * - All other sections use their optional initialData props (fall back to client fetch)
 */
import SponsorsClient from "./SponsorsClient";
import Volunteer from "./Volunteer";
import VolunteerContributions from "./VolunteerContributions";
import LearnServe from "./LearnServe";
import ShareIdea from "./ShareIdea";
import Events from "./Events";
import WhyForsa from "./WhyForsa";
import HomepageBannerClient from "./HomepageBannerClient";

export default function HomepageAuthenticated() {
  return (
    <div className="organizehome">
      {/* Client-side banner carousel — fetches its own data via useQuery */}
      <HomepageBannerClient />
      <div className="organizehomes">
        {/* Client-side sponsors — fetches its own data via useQuery */}
        <SponsorsClient />
      </div>
      <WhyForsa />
      {/* Sections use optional props — fall back to their client-side React Query */}
      <Volunteer />
      <VolunteerContributions />
      <LearnServe />
      <ShareIdea />
      <Events />
    </div>
  );
}
