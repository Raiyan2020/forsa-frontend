"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import type { BannerImage, BannerStatistics } from "@/lib/api/server";

interface BannerCarouselProps {
  /** Pre-fetched banner images from the server */
  bannerImages: BannerImage[];
  /** Pre-fetched stats from the server */
  statistics: BannerStatistics;
}

export default function BannerCarousel({
  bannerImages,
  statistics,
}: BannerCarouselProps) {
  const { t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance carousel every 5 s when there are multiple slides
  useEffect(() => {
    if (bannerImages.length > 1) {
      carouselIntervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length);
      }, 5000);
    }
    return () => {
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [bannerImages.length]);

  const cards = [
    {
      img: "/assets/homepage/volunteer_register.svg",
      number: `${statistics.volunteer_count ?? 0}`,
      text: t("COMMON.VOLUNTEER--"),
      borderColor: "border-primary-200",
      textColor: "text-primary-200",
    },
    {
      img: "/assets/homepage/team.svg",
      number: `${statistics.volunteer_team_count ?? 0}`,
      text: t("COMMON.VOLUNTEER.TEAM"),
      borderColor: "border-primary-300",
      textColor: "text-primary-300",
    },
    {
      img: "/assets/homepage/organizations.svg",
      number: `${statistics.organization_count ?? 0}`,
      text: t("COMMON.ORGANIZATIONS"),
      borderColor: "border-primary-100",
      textColor: "text-primary-100",
    },
  ];

  const fallback = "/assets/homepage/baner_img.png";
  const images = bannerImages.length > 0 ? bannerImages : [{ image: fallback }];

  return (
    <div className="w-full">
      <div className="relative flex justify-center items-center">

        {/* ── Desktop Banner ────────────────────────────────── */}
        <div className="relative w-full lg:flex xl:flex mobilescreen:hidden md:hidden">
          <div className="flex items-center justify-center w-full">
            <div className="relative 2xl:w-[83%] w-[100%] rounded-3xl overflow-hidden laptopmain:w-[88%] laptop:w-[87%] lg:w-[90%] laptopitm:w-[90%] mx-auto 2xl:h-[680px] laptopmain:h-[600px] laptops:h-[550px] laptop:h-[635px] xl:h-[550px] lg:h-[500px] h-[450px]">
              {images.map((banner, index) => {
                const isFirst = index === 0;
                const img = (
                  <Image
                    src={banner.image}
                    alt={
                      t("COMMON.BANNER_IMAGE_ALT", { index: index + 1 }) ||
                      `Banner ${index + 1}`
                    }
                    fill
                    sizes="(max-width: 1024px) 100vw, 85vw"
                    className="object-cover"
                    // First image is the LCP — load immediately with high priority
                    priority={isFirst}
                    loading={isFirst ? "eager" : "lazy"}
                    fetchPriority={isFirst ? "high" : "low"}
                  />
                );

                return (
                  <div
                    key={index}
                    className={`absolute w-full h-full transition-opacity duration-500 ${
                      index === currentImageIndex
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                    // Non-visible slides must not be reachable via keyboard/AT
                    aria-hidden={index !== currentImageIndex ? true : undefined}
                  >
                    {banner.banner_url ? (
                      <a
                        href={banner.banner_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={index === currentImageIndex ? 0 : -1}
                        style={{ display: "block", width: "100%", height: "100%" }}
                        aria-label={`${t("COMMON.BANNER_IMAGE_ALT", { index: index + 1 })} – ${t("COMMON.OPEN_LINK")}`}
                      >
                        {img}
                      </a>
                    ) : (
                      img
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Mobile Banner ─────────────────────────────────── */}
        <div className="w-full relative mobilescreen:block lg:hidden md:block xsl:h-[350px] xss:h-[250px]">
          <div className="relative w-full h-full">
            {images.map((banner, index) => {
              const isFirst = index === 0;
              const img = (
                <Image
                  src={banner.image}
                  alt={
                    t("COMMON.BANNER_IMAGE_ALT", { index: index + 1 }) ||
                    `Banner ${index + 1}`
                  }
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={isFirst}
                  loading={isFirst ? "eager" : "lazy"}
                  fetchPriority={isFirst ? "high" : "low"}
                />
              );
              return (
                <div
                  key={index}
                  className={`absolute w-full h-full transition-opacity duration-500 ${
                    index === currentImageIndex
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                  aria-hidden={index !== currentImageIndex ? true : undefined}
                >
                  {banner.banner_url ? (
                    <a
                      href={banner.banner_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={index === currentImageIndex ? 0 : -1}
                      style={{ display: "block", width: "100%", height: "100%" }}
                      aria-label={`${t("COMMON.BANNER_IMAGE_ALT", { index: index + 1 })} – ${t("COMMON.OPEN_LINK")}`}
                    >
                      {img}
                    </a>
                  ) : (
                    img
                  )}
                </div>
              );
            })}
          </div>

          {/* Spacer that preserves layout height */}
          {images.length > 0 && (
            <div className="h-[700px] md:h-[592px] mobilescreen:h-[480px] w-full invisible" />
          )}
        </div>
      </div>

      {/* ── Stats Cards ───────────────────────────────────── */}
      <div className="relative top-[-70px] mobilescreen:top-[-50px] 2xl:w-[75%] lg:w-[80%] laptop:w-[77.9%] laptopmain:w-[83%] laptopitm:w-[85%] md:w-[90%] mobilescreen:w-[95%] mx-auto">
        <div className="mb-2">
          {images.length > 1 && (
            <div className="flex justify-center py-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-3 h-3 rounded-full mx-1 ${
                    index === currentImageIndex
                      ? "bg-[#29246D]"
                      : "bg-[#FFFFFF4D]"
                  } shadow-md`}
                  aria-label={`${t("COMMON.GO_TO_IMAGE")} ${index + 1}`}
                  aria-pressed={index === currentImageIndex}
                />
              ))}
            </div>
          )}
        </div>
        <div className="grid 2xl:px-5 px-3 mobilescreen:px-[13px] grid-cols-3 md:grid-cols-3 lg:grid-cols-3 2xl:gap-[67px] lg:gap-[40px] md:gap-[20px] mobilescreen:gap-[10px]">
          {cards.map((item, index) => (
            <div
              key={index}
              className={`bg-white xs:pb-5 lg:p-3 xss:pb-6 md:p-3 sm:p-6 xss:p-3 p-3 rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-b-[7px] ${item.borderColor} text-center rounded-tl-none rounded-tr-[40px] xss:rounded-tr-[20px] rounded-bl-[40px] xss:rounded-bl-[20px] rounded-br-[40px] xss:rounded-br-[20px] flex flex-col items-center justify-center h-full`}
            >
              <div className="xss:h-[45px]">
                <Image
                  src={item.img}
                  alt=""
                  width={75}
                  height={75}
                  aria-hidden="true"
                  className="w-[75px] 2xl:h-[75px] lg:h-[50px] mobilescreen:w-[46px] xs:w-[40px] xs:h-[40px] mobilescreen:h-[41px] object-contain"
                  unoptimized
                />
              </div>
              <p
                className={`lg:text-[40px] xss:text-base md:text-[40px] sm:text-[36px] font-bold ${item.textColor} mt-2`}
                aria-label={`${item.number} ${item.text}`}
              >
                {item.number}
              </p>
              <p className="xss:h-5 xss:mb-2 text-secondary-102 extrasmall:text-xs 2xl:text-[22px] lg:text-[20px] sm:text-[18px] md:text-[22px] xss:text-[12px] font-semibold pt-3 xss:pt-0 text-center">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
