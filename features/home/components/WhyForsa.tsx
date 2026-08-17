"use client";

/**
 * "Why FORSA?" cards — every card is admin-editable (`GET /home/` →
 * `why_fursa`). The section hides itself when the CMS returns no cards rather
 * than falling back to a bundled list.
 *
 * `items` is passed by Server Components that already fetched the payload;
 * client-only screens leave it undefined and the shared React Query cache
 * supplies it.
 */
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/languageStore";
import { useHomeCms } from "@/features/cms/hooks/useHomeCms";
import { pickLocalized, type WhyFursaItem } from "@/lib/api/cms";

function Card({ item, language }: { item: WhyFursaItem; language: string }) {
  const title = pickLocalized(item.title_en, item.title_ar, language);

  return (
    <div className="flex flex-col items-center">
      {item.icon && (
        <Image
          src={item.icon}
          alt=""
          aria-hidden="true"
          width={64}
          height={64}
          className="w-16 h-16 mb-3 object-contain"
        />
      )}
      <p className="text-primary-5 2xl:text-xl laptopmain:text-xl text-[22px] lg:text-[18px] md:text-[16px] mobilescreen:text-[14px] font-bold text-center lg:w-[180px]">
        {title}
      </p>
    </div>
  );
}

export default function WhyForsa({ items }: { items?: WhyFursaItem[] }) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const { cms } = useHomeCms({ enabled: items === undefined });

  const features = items ?? cms?.why_fursa ?? [];
  if (features.length === 0) return null;

  // Mobile keeps the original 3-up first row with the remainder centred below.
  const firstRow = features.slice(0, 3);
  const secondRow = features.slice(3);

  return (
    <div className="bg-[#FAF8F8] 2xl:py-[70px] laptopmain:py-[50px] laptop:py-[40px] lg:py-[40px] py-[40px]">
      <div className="2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] mx-auto text-center">
        <h2 className="text-[24px] 2xl:text-[50px] lg:text-[32px] md:text-[38px] font-bold mb-[25px] 2xl:mb-[50px] lg:mb-[24px] md:mb-[50px] text-primary-5">
          {t("COMMON.WHY")}{" "}
          <span className="text-primary-400">{t("COMMON.FORSA")}</span>
          {t("COMMON.?")}
        </h2>

        {/* Desktop */}
        <div
          className="hidden lg:grid gap-6 justify-items-center"
          style={{
            gridTemplateColumns: `repeat(${Math.min(features.length, 5)}, minmax(0, 1fr))`,
          }}
        >
          {features.map((item) => (
            <Card key={item.id} item={item} language={language} />
          ))}
        </div>

        {/* Mobile */}
        <div className="block lg:hidden">
          <div className="grid grid-cols-3 gap-6 justify-items-center">
            {firstRow.map((item) => (
              <Card key={item.id} item={item} language={language} />
            ))}
          </div>
          {secondRow.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 xss:gap-3 mt-6">
              {secondRow.map((item) => (
                <Card key={item.id} item={item} language={language} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
