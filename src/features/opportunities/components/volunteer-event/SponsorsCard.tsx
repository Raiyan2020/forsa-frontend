"use client";

import OpportunitySponsors from "../OpportunitySponsors";
import type { OpportunitySponsorImage } from "./types";

/** The opportunity's own sponsors, in the organizer column. */
export default function SponsorsCard({
  sponsors,
}: {
  sponsors?: OpportunitySponsorImage[];
}) {
  if (!sponsors?.length) return null;

  return (
    <div className="mobilescreen:bottom-[50px] sponseritm bg-[#DBDBDB] 2xl:bottom-[100px] lg:bottom-[100px] md:bottom-[60px] relative 2xl:p-[50px] laptopmain:px-12 laptops:px-10 lg:p-[30px] p-[30px]">
      <OpportunitySponsors
        sponsors={sponsors.map((sponsor) => ({
          id: Number(sponsor.id),
          image: sponsor.image,
          organization: sponsor.organization,
          position: sponsor.position,
        }))}
      />
    </div>
  );
}
