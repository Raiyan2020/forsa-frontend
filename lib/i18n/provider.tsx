"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useLanguageStore } from "@/store/languageStore";
import i18n, { getDirection } from "@/lib/i18n/config";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.dir = getDirection(language);
    document.documentElement.lang = language;
  }, [language]);

  // Determine direction synchronously from the persisted store value.
  // This avoids a full-screen spinner that blocked FCP on every page load.
  const dir = getDirection(language);

  return (
    <>
      <Toaster
        richColors
        position="top-right"
        duration={5000}
        closeButton={true}
        dir={dir}
      />
      <div dir={dir} className="rtl:font-arabic ltr:font-english">
        {children}
      </div>
    </>
  );
}
