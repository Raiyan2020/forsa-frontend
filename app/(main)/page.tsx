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
    <>
      {/*
       * Immediately SSR the public homepage for FCP / LCP.
       * HomepagePublic is a Server Component that fetches ALL data server-side
       * in parallel — the banner image is in the first HTML byte.
       */}
      <HomepagePublic />
      {/*
       * Small client island that swaps to the authenticated view after hydration.
       * Logged-out visitors see nothing from this component.
       */}
      <HomepageClientGate />
    </>
  );
}
