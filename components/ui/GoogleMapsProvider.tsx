"use client";

import { LoadScript } from "@react-google-maps/api";
import { ReactNode } from "react";

const libraries: "places"[] = ["places"];

interface GoogleMapsProviderProps {
  children: ReactNode;
}

/**
 * Lazy-loaded Google Maps provider.
 * Only use this wrapper on pages that actually need Google Maps.
 */
export const GoogleMapsProvider = ({ children }: GoogleMapsProviderProps) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  
  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
    >
      {children}
    </LoadScript>
  );
};
