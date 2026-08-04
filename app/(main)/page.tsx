import HomepagePublic from "../../features/home/components/HomepagePublic";
import HomepageClientGate from "../../features/home/components/HomepageClientGate";
import type { Metadata } from "next";

// ISR: page shell is statically generated and revalidated every 60 s.
// The data-fetching happens in HomepagePublic and its children with their own
// individual revalidation periods.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Fursa | Volunteer & Community Platform",
  description:
    "Fursa connects volunteers with organizations to create meaningful community impact through opportunities, events, and learning.",
};

export default function HomePage() {
  return (
    /*
     * The public homepage is a Server Component that fetches ALL its data
     * server-side in parallel — the banner image is in the first HTML byte — and
     * it is passed as children so the gate can keep it on screen until hydration
     * decides. Logged-in visitors get the authenticated view in its place.
     */
    <HomepageClientGate>
      <HomepagePublic />
    </HomepageClientGate>
  );
}
