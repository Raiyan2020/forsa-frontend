/* eslint-disable @next/next/no-img-element -- static SVG icons */

import type { ReactNode } from "react";

/** Bold, brand-coloured text — usually the label, sometimes the number. */
export const FACT_PRIMARY = "2xl:text-xl lg:text-base text-base font-bold text-primary-5";
/** Bold, muted text — usually the value. */
export const FACT_SECONDARY = "text-secondary-102 2xl:text-xl lg:text-base text-base font-bold";

interface FactRowProps {
  icon?: string;
  children: ReactNode;
  /**
   * The dates grid spaces its rows with padding, everything else with margin.
   * Kept distinct because they collapse differently against the grid gap.
   */
  spacing?: "margin" | "padding";
  /** Extra classes for the icon, e.g. an optical nudge. */
  iconClassName?: string;
}

/**
 * One line of the details list: an icon, then whatever text the fact needs.
 *
 * The icon's gap is `me-3` — margin on the inline *end*, which is the right in
 * English and the left in Arabic. That is what every one of these rows used to
 * spell out by hand as `language === "ar" ? "ml-3" : "mr-3"`; direction comes
 * from `<html dir>`, which the i18n provider keeps in step with the language.
 */
export default function FactRow({
  icon,
  children,
  spacing = "margin",
  iconClassName = "",
}: FactRowProps) {
  const spacingClass =
    spacing === "padding" ? "pb-5 mobilescreen:pb-3.5" : "mb-5 mobilescreen:mb-3.5";

  return (
    <div className={`flex items-center gap-2 ${spacingClass}`}>
      {icon && (
        <img
          className={`me-3 w-5 h-5 object-contain ${iconClassName}`}
          src={icon}
          alt=""
        />
      )}
      {children}
    </div>
  );
}
