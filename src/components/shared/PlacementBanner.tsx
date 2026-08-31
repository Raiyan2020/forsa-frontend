"use client";

/**
 * A slim, admin-configurable image strip for a specific page (`?placement=`),
 * distinct from the full homepage hero (`BannerCarousel`, driven by the CMS
 * `/home/` payload) — this reads the simpler `/banner-images/` endpoint,
 * which carries no headline text, just slides and an optional click-through
 * `banner_url` per slide. Hidden entirely when the admin hasn't configured
 * any banners for this placement, per the CMS rule of hiding empty sections
 * rather than showing a placeholder.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { getBannerImages } from "@/features/shared/services/banners";

export type BannerPlacement = "opportunities" | "development" | "events";

interface PlacementBannerImage {
  image: string;
  banner_url?: string | null;
}

export default function PlacementBanner({ placement }: { placement: BannerPlacement }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: banners = [] } = useQuery({
    queryKey: ["banner-images", placement],
    queryFn: async () => {
      const res = await getBannerImages(placement);
      return (res?.data?.banner_images as PlacementBannerImage[]) ?? [];
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (banners.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl mb-8 2xl:mb-[50px] laptopmain:mb-[40px] h-[140px] xsl:h-[180px] md:h-[220px] lg:h-[260px] 2xl:h-[320px]">
      {banners.map((banner, index) => {
        const img = (
          <Image
            src={banner.image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
          />
        );

        return (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={index !== currentIndex ? true : undefined}
          >
            {banner.banner_url ? (
              <a
                href={banner.banner_url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={index === currentIndex ? 0 : -1}
                className="block w-full h-full"
                aria-label={t("COMMON.OPEN_LINK")}
              >
                {img}
              </a>
            ) : (
              img
            )}
          </div>
        );
      })}

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`w-2.5 h-2.5 rounded-full shadow-md ${
                index === currentIndex ? "bg-[#29246D]" : "bg-white/70"
              }`}
              aria-label={`${t("COMMON.GO_TO_IMAGE")} ${index + 1}`}
              aria-pressed={index === currentIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}
