"use client";

/* eslint-disable @next/next/no-img-element -- static SVG icons */

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { interestLabel, normalizeInterests } from "@/lib/interests";
import { sanitizeRichText } from "@/lib/sanitizeRichText";
import { useLanguageStore } from "@/store/languageStore";
import type { VolunteerOpportunityDetail } from "./types";

const TAG_BACKGROUNDS = ["#70B4C2", "#FC9555", "#D9EF61", "#5271FF"];
const TAG_TEXT_COLORS = ["text-primary-5", "text-primary-5", "text-primary-5", "text-white"];

/** The body text, and the interest tags that link back into the filtered list. */
export default function OpportunityDescription({
  data,
}: {
  data: VolunteerOpportunityDetail;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);

  // Rendered as HTML, so it is sanitized first: the backend stores the editor's
  // markup verbatim and any organization account can author it. Follows the
  // opportunity's own `primary_language`, like the heading.
  const description = sanitizeRichText(
    data.primary_language === "ar" ? data.description_ar : data.description_en
  );
  const tags = normalizeInterests(data.interest_display, data.interests);

  return (
    <>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="2xl:text-xl lg:text-base text-base font-bold text-primary-5 flex gap-2 items-center">
            <img
              src="/assets/voluneteerevent/rightarrows.svg"
              alt=""
              className={language === "ar" ? "rotate-rtl" : ""}
            />
            {t("COMMON.DESCRIPTION")}
          </h3>
        </div>
        <div
          className="2xl:text-lg lg:text-sm text-sm font-semibold text-secondary-102"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-6 mt-6 xss:gap-2 items-center">
          <img src="/assets/voluneteerevent/label.svg" alt="" />
          {tags.map((tag, index) => {
            const label = interestLabel(tag, language);
            return (
              <span
                key={tag.id ?? index}
                style={{ backgroundColor: TAG_BACKGROUNDS[index % TAG_BACKGROUNDS.length] }}
                className={`text-sm py-[13px] rounded-[20px] xss:py-2 xss:px-4 xss:text-xs px-8 ${
                  TAG_TEXT_COLORS[index % TAG_TEXT_COLORS.length]
                } cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() =>
                  router.push(
                    `/volunteer-opportunities-list?tags=${encodeURIComponent(label)}`
                  )
                }
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
    </>
  );
}
