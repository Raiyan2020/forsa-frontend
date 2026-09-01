"use client";

/**
 * Renders one admin-editable page (`GET /pages/{slug}/`).
 *
 * Both locales are handed in pre-sanitized from the server so the language can
 * be switched client-side without a refetch — see `lib/sanitizeHtml.ts` for why
 * sanitization does not happen here.
 */
import Title from "@/components/shared/Title";
import { HomepageBannerClient } from "@/features/home";
import { useLanguageStore } from "@/store/languageStore";
import { pickLocalized } from "@/features/shared";

interface CmsPageViewProps {
  titleEn: string | null;
  titleAr: string | null;
  /** Sanitized HTML for each locale. */
  contentEn: string;
  contentAr: string;
  /** Hides the top banner when the page is embedded in another screen. */
  withBanner?: boolean;
  /** The separator above the content — off when another section precedes it. */
  withBorder?: boolean;
}

export default function CmsPageView({
  titleEn,
  titleAr,
  contentEn,
  contentAr,
  withBanner = true,
  withBorder = true,
}: CmsPageViewProps) {
  const language = useLanguageStore((s) => s.language);
  const title = pickLocalized(titleEn, titleAr, language);
  const content = pickLocalized(contentEn, contentAr, language);

  return (
    <>
      {withBanner && <HomepageBannerClient />}
      <div className={withBorder ? "border-t border-[#000]" : ""}>
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto relative 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] mobilescreen:py-[40px] py-[40px]">
          {title && (
            <h1 className="flex text-start justify-start">
              <Title text={title} variant="default" />
            </h1>
          )}
          {content && (
            <div
              className="cms-content text-secondary-100 lg:text-lg md:text-base mobilescreen:text-sm font-normal"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </div>
    </>
  );
}
