/**
 * HomepagePublic — Server Component
 *
 * Fetches ALL homepage data in parallel on the server using Promise.all().
 * Each section receives its pre-fetched data as a prop, so the initial HTML
 * contains real content — no client-side API waterfalls on first load.
 *
 * ISR revalidation periods:
 *   - Banner:        60 s
 *   - Sponsors:     300 s
 *   - Opportunities: 120 s
 *   - Events:        120 s
 *   - Community:     120 s
 *   - CMS content:    60 s  (hero, why-fursa, share-idea, footer)
 */
import Banner from "./Banner";
import Sponsors from "./Sponsors";
import WhyForsa from "./WhyForsa";
import Volunteer from "./Volunteer";
import VolunteerContributions from "./VolunteerContributions";
import LearnServe from "./LearnServe";
import ShareIdea from "./ShareIdea";
import Events from "./Events";

import {
  fetchHomeVolunteerOpportunities,
  fetchHomeLearnServeOpportunities,
  fetchHomeEvents,
  fetchHomeCommunityPosts,
  fetchHomeCms,
} from "@/lib/api/server";

export default async function HomepagePublic() {
  // All fetches run in parallel — total wait time = slowest single request
  const [volunteerOpps, learnServeOpps, events, posts, cms] = await Promise.all([
    fetchHomeVolunteerOpportunities(),
    fetchHomeLearnServeOpportunities(),
    fetchHomeEvents(),
    fetchHomeCommunityPosts(),
    fetchHomeCms(),
  ]);

  return (
    <>
      {/* Banner fetches its own data (ISR 60s) — has the LCP image */}
      <Banner />
      <div className="organizehomes">
        {/* Sponsors fetches its own data (ISR 300s) */}
        <Sponsors />
      </div>
      <WhyForsa items={cms?.why_fursa ?? []} />
      <Volunteer initialOpportunities={volunteerOpps} />
      <VolunteerContributions initialPosts={posts} />
      <LearnServe initialOpportunities={learnServeOpps} />
      <ShareIdea data={cms?.share_idea ?? null} />
      <Events initialEvents={events} />
    </>
  );
}
