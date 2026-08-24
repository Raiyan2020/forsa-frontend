"use client";

import { LoadScript } from "@react-google-maps/api";
import { ReactNode, useState } from "react";

const libraries: "places"[] = ["places"];

declare global {
  interface Window {
    google?: { maps?: unknown };
  }
}

interface GoogleMapsProviderProps {
  children: ReactNode;
}

/**
 * Lazy-loaded Google Maps provider.
 * Only use this wrapper on pages that actually need Google Maps.
 *
 * Several pages (VolunteerForm, LearnServeForm, EventForm, the two filter
 * modals) each mount their own instance of this. `<LoadScript>`'s own
 * `componentDidMount` bails out — permanently, without ever setting
 * `loaded: true` — the moment `window.google.maps` is already defined, which
 * it will be after visiting any *other* page that used this component in the
 * same client-side session (Next's SPA navigation never reloads the page, so
 * that global sticks around). The result was every subsequent page hitting
 * that bail-out and getting stuck on `<LoadScript>`'s default "Loading..."
 * fallback forever. Short-circuiting here — before a new `<LoadScript>` ever
 * mounts — is what the library's own check expects the caller to do.
 */
export const GoogleMapsProvider = ({ children }: GoogleMapsProviderProps) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [alreadyLoaded] = useState(
    () => typeof window !== "undefined" && Boolean(window.google?.maps)
  );

  if (alreadyLoaded) {
    return <>{children}</>;
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
    >
      {children}
    </LoadScript>
  );
};
