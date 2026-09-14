import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";
import { toast } from "sonner";
import i18n from "@/lib/i18n/config";
import { t } from "i18next";
import moment from "moment";
import { parseLocalizedNumber, toWesternDigits } from "@/lib/digits";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a numeric field that may arrive as an Arabic-Indic digit string.
 *
 * Responses are already normalized at the axios boundary (`lib/api/client.ts`),
 * so in practice this now receives ASCII — but it stays tolerant for values
 * that reach the UI by another route (sessionStorage payloads, SSR props,
 * anything hand-built), and it is still the right call before doing arithmetic
 * on an API count.
 */
export const toNumber = parseLocalizedNumber;

/**
 * Render a numeric field as digits.
 *
 * Digits deliberately do **not** follow the UI language: this product renders
 * `12345` in Arabic exactly as in English, so unlike the rest of the i18n layer
 * there is nothing to switch on. Kept as a named helper (rather than inlining
 * `toWesternDigits`) because it also pins the empty/missing case to `"0"`,
 * which the stat cards rely on.
 */
export const toDisplayDigits = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "0";
  return toWesternDigits(value);
};

export const maskEmail = (email: string) => {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (name.length > 3) {
    return `${name.substring(0, 3)}********@${domain}`;
  }
  return `${name}********@${domain}`;
};

export function generateOptions(
  data: { id: string | number; [key: `name_${string}`]: string }[],
  selectedLang: string
) {
  if (data.length)
    return (
      data?.map((ele) => ({
        value: ele?.id,
        label: ele?.[`name_${selectedLang}`],
      })) || []
    );
  else return [];
}

export const generateCodeVerifier = () => {
  if (typeof window === "undefined") return "";
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const generateCodeChallenge = async (
  codeVerifier: string | undefined
) => {
  if (typeof window === "undefined") return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const getDefaultProfileImage = (
  gender: string | undefined,
  maleImg: string,
  femaleImg: string,
  defaultImg: string
): string => {
  if (gender === "Male") {
    return maleImg;
  } else if (gender === "Female") {
    return femaleImg;
  } else {
    return defaultImg;
  }
};

export const handleGoogleLogin = async (tokenResponse: {
  access_token: unknown;
}) => {
  try {
    // Fetch user details using Google OAuth token
    const { data } = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      }
    );

    // Return user data so the calling component can handle it
    return {
      social_media_id: data.sub,
      email: data.email,
      first_name: data.given_name,
      last_name: data.family_name,
      social_media_provider: "google",
      social_profile_pic_url: data.picture,
    };
  } catch (error) {
    console.error("Google login failed:", error);
    toast.error(i18n.t("COMMON.TOAST.GOOGLE_LOGIN_FAILED"));
    return null; // Return null in case of an error
  }
};

/**
 * Reverse/forward geocoding for the location map pickers (create/edit event,
 * volunteer opportunity, learn & serve opportunity). Uses OpenStreetMap's
 * Nominatim rather than Google's Geocoding API — that API rejects
 * referrer-restricted keys outright ("API keys with referer restrictions
 * cannot be used with this API"), and the referrer restriction is the
 * correct one for a key that's otherwise embedded in client-side JS. Nominatim
 * also matches the OSM tiles `LocationMapPicker` already renders, and needs
 * no key. Its usage policy requires a valid Referer identifying the caller —
 * satisfied automatically by the browser's own Referrer-Policy header, no
 * code needed. `nominatim.openstreetmap.org` is on the CSP `connect-src`
 * allowlist in `next.config.ts`.
 */
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
// Every opportunity/event on this platform is local to Kuwait (see
// LocationMapPicker's default map center) — biasing search to it avoids
// forward-geocoding a generic place name to the wrong country.
const NOMINATIM_COUNTRY_CODE = "kw";

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

export const fetchAddress = async (
  latitude: number,
  longitude: number,
  language = "en",
  isSmallAddress = false
): Promise<string> => {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=${language}`
    );
    const data = await response.json();

    if (data && !data.error) {
      if (isSmallAddress) {
        const address: NominatimAddress = data.address || {};
        const parts = [
          address.road || address.neighbourhood || address.suburb,
          address.city_district ||
            address.city ||
            address.town ||
            address.village ||
            address.state,
        ].filter(Boolean);
        return parts.length > 0
          ? parts.join(", ")
          : t("COMMON.ADDRESS_NOT_FOUND");
      }
      return data.display_name || t("COMMON.ADDRESS_NOT_FOUND");
    }
    return t("COMMON.ADDRESS_NOT_FOUND");
  } catch (error) {
    console.error("Error fetching address:", error);
    return t("COMMON.ADDRESS_NOT_FOUND");
  }
};

export const fetchCoordinates = async (
  address: string,
  language = "en"
): Promise<{ lat: number; lng: number } | null> => {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?format=jsonv2&q=${encodeURIComponent(
        address
      )}&accept-language=${language}&countrycodes=${NOMINATIM_COUNTRY_CODE}&limit=1`
    );
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};

/**
 * Append a cache-busting query to an uploaded image URL. The API overwrites a
 * profile picture in place, so the URL is unchanged after a re-upload and the
 * browser would keep serving the previous file from cache.
 *
 * Call this from an event handler or effect — never during render, where the
 * timestamp would differ between the server and client markup.
 */
export const withCacheBust = (url?: string | null): string => {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
};

