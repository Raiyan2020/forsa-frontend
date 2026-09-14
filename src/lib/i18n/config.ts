import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import moment from "moment";
import "moment/locale/ar";

// We import directly (works in both client & server build).
// `locales/` lives at the project root (outside `src/`), hence the three levels up.
import translationEN from "../../../locales/en/translation.json";
import translationAR from "../../../locales/ar/translation.json";

export const AR = "ar";
export const EN = "en";

const resources = {
  [EN]: { translation: translationEN },
  [AR]: { translation: translationAR },
};

/**
 * Moment's `ar` locale ships a `postformat` hook that rewrites every ASCII
 * digit in a formatted string into Arabic-Indic (`١٤:٣٠`, `٢٠٢٦`). Digits in
 * this product stay Western in both languages, so the hook is replaced with one
 * that only localizes the comma and leaves numbers alone.
 *
 * The locale is imported here rather than left to whichever component happens
 * to pull it in: `import "moment/locale/ar"` runs its module body exactly once,
 * so doing it next to the override guarantees the override is applied after the
 * locale is defined, whatever the module evaluation order turns out to be.
 */
moment.updateLocale("ar", {
  postformat: (formatted: string) => formatted.replace(/,/g, "،"),
});

// Guard: only initialise once (important in Next.js due to hot-reload)
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: EN,
    fallbackLng: EN,
    interpolation: { escapeValue: false },
    detection: { caches: [] },
  });
}

export const getDirection = (language: string): "rtl" | "ltr" =>
  language === AR ? "rtl" : "ltr";

export default i18n;
