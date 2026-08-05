/**
 * Server-only API utilities.
 * These functions use native `fetch()` with Next.js ISR revalidation.
 * They do NOT import Zustand or axios — safe to call in Server Components.
 */
import { cache } from "react";
import { API_BASE_URL } from "@/lib/api/config";

/**
 * Headers for server-side API calls. These responses are ISR-cached and shared
 * by every visitor, so the language is pinned to English rather than read from
 * the (client-only) language store — the per-user language is applied by
 * `lib/api/client.ts` once the page hydrates.
 */
export const SERVER_API_HEADERS = {
  "x-lang": "en",
  "Accept-Language": "en",
  Accept: "application/json",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BannerImage {
  image: string;
  banner_url?: string;
}

export interface BannerStatistics {
  volunteer_count: number;
  volunteer_team_count: number;
  organization_count: number;
}

export interface BannerData {
  banner_images: BannerImage[];
  statistics: BannerStatistics;
}

export interface SponsorItem {
  id: number;
  sponsor_logo: string;
  org_name: string;
}

export interface OpportunityImage {
  image: string;
}

export interface HomeOpportunity {
  id: number;
  opportunity_images: OpportunityImage[];
  title_en: string;
  title_ar: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  from_age: number;
  to_age?: number;
  format?: string;
  format_display?: { value_en: string; value_ar: string };
  learning_type_display?: { value_en: string; value_ar: string };
  location_en?: string;
  location_ar?: string;
  registered_volunteers_count: number;
  participants_needed: number;
  interest_display?: Array<{ value_en: string; value_ar: string }>;
  opportunity_status?: string;
  due_date: string;
  is_supports_disabled?: boolean;
  is_urgent?: boolean;
  is_relief?: boolean;
}

export interface EventImage {
  image: string;
}

export interface HomeEvent {
  id: number;
  event_images: EventImage[];
  title_en: string;
  title_ar: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  registration_required: boolean;
  registered_volunteers_count: number;
  participants_needed: number;
  event_status?: string;
  due_date: string;
  view_count: number;
  participation_type_display?: { value_en: string; value_ar: string };
  event_type_display?: { value_en: string; value_ar: string };
  interest_display?: Array<{ value_en: string; value_ar: string }>;
  location_en?: string;
  location_ar?: string;
}

export interface UserProfile {
  full_name: string;
  profile_pic: string | null;
}

export interface CommunityPost {
  id: number;
  nickname: string | null;
  idea_text_en: string;
  idea_text_ar: string;
  is_creator: boolean;
  user: UserProfile;
}

// ─── Fetch functions ───────────────────────────────────────────────────────────

/**
 * Fetches banner images and statistics.
 * ISR: revalidates every 60 seconds.
 * React `cache()` deduplicates multiple calls in the same render.
 */
export const fetchBannerData = cache(async (): Promise<BannerData | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/banner-images/`, {
      next: { revalidate: 60 },
      headers: SERVER_API_HEADERS,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as BannerData) ?? null;
  } catch {
    return null;
  }
});

/**
 * Fetches sponsor logos.
 * ISR: revalidates every 5 minutes.
 */
export const fetchSponsors = cache(async (): Promise<SponsorItem[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/sponsors/`, {
      next: { revalidate: 300 },
      headers: SERVER_API_HEADERS,
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data as SponsorItem[]) ?? [];
  } catch {
    return [];
  }
});

/**
 * Fetches up to 6 volunteer opportunities for the homepage carousel.
 * ISR: revalidates every 2 minutes.
 */
export const fetchHomeVolunteerOpportunities = cache(
  async (): Promise<HomeOpportunity[]> => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/list-volunteer-opportunities/?page=1&limit=6`,
        {
          next: { revalidate: 120 },
          headers: SERVER_API_HEADERS,
        }
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json?.data as HomeOpportunity[]) ?? [];
    } catch {
      return [];
    }
  }
);

/**
 * Fetches up to 6 learn-and-serve opportunities for the homepage carousel.
 * ISR: revalidates every 2 minutes.
 */
export const fetchHomeLearnServeOpportunities = cache(
  async (): Promise<HomeOpportunity[]> => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/learn-serve-opportunities/?page=1&limit=6`,
        {
          next: { revalidate: 120 },
          headers: SERVER_API_HEADERS,
        }
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json?.data as HomeOpportunity[]) ?? [];
    } catch {
      return [];
    }
  }
);

/**
 * Fetches up to 6 events for the homepage.
 * ISR: revalidates every 2 minutes.
 */
export const fetchHomeEvents = cache(async (): Promise<HomeEvent[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/events/?page=1&limit=6`, {
      next: { revalidate: 120 },
      headers: SERVER_API_HEADERS,
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data as HomeEvent[]) ?? [];
  } catch {
    return [];
  }
});

/**
 * Fetches community posts for homepage.
 * ISR: revalidates every 2 minutes.
 */
export const fetchHomeCommunityPosts = cache(
  async (): Promise<CommunityPost[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/posts/?page=1&limit=6`, {
        next: { revalidate: 120 },
        headers: SERVER_API_HEADERS,
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json?.data as CommunityPost[]) ?? [];
    } catch {
      return [];
    }
  }
);