/**
 * Open an opportunity's / event's location: the map link the organiser saved in
 * `location_url` when there is one, otherwise a Google Maps search built from
 * the stored coordinates.
 */
export const openLocation = (
  locationUrl?: string | null,
  latitude?: number | string | null,
  longitude?: number | string | null
) => {
  const url = locationUrl?.trim();
  if (url) {
    window.open(
      /^https?:\/\//i.test(url) ? url : `https://${url}`,
      "_blank",
      "noopener"
    );
    return;
  }

  if (
    latitude === null ||
    latitude === undefined ||
    latitude === "" ||
    longitude === null ||
    longitude === undefined ||
    longitude === ""
  ) {
    return;
  }

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    "_blank",
    "noopener"
  );
};

export const handleShare = async (url: string, t: (key: string) => string) => {
  const shareData = {
    url: url,
  };

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
    } catch {
      toast.error(t("COMMON.SHARE_FAILED"));
    }
  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(shareData.url).then(
      () => toast.success(t("COMMON.URL_COPIED")),
      () => toast.error(t("COMMON.SHARE_FAILED"))
    );
  }
};

export const calculateHoursDifference = (
  startTime: string,
  endTime: string
): string => {
  if (!startTime || !endTime) return "";
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  let diffMinutes = endTotalMinutes - startTotalMinutes;
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle cases where endTime is on the next day

  const hours = (diffMinutes / 60).toFixed(2); // Return with 2 decimal places
  return hours;
};

export const formatDateToYYYYMMDD = (dateInput: string | Date): string => {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function formatSingleDate(
  date: string,
  locale: string,
  t: (key: string) => string
): string {
  if (!date) {
    return t("COMMON.INVALID_DATE"); // Fallback translation key
  }
  const [year, month, day] = date?.split("-")?.map(Number);

  const monthKeys = {
    1: "COMMON.JANUARY",
    2: "COMMON.FEBRUARY",
    3: "COMMON.MARCH",
    4: "COMMON.APRIL",
    5: "COMMON.MAY",
    6: "COMMON.JUNE",
    7: "COMMON.JULY",
    8: "COMMON.AUGUST",
    9: "COMMON.SEPTEMBER",
    10: "COMMON.OCTOBER",
    11: "COMMON.NOVEMBER",
    12: "COMMON.DECEMBER",
  };

  const monthKey = monthKeys[month as keyof typeof monthKeys];
  const formattedDay = String(day)?.padStart(2, "0");

  if (locale === "ar") {
    return `${formattedDay} ${t(monthKey)} ${year}`;
  }
  return `${t(monthKey)} ${formattedDay}, ${year}`;
}

export function formatDateRange(
  start_date: string,
  end_date: string,
  locale: string,
  t?: (key: string) => string
) {
  const start = moment(start_date, "YYYY-MM-DD");
  const end = moment(end_date, "YYYY-MM-DD");

  const startDay = start.format("DD");
  const endDay = end.format("DD");
  const startMonth = start.month() + 1; // moment months are 0-indexed
  const endMonth = end.month() + 1;

  // Month translation mapping
  const monthKeys = {
    1: "COMMON.JANUARY",
    2: "COMMON.FEBRUARY",
    3: "COMMON.MARCH",
    4: "COMMON.APRIL",
    5: "COMMON.MAY",
    6: "COMMON.JUNE",
    7: "COMMON.JULY",
    8: "COMMON.AUGUST",
    9: "COMMON.SEPTEMBER",
    10: "COMMON.OCTOBER",
    11: "COMMON.NOVEMBER",
    12: "COMMON.DECEMBER",
  };

  // If t is not available (during initial render), fall back to moment localization
  if (!t) {
    start.locale(locale);
    end.locale(locale);
    if (startMonth === endMonth) {
      if (locale === "ar") {
        return `${endDay}-${startDay} ${start.format("MMMM")}`;
      }
      return `${startDay}-${endDay} ${start.format("MMMM")}`;
    } else {
      if (locale === "ar") {
        return `${end.format("DD MMMM")} - ${start.format("DD MMMM")}`;
      }
      return `${start.format("DD MMMM")} - ${end.format("DD MMMM")}`;
    }
  }

  // With translation function available
  const startMonthKey = monthKeys[startMonth as keyof typeof monthKeys];
  const endMonthKey = monthKeys[endMonth as keyof typeof monthKeys];

  if (startMonth === endMonth) {
    if (locale === "ar") {
      return `${endDay}-${startDay} ${t(startMonthKey)}`;
    }
    return `${startDay}-${endDay} ${t(startMonthKey)}`;
  } else {
    if (locale === "ar") {
      return `${startDay} ${t(startMonthKey)} - ${endDay} ${t(endMonthKey)}`;
    }
    return `${startDay} ${t(startMonthKey)} - ${endDay} ${t(endMonthKey)}`;
  }
}

export function formatDecimalHoursToReadable(
  decimalHours: number,
  t: (key: string) => string
): string {
  if (!decimalHours || decimalHours < 0) return "0 min";

  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  if (hours === 0) {
    return `${minutes} ${t("COMMON.MIN")}`;
  } else if (minutes === 0) {
    return `${hours} ${t("COMMON.HR")}`;
  } else {
    return `${hours} ${t("COMMON.HR")} ${minutes} ${t("COMMON.MIN")}`;
  }
}
