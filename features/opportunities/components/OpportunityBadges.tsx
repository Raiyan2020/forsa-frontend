"use client";

import { useTranslation } from "react-i18next";
import { FiInfo } from "react-icons/fi";

/**
 * The badge strip overlaid on an opportunity thumbnail, and its public/private
 * indicator. Shared by the three card components and the detail screens so the
 * emergency badge and the visibility tooltip only exist in one place.
 *
 * `is_relief` is the "Outside Kuwait" classification and `is_emergency` is the
 * separate emergency priority — two independent flags that happen to render
 * next to each other.
 */
export interface OpportunityBadgeFlags {
  is_urgent?: boolean | null;
  is_supports_disabled?: boolean | null;
  is_relief?: boolean | null;
  is_emergency?: boolean | null;
}

export function OpportunityBadges({
  item,
  className = "",
}: {
  item: OpportunityBadgeFlags;
  className?: string;
}) {
  const { t } = useTranslation();

  const hasAnyBadge =
    item.is_urgent ||
    item.is_supports_disabled ||
    item.is_relief ||
    item.is_emergency;

  if (!hasAnyBadge) return null;

  return (
    <div
      className={`absolute top-0 right-0 pr-4 pt-4 flex flex-col items-end gap-2 ${className}`}
    >
      {item.is_emergency && (
        <span className="bg-[#D32F2F] text-white text-xs font-bold rounded-full px-3 py-1 leading-tight shadow-md">
          {t("COMMON.EMERGENCY_PRIORITY_BADGE")}
        </span>
      )}
      {item.is_urgent && (
        <div className="w-8 h-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/voluneteerevent/urgent.svg"
            alt={t("COMMON.URGENT")}
            className="w-full h-full"
          />
        </div>
      )}
      {item.is_supports_disabled && (
        <div className="w-8 h-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/voluneteerevent/person_disability_card.svg"
            alt={t("COMMON.SUPPORTS_DISABLED")}
            className="w-full h-full"
          />
        </div>
      )}
      {item.is_relief && (
        <div className="w-8 h-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/voluneteerevent/relief.svg"
            alt={t("COMMON.RELIEF")}
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

/**
 * The "i" affordance sitting beside the opportunity type, explaining whether the
 * opportunity is open to everyone (`is_public: true`) or invitation-only.
 *
 * `title` carries the explanation so it works on hover, on focus and for screen
 * readers without pulling in a tooltip library — touch devices get the label
 * text next to the icon instead.
 */
export function OpportunityVisibilityInfo({
  isPublic,
  showLabel = false,
  className = "",
}: {
  isPublic?: boolean | null;
  showLabel?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();

  // `undefined` means the payload predates the field — say nothing rather than
  // guessing a visibility.
  if (isPublic == null) return null;

  const label = t(
    isPublic ? "COMMON.PUBLIC_OPPORTUNITY" : "COMMON.PRIVATE_OPPORTUNITY"
  );
  const hint = t(
    isPublic
      ? "COMMON.PUBLIC_OPPORTUNITY_HINT"
      : "COMMON.PRIVATE_OPPORTUNITY_HINT"
  );

  return (
    <span
      className={`inline-flex items-center gap-1 align-middle ${className}`}
      title={`${label} — ${hint}`}
    >
      <FiInfo
        className="w-4 h-4 shrink-0 text-primary-5"
        aria-hidden="true"
        focusable="false"
      />
      <span className={showLabel ? "text-xs leading-tight" : "sr-only"}>
        {label}
      </span>
    </span>
  );
}

export default OpportunityBadges;
