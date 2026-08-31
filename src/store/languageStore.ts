import { create } from "zustand";
import { persist } from "zustand/middleware";

export const AR = "ar";
export const EN = "en";

interface LanguageState {
  language: string;
  setLanguage: (lang: string) => void;
  getDirection: () => "rtl" | "ltr";
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: EN,
      setLanguage: (lang) => set({ language: lang }),
      getDirection: () => (get().language === AR ? "rtl" : "ltr"),
    }),
    {
      name: "fursa-language",
    }
  )
);
