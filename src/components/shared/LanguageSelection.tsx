"use client";

import { useState, useEffect, useRef, memo } from "react";
import { useLanguageStore } from "@/store/languageStore";
import { useAuthStore } from "@/store/authStore";
// Inline SVG replaces react-icons/bi — avoids pulling bi icon library into the layout bundle
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </svg>
  );
}
import apiClient from "@/lib/api/client";
import { restoreConsumedNavState } from "@/lib/navigationState";
import i18n from "@/lib/i18n/config";
import { useTranslation } from "react-i18next";

const options = [
  { code: "en", label: "EN" },
  { code: "ar", label: "ع" },
];

const LanguageSelection = () => {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const user = useAuthStore((s) => s.user);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  const handleSelect = async (languageCode: string) => {
    setIsOpen(false);

    // The menu only ever offers the other language, but a no-op reload is a
    // bad enough experience to guard against anyway.
    if (languageCode === language) return;

    setLanguage(languageCode);
    i18n.changeLanguage(languageCode);

    // If user is logged in, update preferred language on backend
    if (user?.id) {
      try {
        const formData = new FormData();
        formData.append("preferred_language", languageCode);
        await apiClient.post("/account/", formData);
      } catch {
        // Silently ignore — language still switches locally
      }
    }

    /*
     * Reload the page in the new language.
     *
     * Three things about the timing and the method:
     *
     * - It runs *after* the account call settles. Reloading first aborts the
     *   in-flight request and the preference never reaches the server, so the
     *   next sign-in comes back in the old language.
     * - It is a full reload, not `router.refresh()`. Refresh re-renders the
     *   Server Components but keeps the React Query cache, and the cache is
     *   where the stale text lives: query keys that do not include the
     *   language still hold strings the backend localized under the previous
     *   `x-lang` header, and would serve them until `staleTime` expires.
     * - `restoreConsumedNavState()` first, because `takeNavState` clears its
     *   payload on read. Without it, switching language on a repost form
     *   would come back as an empty create form with the target gone.
     *
     * The persisted language is already on disk: Zustand's `persist`
     * middleware writes to localStorage synchronously inside `setLanguage`.
     */
    restoreConsumedNavState();
    window.location.reload();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={dropdownRef}
      className={`relative rounded-xl flex items-center px-3 bg-primary-10 w-[70px] xss:w-[60px] 2xl:h-[50px] xl:h-[50px] h-[50px] mediumscreen3:!h-[34px] mobilescreen:h-[32px] ${
        language === "ar" ? "font-arabic" : "font-english"
      }`}
    >
      <button
        className="w-full flex items-center justify-between text-primary-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white rounded-lg p-1"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("COMMON.SELECT_LANGUAGE") || "Select Language"}
        aria-expanded={isOpen}
      >
        <span className={`text-white ${language === "ar" ? "mx-auto pb-[6px] pl-[10px]" : ""}`}>
          {options.find((opt) => opt.code === language)?.label || "EN"}
        </span>
        <ChevronDownIcon
          className={`text-white transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          className="absolute left-0 mt-2 w-[85px] bg-white shadow-[0px_4px_8px_3px_#00000026] rounded-[15px] py-2 top-[45px] z-50"
          role="listbox"
          aria-label={t("COMMON.SELECT_LANGUAGE") || "Select Language"}
        >
          {options
            .filter((option) => option.code !== language)
            .map((option) => (
              <li
                key={option.code}
                role="option"
                aria-selected="false"
                className={`px-2 py-1 cursor-pointer hover:bg-[#F5F5F5] mx-2 rounded-xl text-center gap-2 h-10 text-lg font-bold text-secondary-101 ${
                  option.code === "ar" ? "font-arabic" : "font-english"
                }`}
              >
                <button
                  onClick={() => handleSelect(option.code)}
                  className="w-full h-full text-center focus:outline-none"
                  aria-label={option.label}
                >
                  {option.label}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default memo(LanguageSelection);
