"use client";

import HomepageBannerClient from "@/features/home/components/HomepageBannerClient";
import CmsPageView from "@/features/cms/components/CmsPageView";
import WhyForsa from "@/features/home/components/WhyForsa";
import Founders from "./Founders";
import HowForsaWork from "./HowForsaWork";
import type { WhyFursaItem } from "@/lib/api/cms";

interface AboutUsProps {
  /** Sanitized `GET /pages/about/` content, or null when the page is unpublished. */
  page: {
    titleEn: string | null;
    titleAr: string | null;
    contentEn: string;
    contentAr: string;
  } | null;
  whyFursa: WhyFursaItem[];
}

export default function AboutUs({ page, whyFursa }: AboutUsProps) {
  return (
    <>
      <HomepageBannerClient />
      {page && (
        <CmsPageView
          titleEn={page.titleEn}
          titleAr={page.titleAr}
          contentEn={page.contentEn}
          contentAr={page.contentAr}
          withBanner={false}
          withBorder={false}
        />
      )}
      <WhyForsa items={whyFursa} />
      <Founders />
      <HowForsaWork />
    </>
  );
}
