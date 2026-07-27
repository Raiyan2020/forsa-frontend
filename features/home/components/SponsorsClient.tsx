"use client";

/**
 * SponsorsClient — client-side sponsors section.
 *
 * Use this component when you need Sponsors inside a "use client" component
 * (e.g. the Opportunities page, HomepageAuthenticated).
 *
 * For the public homepage, use `Sponsors` (async Server Component) instead,
 * which fetches data server-side with ISR caching.
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import apiClient from "@/lib/api/client";
import SponsorsMarquee from "./SponsorsMarquee";
import Title from "./Title";

interface Sponsor {
  id: number;
  sponsor_logo: string;
  org_name: string;
}

async function fetchSponsors() {
  const { data } = await apiClient.get("/sponsors/");
  return (data?.data as Sponsor[]) ?? [];
}

export default function SponsorsClient() {
  const { t } = useTranslation();

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ["sponsors"],
    queryFn: fetchSponsors,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="w-full relative 2xl:pb-[70px] lg:pb-[40px] mobilescreen:pb-[40px] pb-[40px] mx-auto 2xl:px-0 sponsors">
      <div className="mb-[25px] 2xl:mb-[50px] laptop:mb-[40px] lg:mb-[24px] md:mb-[30px]">
        <Title text={t("COMMON.FORSA.SPONSOR")} variant="default" hasMargin={false} />
      </div>

      {isLoading ? (
        <p className="text-center mb-5">{t("COMMON.LOADING")}</p>
      ) : sponsors.length > 0 ? (
        <SponsorsMarquee sponsors={sponsors} />
      ) : null}
    </div>
  );
}
