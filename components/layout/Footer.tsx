"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/languageStore";
import { useHomeCms } from "@/features/cms/hooks/useHomeCms";
import {
  pickLocalized,
  type FooterCms,
  type FooterSocial,
} from "@/lib/api/cms";

// Inline SVGs replace react-icons to eliminate icon library chunks from the layout bundle.
// The layout renders on every page — library icons would add ~50–100 KB to every page.

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor">
      <path d="M448 209.9a210.1 210.1 0 0 1-122.8-39.3v178.8A162.6 162.6 0 1 1 185 188.3v89.3a74.6 74.6 0 1 0 52.2 71.2V0h88a121.2 121.2 0 0 0 1.9 22.2 122.2 122.2 0 0 0 54.3 80.3 121.4 121.4 0 0 0 66.6 22.1z" />
    </svg>
  );
}

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="1em" height="1em" viewBox="0 0 576 512" fill="currentColor">
      <path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6-11.4 42.9-11.4 132.3-11.4 132.3s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zm-317.5 213.5V175.2l142.7 81.2-142.7 81.2z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor">
      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
    </svg>
  );
}

interface FooterProps {
  /**
   * Admin-editable footer content (`GET /home/` → `footer`), fetched by the
   * layout on the server. Missing CMS fields fall back to the original React
   * footer content. Omit it entirely (client-only trees, for example
   * `app/not-found.tsx`) and the footer fetches the payload itself from the
   * shared React Query cache.
   */
  footer?: FooterCms | null;
}

const SOCIAL_LINKS: Array<{
  key: keyof FooterSocial;
  label: string;
  className: string;
  Icon: ({ className }: { className?: string }) => React.ReactElement;
}> = [
  {
    key: "tiktok",
    label: "TikTok",
    className:
      "bg-white w-9 h-9 rounded-full text-[#1A1A66] flex items-center justify-center text-[25px]",
    Icon: TikTokIcon,
  },
  {
    key: "twitter",
    label: "Twitter / X",
    className:
      "bg-white w-9 h-9 rounded-full text-[#1A1A66] flex items-center justify-center text-[25px]",
    Icon: XTwitterIcon,
  },
  {
    key: "youtube",
    label: "YouTube",
    className: "text-[46px] flex items-center",
    Icon: YouTubeIcon,
  },
  {
    key: "instagram",
    label: "Instagram",
    className:
      "bg-white w-9 h-9 rounded-lg text-[#1A1A66] flex items-center justify-center text-[25px]",
    Icon: InstagramIcon,
  },
];

const DEFAULT_SOCIAL_URLS: Record<keyof FooterSocial, string> = {
  tiktok: "https://www.tiktok.com/@joinforsa",
  twitter: "https://x.com/JoinForsa_",
  youtube: "https://www.youtube.com/@joinforsa",
  instagram:
    "https://www.instagram.com/joinforsa?igsh=MTN6c254aW15d2ZkYw==",
};

const CORE_PAGE_LINKS = [
  {
    slug: "about",
    href: "/about-us",
    translationKey: "COMMON.ABOUTUS",
  },
  {
    slug: "privacy",
    href: "/privacy-policy",
    translationKey: "COMMON.PRIVACYPOLICY",
  },
  {
    slug: "terms",
    href: "/termsofuse",
    translationKey: "COMMON.TERMS.OF.USE",
  },
] as const;

export default function Footer({ footer }: FooterProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const language = useLanguageStore((s) => s.language);
  const { cms } = useHomeCms({ enabled: footer === undefined });

  const data = footer ?? cms?.footer ?? null;
  const cmsPages = data?.pages ?? [];
  const pageLinks = CORE_PAGE_LINKS.map((page) => {
    const cmsPage = cmsPages.find((item) => item.slug === page.slug);
    return {
      slug: page.slug,
      href: page.href,
      label:
        pickLocalized(cmsPage?.title_en, cmsPage?.title_ar, language) ||
        t(page.translationKey),
    };
  });
  const socials = SOCIAL_LINKS.map((link) => ({
    ...link,
    href:
      data?.social?.[link.key]?.trim() || DEFAULT_SOCIAL_URLS[link.key],
  }));
  const copyright =
    pickLocalized(data?.copyright_en, data?.copyright_ar, language) ||
    t("COMMON.ALL.RIGHTS.RESERVED", { year: new Date().getFullYear() });

  return (
    <footer className="bg-primary-5 text-white">
      <div className="2xl:w-[88%] laptop:w-[88%] laptopmain:w-[90%] w-[95%] mobilescreen:w-[100%] mdscreen:w-[100%] mx-auto">
        <div className="items-center pt-[70px] mobilescreen:pt-[40px] mobilescreen:gap-[0] gap-8 lg:gap-0 mdscreen:gap-0 flex flex-col 2xl:flex-row lg:flex-row mdscreen:flex-col sm:lg:flex-row justify-between">
          {/* Logo */}
          <div className="w-[15%] mobilescreen:mx-auto mobilescreen:pb-[40px] pb-[40px] mdscreen:border-b mobilescreen:border-b mobilescreen:border-b-white mobilescreen:flex mobilescreen:w-[100%] mobilescreen:justify-center mdscreen:flex mdscreen:w-[100%] mdscreen:justify-center">
            <Image
              className="w-[85px] h-[100px] object-contain"
              src="/assets/auth/fotterlogo.svg"
              alt="Fursa Logo"
              width={85}
              height={100}
            />
          </div>

          {/* Links */}
          <nav className="relative block 2xl:flex lg:flex mdscreen:block 2xl:gap-[70px] lg:gap-[30px] mdscreen:gap-[20px] sm:gap-[40px] mobilescreen:pt-[40px] mobilescreen:pb-[40px] lg:py-0 mdscreen:py-[40px] pb-[40px]">
            {pageLinks.map((page) => (
              <Link
                key={page.slug}
                href={page.href}
                className={`hover:underline text-lg block text-center mb-3 ${
                  pathname === page.href ? "font-bold" : ""
                }`}
              >
                {page.label}
              </Link>
            ))}
            <Link
              href="/faq"
              className={`hover:underline text-lg block text-center mb-3 ${pathname === "/faq" ? "font-bold" : ""}`}
            >
              {t("COMMON.FAQ")}
            </Link>
            <Link href="/contact-us" className="hover:underline text-lg block text-center mb-3">
              {t("COMMON.CONTACTUS")}
            </Link>
          </nav>

          {/* Social Icons — CMS URLs with the React footer's defaults. */}
          <div className="mobilescreen:w-[60%] mobilescreen:mx-auto mobilescreen:pt-[40px] mobilescreen:border-t mdscreen:w-[60%] mdscreen:mx-auto mdscreen:pt-[40px] mdscreen:border-t">
            <p className="text-lg font-bold text-center">{t("COMMON.FOLLOWUS")}</p>
            <div className="flex items-center gap-7 extrasmall:gap-3 mt-4 mdscreen:mt-0 pt-5 mobilescreen:justify-center mdscreen:justify-center">
              {socials.map(({ key, label, className, href, Icon }) => (
                <a
                  key={key}
                  className={className}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright — CMS text with the React footer's localized fallback. */}
        <div className="text-center text-base pb-[70px] mobilescreen:pt-[30px] mdscreen:pt-[30px]">
          {copyright}
        </div>
      </div>
    </footer>
  );
}
