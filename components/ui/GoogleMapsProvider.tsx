"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import { ReactNode } from "react";

const libraries: "places"[] = ["places"];

interface GoogleMapsProviderProps {
  children: ReactNode;
}

/**
 * Loads the Google Maps JS API for the two filter modals (opportunities,
 * events) that need Places autocomplete for their location field.
 *
 * This used to wrap `<LoadScript>`, which ties the script's lifetime to this
 * component's own mount/unmount: on unmount it removes the script tag and,
 * shortly after, deletes `window.google` entirely. Both filter modals live
 * inside `<Modal>`, which unmounts its children whenever the modal closes —
 * so every close/reopen (and every "Clear filters" remount) tore the script
 * down and reloaded it. Two instances racing that teardown (an old one
 * cleaning up while a new one mounts) could leave `window.google` deleted
 * out from under a child that had already decided the API was ready,
 * throwing inside `AutocompleteInput` and taking the whole page down.
 *
 * `useJsApiLoader` sidesteps this: it loads through `@googlemaps/js-api-loader`'s
 * module-level singleton `Loader`, which is idempotent (safe to "load" many
 * times across many mount/unmount cycles) and is never torn down on unmount.
 */
export const GoogleMapsProvider = ({ children }: GoogleMapsProviderProps) => {
  const { isLoaded } = useJsApiLoader({
    id: "__googleMapsScriptId",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  if (!isLoaded) return null;

  return <>{children}</>;
};
