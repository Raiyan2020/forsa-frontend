"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import moment from "moment";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import { formatDateRange } from "@/lib/helpers";
import { useLanguageStore } from "@/store/languageStore";
import OpportunityBadges, {
  OpportunityVisibilityInfo,
  type OpportunityBadgeFlags,
} from "./OpportunityBadges";

/**
 * The one volunteer / learn & serve opportunity card.
 *
 * This markup used to exist three times — `home/VolunteerCard`,
 * `opportunities/OpportunitiesListCard` and `profile/ProfileVolunteerCard` —
 * and the copies had drifted apart: different title clamps, different body text
 * sizes, `next/image` in one and a bare `<img>` (with no fallback for a missing
 * photo) in another, a doubled top border, and an action rendered as a raw
 * `<button>` in one place and as the design-system `<Button>` in the next, so
 * the same card was visibly a different size depending on the page.
 *
 * Everything that genuinely varies per surface is a prop; everything else is
 * fixed here on purpose, so the card cannot drift again.
 */

export interface OpportunityCardImage {
  image: string;
}

/**
 * The subset of the opportunity payload the card renders. Deliberately
 * structural rather than one of the three call sites' own interfaces — those
 * disagree on optionality, and the card only ever reads these fields.
 */
export interface OpportunityCardItem extends OpportunityBadgeFlags {
  id: number | string;
  title_en: string;
  title_ar: string;
  opportunity_images?: OpportunityCardImage[] | null;
  start_date?: string;
  end_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  from_age?: number | string | null;
  to_age?: number | string | null;
  registered_volunteers_count?: number | string | null;
  participants_needed?: number | string | null;
  is_public?: boolean;
  format?: string | null;
  format_display?: { value_en?: string; value_ar?: string } | null;
  learning_type_display?: { value_en?: string; value_ar?: string } | null;
  location_en?: string | null;
  location_ar?: string | null;
  interest_display?: Array<{ value_en?: string; value_ar?: string }> | null;
}

export interface OpportunityCardProps {
  item: OpportunityCardItem;
  /** Learn & serve swaps the age row for the learning type and the location for "in person". */
  isLearnServe?: boolean;
  /** Where the image, title and detail rows link to. */
  detailHref: string;
  /** Tailwind border colour for the content box, e.g. `border-primary-5`. */
  borderClass: string;
  /** Tailwind background colour for the action button, e.g. `bg-primary-5`. */
  buttonClass: string;
  actionLabel: string;
  onAction: () => void;
  /** Person icon variant — the homepage tints it per section. */
  peopleIconSrc?: string;
  /** Owner-only controls drawn over the image (delete, edit). */
  headerOverlay?: React.ReactNode;
  /** Status pill shown beside the title on the profile screens. */
  statusPill?: React.ReactNode;
  /** Makes the interest tag clickable, navigating to the filtered list. */
  onTagClick?: (tag: string) => void;
}

export interface OpportunityAccent {
  /** Border colour for the card's content box. */
  border: string;
  /** Background colour for the action button and the carousel arrows. */
  button: string;
  /** Tinted person icon for the "registered / needed" row. */
  peopleIcon: string;
  /** Tinted delete icon for the owner overlay. */
  deleteIcon: string;
}

/**
 * The card's colour scheme.
 *
 * The homepage tints each section — teal for learn & serve, blue for volunteer
 * opportunities — while every other surface uses the default purple. All three
 * card hosts previously inlined this same three-branch ternary four times each,
 * which is how the tints drifted out of step with the icons.
 */
export const getOpportunityAccent = ({
  isLearnServe = false,
  isOpportunity = false,
  isHomepage = false,
}: {
  isLearnServe?: boolean;
  isOpportunity?: boolean;
  isHomepage?: boolean;
}): OpportunityAccent => {
  if (isHomepage && isLearnServe) {
    return {
      border: "border-primary-803",
      button: "bg-primary-803",
      peopleIcon: "/assets/homepage/person_icon_organized.svg",
      deleteIcon: "/assets/voluneteerevent/card_delete_icon_organized.svg",
    };
  }

  if (isHomepage && isOpportunity) {
    return {
      border: "border-primary-802",
      button: "bg-primary-802",
      peopleIcon: "/assets/homepage/person_icon_blue.svg",
      deleteIcon: "/assets/voluneteerevent/card_delete_icon_blue.svg",
    };
  }

  return {
    border: "border-primary-5",
    button: "bg-primary-5",
    peopleIcon: "/assets/homepage/person.svg",
    deleteIcon: "/assets/voluneteerevent/card_delete_icon.svg",
  };
};

