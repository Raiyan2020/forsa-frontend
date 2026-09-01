"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/languageStore";
import Button from "@/components/ui/Button";

export default function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedLanguage = useLanguageStore((s) => s.language);

  useEffect(() => {
    // Set document/page title
    document.title = `404 - ${t("COMMON.PAGE_NOT_FOUND") || "Page Not Found"}`;
  }, [t]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gray-50 px-4 ${
        selectedLanguage === "ar" ? "rtl" : "ltr"
      }`}
    >
      <div className="max-w-md w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary-5">404</h1>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            {t("COMMON.PAGE_NOT_FOUND") || "Page Not Found"}
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            {t("COMMON.PAGE_NOT_FOUND_MESSAGE") || "The page you are looking for does not exist."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="primary"
            size="medium"
            onClick={() => router.push("/")}
            className="w-full"
          >
            {t("COMMON.GO_TO_HOME") || "Go to Home"}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            onClick={() => router.back()}
            className="w-full"
          >
            {t("COMMON.GO_BACK") || "Go Back"}
          </Button>
        </div>
      </div>
    </div>
  );
}

