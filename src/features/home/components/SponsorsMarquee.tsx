"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { SponsorItem } from "@/lib/api/server";

interface SponsorsMarqueeProps {
  sponsors: SponsorItem[];
}

export default function SponsorsMarquee({ sponsors }: SponsorsMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  // Speed scales with number of sponsors
  const animationDuration = sponsors.length ? sponsors.length * 2 : 20;

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    const observer = new ResizeObserver(() => {
      setShouldScroll(content.scrollWidth > container.clientWidth);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [sponsors]);

  if (sponsors.length === 0) return null;

  return (
    <>
      <style>{`
        .marquee-container { width: 100%; overflow: hidden; white-space: nowrap; direction: ltr; }
        .marquee { display: inline-flex; animation: pingpong linear infinite; animation-direction: alternate; }
        @keyframes pingpong {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(calc(-100% + 100vw)); }
        }
        @media (max-width: 768px) { .marquee { gap: 1rem; } }
      `}</style>

      <div className="marquee-container overflow-hidden" ref={containerRef}>
        <div
          ref={contentRef}
          className={`flex flex-nowrap gap-6 items-center ${
            shouldScroll ? "marquee" : "justify-center"
          }`}
          style={shouldScroll ? { animationDuration: `${animationDuration}s` } : {}}
        >
          {sponsors.map((sponsor) => (
            <div
              key={`sponsor-${sponsor.id}`}
              className="flex-shrink-0 flex justify-center items-center relative w-[170px] h-[90px]"
            >
              <Image
                src={sponsor.sponsor_logo}
                alt={`${sponsor.org_name} logo`}
                width={170}
                height={90}
                loading="lazy"
                className="object-contain w-[170px] h-[90px]"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
