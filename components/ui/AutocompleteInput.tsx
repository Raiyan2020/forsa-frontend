"use client";

import { useField } from "formik";
import { useState, useCallback } from "react";
import { Autocomplete } from "@react-google-maps/api";
import Input from "./Input";
import { useTranslation } from "react-i18next";

interface AutocompleteInputProps {
  name: string;
  label?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  onLatChange?: (lat: string) => void;
  onLngChange?: (lng: string) => void;
  hideError?: boolean;
  customClass?: string;
  className?: string;
}

/**
 * Every call site renders this inside `<GoogleMapsProvider>`, which already
 * guarantees the script is loaded before `children` mounts — so this used to
 * ALSO call `useJsApiLoader` itself, loading the Maps JS API a second,
 * independent time via a different mechanism (`@googlemaps/js-api-loader`
 * rather than `<LoadScript>`'s own injector). Google's own script detects
 * that and logs "You have included the Google Maps JavaScript API multiple
 * times on this page", which is a documented source of unpredictable widget
 * behaviour. Removed; this component now simply trusts its provider.
 */
const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  name,
  label,
  onChange,
  onLatChange,
  onLngChange,
  hideError = false,
  customClass,
  className,
}) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [, , helpers] = useField(name);
  const { t } = useTranslation();

  const onLoad = (autoC: google.maps.places.Autocomplete) => {
    setAutocomplete(autoC);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();

      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        const selectedAddress = place?.formatted_address;
        if (selectedAddress) {
          helpers.setValue(selectedAddress);
          onChange(selectedAddress);
          onLatChange?.(String(lat));
          onLngChange?.(String(lng));
          helpers.setError(undefined);
        }
      } else {
        helpers.setError(t("COMMON.SELECT_ADDRESS"));
      }
    }
  };

  const handleBlur = useCallback(() => {
    const value = document.getElementById(name) as HTMLInputElement | null;
    const addressValue = value?.value;

    if (!addressValue) {
      onLatChange?.("");
      onLngChange?.("");
      helpers.setError(t("COMMON.REQUIRED.FIELD"));
      return;
    }

    if (typeof window !== "undefined" && window.google) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: addressValue }, (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          const formattedAddress = results[0].formatted_address;

          helpers.setValue(formattedAddress);
          onChange(formattedAddress);
          onLatChange?.(String(lat));
          onLngChange?.(String(lng));
          helpers.setError(undefined);
        } else {
          helpers.setError(t("COMMON.INVALID_ADDRESS"));
          onLatChange?.("");
          onLngChange?.("");
        }
      });
    }
  }, [name, helpers, onChange, onLatChange, onLngChange, t]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  };

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
      <div>
        <Input
          id={name}
          name={name}
          label={label}
          placeholder=""
          className={className}
          hideError={hideError}
          customClass={customClass}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
    </Autocomplete>
  );
};

export default AutocompleteInput;
