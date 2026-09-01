/**
 * Server-only CMS fetchers (`GET /home/`, `GET /pages/{slug}/`).
 * These functions use native `fetch()` with Next.js ISR revalidation.
 * They do NOT import Zustand or axios — safe to call in Server Components.
 *
 * The payload types live in the shared layer (`features/shared/types/cms.ts`)
 * because admin-editable CMS content is consumed across features.
 */
import { cache } from "react";

import { API_BASE_URL, SERVER_API_HEADERS } from "@/lib/api/config";
import type { CmsPage, HomeCms } from "@/features/shared";

/**
 * Fetches the whole admin-editable homepage payload — hero + banners,
 * statistics, "Why Fursa" cards, the share-an-idea block and the footer /
 * contact details — in a single request.
 *
 * The response carries both `*_en` and `*_ar` fields, so one ISR-cached copy
 * serves both locales; the language is picked at render time.
 * ISR: revalidates every 60 seconds.
 */
export const fetchHomeCms = cache(async (): Promise<HomeCms | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/home/`, {
      next: { revalidate: 60 },
      headers: SERVER_API_HEADERS,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.key !== "success" || json?.response_status?.error) return null;
    return (json.data as HomeCms) ?? null;
  } catch {
    return null;
  }
});

/**
 * Fetches one CMS page (`about`, `privacy`, `terms`, or anything the admin
 * publishes). Returns null when the slug does not exist — callers render a
 * not-found page rather than falling back to static copy.
 * ISR: revalidates every 5 minutes.
 */
export const fetchCmsPage = cache(async (slug: string): Promise<CmsPage | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/pages/${encodeURIComponent(slug)}/`, {
      next: { revalidate: 300 },
      headers: SERVER_API_HEADERS,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.key !== "success" || json?.response_status?.error) return null;
    return (json.data as CmsPage) ?? null;
  } catch {
    return null;
  }
});

/**
 * Fetches every published CMS page (used to pre-render the generic
 * `/pages/[slug]` route).
 * ISR: revalidates every 5 minutes.
 */
export const fetchCmsPages = cache(async (): Promise<CmsPage[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/pages/`, {
      next: { revalidate: 300 },
      headers: SERVER_API_HEADERS,
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json?.key !== "success" || json?.response_status?.error) return [];
    return (json.data as CmsPage[]) ?? [];
  } catch {
    return [];
  }
});
