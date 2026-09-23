"use client";

import { useTranslation } from "react-i18next";

/** The organizer's permit for this opportunity, when one was uploaded. */
export default function LicenseCard({ image }: { image?: string | null }) {
  const { t } = useTranslation();
  if (!image) return null;

  return (
    <div className="w-full flex flex-col items-center relative bg-[#E5E5E5] md:bottom-[50px] bottom-[50px] lg:bottom-[100px] px-[20px] pb-[30px] pt-[20px]">
      <p className="text-primary-5 2xl:text-base lg:text-sm text-sm font-bold mb-3">
        {t("COMMON.LICENSE")}
      </p>
      <a
        href={image}
        target="_blank"
        rel="noopener noreferrer"
        title={t("COMMON.LICENSE")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- remote upload */}
        <img
          src={image}
          alt={t("COMMON.LICENSE")}
          className="max-w-full max-h-[200px] object-contain rounded-lg border border-gray-300 shadow hover:opacity-90 transition-opacity cursor-pointer"
        />
      </a>
    </div>
  );
}
