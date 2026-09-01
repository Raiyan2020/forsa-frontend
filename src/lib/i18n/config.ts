import i18n from "i18next";
import { initReactI18next } from "react-i18next";

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
