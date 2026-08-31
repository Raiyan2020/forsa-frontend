"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import Title from "@/components/shared/Title";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getSponsors } from "@/features/partners/services/partnersApi";
import { getDropdownChoices } from "@/features/shared/services/dropdowns";
import Loader from "@/components/ui/Loader";
import { useLanguageStore } from "@/store/languageStore";
import HomepageBannerClient from "@/features/home/components/HomepageBannerClient";

const responsive = {
  superLargeDesktop: { breakpoint: { max: 4000, min: 1200 }, items: 4 },
  desktop: { breakpoint: { max: 1200, min: 992 }, items: 3 },
  tablet: { breakpoint: { max: 992, min: 576 }, items: 3 },
  mobile: { breakpoint: { max: 576, min: 0 }, items: 2 },
};

const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] =
    useState<keyof typeof responsive>("mobile");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1200) {
        setBreakpoint("superLargeDesktop");
      } else if (width >= 992) {
        setBreakpoint("desktop");
      } else if (width >= 576) {
        setBreakpoint("tablet");
      } else {
        setBreakpoint("mobile");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { breakpoint, items: responsive[breakpoint]?.items };
};

export default function Partner() {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);

  const { data, isLoading } = useQuery({
    queryKey: ["sponsors"],
    queryFn: getSponsors,
  });

  const { isLoading: sponsorTypeLoading } = useQuery({
    queryKey: ["dropdownChoices", "sponsor_type"],
    queryFn: () => getDropdownChoices("sponsor_type"),
    enabled: !!selectedLanguage,
  });

  const { items: itemsPerBreakpoint } = useBreakpoint();

  const getColorForSponsorType = (type: string) => {
    switch (type.toLowerCase()) {
      case "media":
        return "#5271FF";
      case "gold":
        return "#29246D";
      case "silver":
        return "#FC9555";
      case "bronze":
        return "#70B4C2";
      case "in-kind":
        return "#6D429ADB";
      default:
        return "#5271FF";
    }
  };

  const sponsorCategories = [
    {
      title: t("COMMON.FORSA.SPONSOR"),
      subtitle: t("COMMON.ADS_MEDIA.SPONSOR"),
      type: "media",
      sponsors:
        data?.data
          ?.filter((sponsor: any) =>
            sponsor?._sponsor_type?.value_en?.toLowerCase()?.includes("media")
          )
          .map((sponsor: { org_name: string; sponsor_logo: string }) => ({
            name: sponsor?.org_name,
            logo: sponsor?.sponsor_logo,
          })) || [],
    },
    {
      title: t("COMMON.FORSA.SPONSOR"),
      subtitle: t("COMMON.GOLD.SPONSOR"),
      type: "gold",
      sponsors:
        data?.data
          ?.filter(
            (sponsor: any) =>
              sponsor?._sponsor_type?.value_en === "Financial sponsor" &&
              sponsor?._type_of_support?.value_en === "Gold"
          )
          .map((sponsor: { org_name: string; sponsor_logo: string }) => ({
            name: sponsor?.org_name,
            logo: sponsor?.sponsor_logo,
          })) || [],
    },
    {
      title: t("COMMON.FORSA.SPONSOR"),
      subtitle: t("COMMON.SILVER.SPONSOR"),
      type: "silver",
      sponsors:
        data?.data
          ?.filter(
            (sponsor: any) =>
              sponsor?._sponsor_type?.value_en === "Financial sponsor" &&
              sponsor?._type_of_support?.value_en === "Silver"
          )
          .map((sponsor: { org_name: string; sponsor_logo: string }) => ({
            name: sponsor?.org_name,
            logo: sponsor?.sponsor_logo,
          })) || [],
    },
    {
      title: t("COMMON.FORSA.SPONSOR"),
      subtitle: t("COMMON.BRONZE.SPONSOR"),
      type: "bronze",
      sponsors:
        data?.data
          ?.filter(
            (sponsor: any) =>
              sponsor?._sponsor_type?.value_en === "Financial sponsor" &&
              sponsor?._type_of_support?.value_en === "Bronze"
          )
          .map((sponsor: { org_name: string; sponsor_logo: string }) => ({
            name: sponsor?.org_name,
            logo: sponsor?.sponsor_logo,
          })) || [],
    },
    {
      title: t("COMMON.FORSA.SPONSOR"),
      subtitle: t("COMMON.IN-KIND SUPPORT.SPONSOR"),
      type: "in-kind",
      sponsors:
        data?.data
          ?.filter((sponsor: any) =>
            sponsor?._sponsor_type?.value_en?.toLowerCase()?.includes("supporting")
          )
          .map((sponsor: { org_name: string; sponsor_logo: string }) => ({
            name: sponsor?.org_name,
            logo: sponsor?.sponsor_logo,
          })) || [],
    },
  ];

  const filteredSponsorCategories = sponsorCategories.filter(
    (category) => category.sponsors.length > 0
  );

  return (
    <>
      <HomepageBannerClient />
      {!isLoading && !sponsorTypeLoading ? (
        <section
          className="2xl:pb-[70px] laptop:pb-[40px] pb-[40px] sponsersitm dotlist-white"
          dir="rtl"
        >
          <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto">
            <h2>
              <Title
                text={`${t("COMMON.PARTNERS.IN.SUCCESS")}`}
                variant="default"
              />
            </h2>
            {filteredSponsorCategories?.length > 0 ? (
              filteredSponsorCategories?.map((category, categoryIndex) => (
                <div key={categoryIndex} className="2xl:mb-12 mb-5">
                  <h3
                    className="font-bold 2xl:text-[35px] text-[24px] pb-[20px] text-center"
                    style={{
                      color: getColorForSponsorType(category.type),
                    }}
                  >
                    {category.subtitle}
                  </h3>

                  <div className="flex justify-center relative">
                    <div className="w-full 2xl:pb-[40px] laptop:pb-[5px] pb-[5px] px-4 sm:px-0">
                      {category.sponsors.length > (itemsPerBreakpoint || 3) ? (
                        <div className={`flex gap-16 justify-center`}>
                          <Carousel
                            responsive={responsive}
                            infinite={true}
                            autoPlay={true}
                            showDots={true}
                            autoPlaySpeed={2000}
                            keyBoardControl={true}
                            customTransition="all .5s"
                            transitionDuration={500}
                            containerClass="carousel-container w-full"
                            arrows={false}
                            dotListClass="custom-dot-list-style"
                            itemClass={`flex justify-center items-center px-4 sm:px-6 md:px-8`}
                            centerMode={false}
                            partialVisible={false}
                          >
                            {category.sponsors.map(
                              (
                                sponsor: { logo: string; name: string },
                                sponsorIndex: number
                              ) => (
                                <div
                                  key={sponsorIndex}
                                  className="flex justify-center items-center w-full"
                                >
                                  <img
                                    src={sponsor.logo}
                                    alt={`${sponsor.name} logo`}
                                    className="object-contain w-[120px] h-[90px] sm:w-[150px] sm:h-[110px]"
                                  />
                                </div>
                              )
                            )}
                          </Carousel>
                        </div>
                      ) : (
                        <div className={`flex gap-16 justify-center`}>
                          {category.sponsors.map(
                            (
                              sponsor: { logo: string; name: string },
                              sponsorIndex: number
                            ) => (
                              <div
                                key={sponsorIndex}
                                className="flex justify-center px-4 sm:px-6 md:px-8"
                              >
                                <img
                                  src={sponsor.logo}
                                  alt={`${sponsor.name} logo`}
                                  className="object-contain w-[120px] h-[90px] sm:w-[150px] sm:h-[110px]"
                                />
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {categoryIndex < filteredSponsorCategories.length - 1 && (
                    <div className="w-full 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto mt-8 border-b border-[#00000066]/40"></div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center mb-5">{t("COMMON.NO_SPONSORS")}</p>
            )}

            <div className="flex justify-center">
              <Link href="/sponsorship-form">
                <Button variant="primary" className="!w-[220px]" size="medium">
                  {t("COMMON.JOIN.OUR.PARTNERS")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <Loader />
      )}
    </>
  );
}
