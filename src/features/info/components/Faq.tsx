"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { HomepageBannerClient } from "@/features/home";
import Title from "@/components/shared/Title";
import Loader from "@/components/ui/Loader";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/languageStore";
import Image from "next/image";
import type { FaqItem } from "@/lib/api/types";
import { getFaqs } from "@/features/info/services/infoApi";
import { sanitizeRichText } from "@/lib/sanitizeRichText";

const containsHTML = (str: string): boolean => {
  return /<[a-z][\s\S]*>/i.test(str);
};

const listStyles = `
  .answer-content { overflow-wrap: break-word !important; word-break: break-word !important; max-width: 100% !important; line-height: 1.6 !important; }
  .answer-content ul { list-style-type: disc !important; padding-left: 2rem !important; margin: 1rem 0 !important; }
  .answer-content ol { list-style-type: decimal !important; padding-left: 2rem !important; margin: 1rem 0 !important; }
  .answer-content li { margin-bottom: 0.75rem !important; padding-left: 0.5rem !important; }
  .answer-content strong { font-weight: bold !important; }
  .answer-content p { margin-bottom: 1rem !important; }
  .rtl.answer-content ul, .rtl.answer-content ol { padding-right: 2rem !important; padding-left: 0 !important; text-align: right !important; }
`;

export default function Faq({ initialFaqs = [] }: { initialFaqs?: FaqItem[] }) {
  const { t } = useTranslation();
  const selectedLanguage = useLanguageStore((s) => s.language);
  const [openItemId, setOpenItemId] = useState<number | null>(null);

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = listStyles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["faqs"],
    queryFn: () => getFaqs({ page: 1, limit: 1000 }),
    // Seed with SSR data so there is no loading flash when data is already available
    initialData: initialFaqs.length > 0
      ? {
          key: "success",
          msg: "",
          code: 200,
          response_status: { error: false, validation_errors: [] },
          data: initialFaqs,
        }
      : undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const faqs: FaqItem[] = Array.isArray(data?.data) ? data.data : [];

  const toggleItem = (id: number) => {
    setOpenItemId(openItemId === id ? null : id);
  };

  const sectionContent = (inner: React.ReactNode) => (
    <>
      <HomepageBannerClient />
      <section className="bg-[#FFFFFF] mb-[70px] laptopmain:mb-[40px] lg:mb-[40px] md:mb-[40px] mobilescreen:mb-[40px]">
        <div className="2xl:px-5 px-3 mobilescreen:px-[13px] 2xl:w-[75%] laptopmain:w-[83%] laptop:w-[78%] laptopitm:w-[85%] lg:w-[90%] md:w-[85%] w-[90%] 2xl:py-[70px] laptopmain:py-[50px] py-[40px] mx-auto relative">
          <h1 className="flex px-[43px] mobilescreen:px-[13px] text-center justify-center">
            <Title text={t("COMMON.FAQs")} variant="default" />
          </h1>
          {inner}
        </div>
      </section>
    </>
  );

  if (isLoading) {
    return sectionContent(
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return sectionContent(
      <div className="text-center py-10 text-red-500">
        {t("COMMON.ERROR_LOADING_DATA")}
      </div>
    );
  }

  if (faqs.length === 0) {
    return sectionContent(
      <div className="text-center py-10">{t("COMMON.NO_FAQS")}</div>
    );
  }

  return sectionContent(
    <div>
      {faqs.map((item, index) => {
        const questionNumber = index + 1;
        return (
          <div key={item.id} className="bg-[#f2f2f2] overflow-hidden">
            <button
              className="w-full flex items-center justify-between 2xl:p-9 laptopmain:p-6 lg:p-6 md:p-6 mobilescreen:p-4 text-left bg-[#DDDDDD] mb-1"
              onClick={() => toggleItem(item.id)}
              aria-expanded={openItemId === item.id}
            >
              <span
                className={`font-bold text-secondary-100 2xl:text-[25px] laptopmain:text:lg mobilescreen:text-sm flex-1 ${
                  selectedLanguage === "ar" ? "text-right rtl" : ""
                }`}
              >
                {selectedLanguage === "ar" ? (
                  <>
                    <span className="text-secondary-100 ml-2">{questionNumber}.</span>
                    {item.question_ar}
                  </>
                ) : (
                  <>
                    <span className="text-secondary-100 mr-2">{questionNumber}.</span>
                    {item.question_en}
                  </>
                )}
              </span>
              <span
                className={`flex-shrink-0 relative w-6 h-6 ${
                  selectedLanguage === "ar" ? "mr-4" : "ml-4"
                }`}
              >
                {openItemId === item.id ? (
                  <Image
                    src="/assets/homepage/minus.svg"
                    alt="minus"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <Image
                    src="/assets/homepage/plus.svg"
                    alt="plus"
                    fill
                    className="object-contain"
                  />
                )}
              </span>
            </button>
            <div
              className={`overflow-hidden ${
                openItemId === item.id
                  ? "max-h-[1000px] transition-all duration-500 ease-in-out"
                  : "max-h-0 mb-8 mobilescreen:mb-5"
              }`}
            >
              {containsHTML(
                selectedLanguage === "ar" ? item.answer_ar : item.answer_en
              ) ? (
                <div
                  className={`py-[30px] mobilescreen:py-5 px-[37px] mobilescreen:px-4 text-secondary-100 text-lg mobilescreen:text-sm font-normal answer-content ${
                    selectedLanguage === "ar" ? "text-right rtl" : ""
                  }`}
                  // Dashboard-authored HTML, stored verbatim by the API.
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichText(
                      selectedLanguage === "ar" ? item.answer_ar : item.answer_en
                    ),
                  }}
                />
              ) : (
                <div
                  className={`py-[30px] mobilescreen:py-5 px-[37px] mobilescreen:px-4 text-secondary-100 text-lg mobilescreen:text-sm font-normal answer-content ${
                    selectedLanguage === "ar" ? "text-right rtl" : ""
                  }`}
                >
                  {selectedLanguage === "ar"
                    ? item.answer_ar || ""
                    : item.answer_en || ""}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

