"use client";

import { useTranslation } from "react-i18next";
import Title from "./Title";

/** Tiny client island just for the translated heading. */
export default function SponsorsHeading() {
  const { t } = useTranslation();
  return <Title text={t("COMMON.FORSA.SPONSOR")} variant="default" hasMargin={false} />;
}
