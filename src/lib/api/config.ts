const DEFAULT_API_BASE_URL = "https://portal.fursa.raiyan.cc/api";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

/**
 * Headers for server-side API calls. These responses are ISR-cached and shared
 * by every visitor, so the language is pinned to English rather than read from
 * the (client-only) language store — the per-user language is applied by
 * `lib/api/client.ts` once the page hydrates.
 */
export const SERVER_API_HEADERS = {
  "x-lang": "en",
  "Accept-Language": "en",
  // The CMS endpoints (`/home/`, `/pages/`) localize their `msg` from `Lang`.
  Lang: "en",
  Accept: "application/json",
} as const;

