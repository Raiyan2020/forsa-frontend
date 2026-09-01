"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// react-slick measures the DOM on mount, so it must not render on the server.
const Slider = dynamic(() => import("react-slick"), { ssr: false });

export interface OpportunitySponsor {
  id: number;
  image: string;
  organization: number;
  position: number;
}

interface OpportunitySponsorsProps {
  sponsors: OpportunitySponsor[];
  isEvent?: boolean;
}

export default function OpportunitySponsors({
  sponsors,
  isEvent = false,
}: OpportunitySponsorsProps) {
  const { t, i18n } = useTranslation();
  const [slidesToShow, setSlidesToShow] = useState(2);
  const [enableFeatures, setEnableFeatures] = useState(false);

  const isRTL = i18n.language === "ar";

  const sortedSponsors = useMemo(
    () => [...sponsors].sort((a, b) => a.position - b.position),
    [sponsors]
  );

  useEffect(() => {
    const updateSliderSettings = () => {
      const width = window.innerWidth;
      let slides = 2;

      if (width <= 400) {
        slides = 1;
      } else if (width <= 500) {
        slides = 2;
      } else if (width <= 600) {
        slides = 3;
      } else if (width <= 1024) {
        slides = 3;
      } else if (width <= 1200) {
        slides = 2;
      }

      setSlidesToShow(slides);
      // Dots / autoplay / looping only make sense once the sponsors overflow
      setEnableFeatures(sortedSponsors.length > slides);
    };

    updateSliderSettings();
    window.addEventListener("resize", updateSliderSettings);
    return () => window.removeEventListener("resize", updateSliderSettings);
  }, [sortedSponsors]);

  if (!sortedSponsors.length) return null;

  const settings = {
    dots: enableFeatures,
    infinite: enableFeatures,
    speed: 500,
    slidesToShow,
    slidesToScroll: slidesToShow,
    autoplay: enableFeatures,
    arrows: false,
    rtl: isRTL,
    customPaging: (i: number) => (
      <button className="dot" aria-label={`Go to slide ${i + 1}`} />
    ),
    appendDots: (dots: React.ReactNode) => (
      <div className="mt-4">
        <ul className="flex justify-center space-x-3">{dots}</ul>
      </div>
    ),
    responsive: [
      { breakpoint: 4000, settings: { slidesToShow: 2, slidesToScroll: 2 } },
      { breakpoint: 1200, settings: { slidesToShow: 2, slidesToScroll: 2 } },
      { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3 } },
      { breakpoint: 600, settings: { slidesToShow: 3, slidesToScroll: 3 } },
      { breakpoint: 500, settings: { slidesToShow: 2, slidesToScroll: 2 } },
      { breakpoint: 400, settings: { slidesToShow: 1, slidesToScroll: 1 } },
    ],
  };

  return (
    <div className="sponsors pb-0">
      <style>
        {`
          .dot, .slick-dots button.dot {
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            min-height: 16px !important;
            border-radius: 50% !important;
            background-color: #29246D !important;
            opacity: 0.1 !important;
            display: inline-block !important;
            transition: background-color 0.3s ease, opacity 0.3s ease;
            padding: 0 !important;
            position: relative;
            border: none !important;
            margin-top: 20px !important;
          }
          .dot::before,
          .dot::after {
            content: none !important;
          }
          .slick-dots li.slick-active .dot,
          .slick-dots li.slick-active button.dot {
            background-color: #29246D !important;
            opacity: 1 !important;
          }
          .slick-dots li {
            margin: 3px !important;
          }
          .sponser-images {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
        `}
      </style>

      <div className="mb-[25px] 2xl:mb-[50px] laptop:mb-[40px] lg:mb-[24px] md:mb-[30px]">
        <h2 className="text-center 2xl:text-[32px] laptopmain:text-[28px] lg:text-[28px] text-[28px] font-bold text-primary-5">
          {isEvent ? t("COMMON.EVENT_SPONSOR") : t("COMMON.OPPORTUNITY_SPONSOR")}
        </h2>
      </div>

      <div className="overflow-visible px-4 pb-10">
        <Slider {...settings}>
          {sortedSponsors.map((sponsor) => (
            <div key={sponsor.id} className="px-4 sponser-images">
              <img
                src={sponsor.image || "/assets/profile/org_profile.svg"}
                alt="sponsor"
                className="max-h-[80px] w-auto object-contain rounded-full"
              />
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
}
