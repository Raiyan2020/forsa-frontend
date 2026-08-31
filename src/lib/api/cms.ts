/**
 * Admin-editable CMS content (`GET /home/`, `GET /pages/`).
 *
 * These payloads always carry both `*_en` and `*_ar` variants regardless of the
 * language header, so a single ISR-cached server response can serve both
 * locales — the field is picked at render time with `pickLocalized`.
 *
 * Types only + pure helpers: this module is imported from Server Components and
 * Client Components alike, so it must not pull in axios or Zustand.
 */

export type CmsLocale = "en" | "ar";

export interface WhyFursaItem {
  id: number;
  title_en: string | null;
  title_ar: string | null;
  icon: string | null;
}

export interface HeroBanner {
  id: number;
  image: string | null;
  banner_url: string | null;
}

export interface HeroCms {
  title_en: string | null;
  title_ar: string | null;
  banners: HeroBanner[];
}

export interface HomeStatistics {
  volunteer_count: number;
  volunteer_team_count: number;
  organization_count: number;
}

export interface FooterPageLink {
  slug: string;
  title_en: string | null;
  title_ar: string | null;
}

export interface FooterContact {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_en: string | null;
  address_ar: string | null;
  page_text_en: string | null;
  page_text_ar: string | null;
}

export interface FooterSocial {
  tiktok: string | null;
  twitter: string | null;
  youtube: string | null;
  instagram: string | null;
}

export interface FooterCms {
  pages: FooterPageLink[];
  contact_email: string | null;
  contact: FooterContact;
  social: FooterSocial;
  copyright_en: string | null;
  copyright_ar: string | null;
}

export interface ShareIdeaCms {
  slug: string;
  title_en: string | null;
  title_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image: string | null;
}

/**
 * `GET /home/`. Only the admin-editable sections are typed here — the feed keys
 * (`opportunities`, `events`, `community`, …) keep their own dedicated
 * endpoints and types.
 */
export interface HomeCms {
  hero: HeroCms;
  statistics: HomeStatistics;
  why_fursa: WhyFursaItem[];
  share_idea: ShareIdeaCms | null;
  footer: FooterCms | null;
}

/** `GET /pages/{slug}/` — `content_*` may contain HTML. */
export interface CmsPage {
  id: number;
  slug: string;
  title_en: string | null;
  title_ar: string | null;
  content_en: string | null;
  content_ar: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Picks the field matching the current locale, falling back to the other one. */
export function pickLocalized(
  en: string | null | undefined,
  ar: string | null | undefined,
  locale: string
): string {
  const preferred = locale === "ar" ? ar : en;
  return (preferred || en || ar || "").trim();
}

/**
 * CMS slugs that already have a bespoke route in the app. Anything else falls
 * through to the generic `/pages/[slug]` renderer, so an admin can publish a
 * new page without a frontend deploy.
 */
export const CMS_PAGE_ROUTES: Record<string, string> = {
  about: "/about-us",
  privacy: "/privacy-policy",
  terms: "/termsofuse",
};

export function cmsPageHref(slug: string): string {
  return CMS_PAGE_ROUTES[slug] ?? `/pages/${slug}`;
}