/** A value is "online" if either the enum or the localized display says so. */
const isOnlineFormat = (item: OpportunityCardItem): boolean =>
  item.format === "ONLINE" ||
  item.format_display?.value_en?.toLowerCase() === "online" ||
  item.format_display?.value_ar?.toLowerCase() === "عن بعد";

/**
 * Clamp to a character budget as well as a CSS line clamp.
 *
 * `line-clamp-1` alone is not enough here: these rows sit in a two-column grid,
 * so a long unbroken location string pushes the neighbouring column instead of
 * ellipsing. The character cap keeps the grid stable.
 */
const clampText = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}...` : value;

const formatTimeRange = (
  start: string | null | undefined,
  end: string | null | undefined,
  t: (key: string) => string
): string => {
  const one = (value: string) => {
    const time = moment(value, "HH:mm:ss");
    const meridiem = time.format("a") === "am" ? t("COMMON.AM") : t("COMMON.PM");
    return `${time.format("hh:mm")} ${meridiem}`;
  };

  if (start && end) return `${one(start)} - ${one(end)}`;
  if (start) return one(start);
  if (end) return one(end);
  return "";
};

export default function OpportunityCard({
  item,
  isLearnServe = false,
  detailHref,
  borderClass,
  buttonClass,
  actionLabel,
  onAction,
  peopleIconSrc = "/assets/homepage/person.svg",
  headerOverlay,
  statusPill,
  onTagClick,
}: OpportunityCardProps) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const isArabic = language === "ar";

  const title = (isArabic ? item.title_ar : item.title_en) || "";
  const localized = (value?: { value_en?: string; value_ar?: string } | null) =>
    (isArabic ? value?.value_ar : value?.value_en) ?? "";

  const tag = localized(item.interest_display?.[0]);

  const locationLabel = (() => {
    if (isOnlineFormat(item)) return t("COMMON.ONLINE");
    if (isLearnServe) return t("COMMON.IN_PERSON");
    const raw =
      (isArabic ? item.location_ar : item.location_en) ||
      t("COMMON.LOADING_LOCATION");
    return clampText(String(raw), 12);
  })();

  /** Shared row styling — one definition, so the four cells cannot drift apart. */
  const rowClass =
    "flex items-center gap-2 leading-tight text-secondary-102 text-sm xss:text-base lg:text-base 2xl:text-lg";

  return (
    <div className="flex h-full flex-col">
      <div className="relative">
        <Link href={detailHref}>
          {/* Square (1:1) crop — matches the ratio the upload form crops to, so
              the card never letterboxes or stretches. */}
          {/* 4:5 portrait — Instagram's feed ratio, and the ratio the upload
              form crops to, so the card never letterboxes or re-crops. */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-[20px] border border-b-0 border-[#484848]">
            <Image
              src={
                item.opportunity_images?.[0]?.image ||
                "/assets/homepage/baner_img.png"
              }
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              loading="lazy"
            />
          </div>
          <OpportunityBadges item={item} />
          <div className="absolute bottom-0 grid h-[39px] w-full grid-cols-2 items-center bg-[#000000B2]/70 text-sm">
            <span className="flex items-center justify-center gap-1 text-white xs:text-xs smallscreen:text-[10px] miniscreen3:text-[12px] miniscreen1:text-[12px] laptopitms:text-xs md:text-sm laptopmain:text-sm 2xl:text-sm">
              <Image
                className="h-4 w-4 smallscreen:w-3 2xl:h-5 2xl:w-5"
                src="/assets/homepage/dateicn.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
                aria-hidden="true"
              />
              {formatDateRange(
                item.start_date ?? "",
                item.end_date ?? "",
                language,
                t
              )}
            </span>
            <div className="absolute left-1/2 top-[8px] h-[60%] w-[1px] bg-white" />
            <span className="flex items-center justify-center gap-1 text-white xs:text-xs smallscreen:text-[10px] miniscreen3:text-[12px] miniscreen1:text-[12px] laptopitms:text-xs md:text-sm laptopmain:text-sm 2xl:text-sm">
              <Image
                src="/assets/homepage/timeicn.svg"
                className="h-4 w-4 smallscreen:w-3 2xl:h-5 2xl:w-5"
                alt=""
                width={20}
                height={20}
                unoptimized
                aria-hidden="true"
              />
              {formatTimeRange(item.start_time, item.end_time, t)}
            </span>
          </div>
        </Link>
        {headerOverlay}
      </div>

      {/* `border-t-0`: the image above already draws the top edge, so a full
          border here renders a doubled line across the card. */}
      <div
        className={`boxshadowsitm relative flex-1 rounded-b-[20px] border border-t-0 bg-[#F7F7F7] px-3 pb-10 xss:px-3 2xl:px-7 ${borderClass}`}
      >
        <Link href={detailHref}>
          <div className="flex items-start justify-between gap-2 pb-3 pt-[19px] 2xl:pb-7">
            <h3 className="flex min-w-0 items-start gap-2 text-lg font-bold text-secondary-100 2xl:text-[20px]">
              {/* `line-clamp-2` rather than `truncate`: these titles are long
                  and a single line cut most of them at the first word. */}
              <span className="line-clamp-1">{title}</span>
              {/* <OpportunityVisibilityInfo
                isPublic={item.is_public}
                className="mt-1 shrink-0"
              /> */}
            </h3>
            {statusPill}
          </div>

          <div className="grid grid-cols-2 justify-between pb-[12px] extrasmall:flex-col">
            <div className={rowClass}>
              <Image
                src={
                  isLearnServe
                    ? "/assets/homepage/learn_type.svg"
                    : "/assets/voluneteerevent/age.svg"
                }
                className="h-5 w-5 shrink-0 object-contain"
                width={20}
                height={20}
                unoptimized
                alt=""
                aria-hidden="true"
              />
              <span className="line-clamp-1">
                {isLearnServe ? (
                  clampText(localized(item.learning_type_display), 12)
                ) : (
                  <>
                    {item.from_age}
                    {item.to_age ? <> - {item.to_age}</> : <> +</>}
                  </>
                )}
              </span>
            </div>
            <div className={rowClass}>
              <Image
                src={
                  isOnlineFormat(item)
                    ? "/assets/voluneteerevent/online.svg"
                    : "/assets/homepage/locations.svg"
                }
                className="h-5 w-5 shrink-0 object-contain"
                width={20}
                height={20}
                unoptimized
                alt=""
                aria-hidden="true"
              />
              <span className="line-clamp-1 flex-1 overflow-hidden text-ellipsis">
                {locationLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 justify-between extrasmall:flex-col">
            <div className={rowClass}>
              <Image
                src={peopleIconSrc}
                className="h-5 w-5 shrink-0 object-contain"
                width={20}
                height={20}
                unoptimized
                alt=""
                aria-hidden="true"
              />
              {`${item.registered_volunteers_count ?? 0}/${item.participants_needed ?? 0}`}
            </div>
            <div className={`${rowClass} overflow-hidden`}>
              <Image
                src="/assets/homepage/health.svg"
                className="h-5 w-5 shrink-0 object-contain"
                width={20}
                height={20}
                unoptimized
                alt=""
                aria-hidden="true"
              />
              <span
                className={`line-clamp-1 overflow-hidden text-ellipsis ${
                  onTagClick && tag
                    ? "cursor-pointer hover:text-primary-5 hover:underline"
                    : ""
                }`}
                onClick={
                  onTagClick && tag
                    ? (event) => {
                        // The whole block is inside a Link — stop the row from
                        // navigating to the detail page instead of filtering.
                        event.preventDefault();
                        event.stopPropagation();
                        onTagClick(tag);
                      }
                    : undefined
                }
              >
                {tag}
              </span>
            </div>
          </div>
        </Link>
      </div>

      <Button
        className={`relative bottom-[25px] mx-auto flex justify-center border-0 ${buttonClass}`}
        variant="primary"
        size="medium"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
