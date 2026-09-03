"use client";

import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/helpers";

// Leaflet's default marker icon resolves its image URLs relative to its own
// CSS file at runtime, which breaks under a bundler that fingerprints/inlines
// those assets differently (Turbopack included). An inline SVG sidesteps that
// asset-resolution question entirely — plus it lets the pin match the app's
// own brand color instead of Leaflet's stock blue.
const markerIcon = L.divIcon({
  className: "",
  html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="#29246D"/>
    <circle cx="16" cy="16" r="6.5" fill="white"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

// Kuwait City — every opportunity/event on this platform is local to Kuwait,
// so an empty map should already be looking at the right part of the world.
const DEFAULT_CENTER: [number, number] = [29.3759, 47.9774];
const DEFAULT_ZOOM = 11;
const PICKED_ZOOM = 15;

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

/**
 * `MapContainer`'s `center`/`zoom` props only apply on the initial mount —
 * react-leaflet doesn't re-pan the view when they change afterwards. Without
 * this, typing an address into the location field (which resolves to new
 * `latitude`/`longitude` props) silently repositions the marker with no
 * visible movement of the map itself. Also fires after a click/drag pick,
 * where it's a harmless no-op re-assertion of the same point.
 */
function RecenterMap({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1]]);
  return null;
}

interface LocationMapPickerProps {
  latitude?: string;
  longitude?: string;
  onPick: (lat: string, lng: string) => void;
  className?: string;
}

export default function LocationMapPicker({
  latitude,
  longitude,
  onPick,
  className,
}: LocationMapPickerProps) {
  const { t } = useTranslation();
  const lat = latitude ? Number(latitude) : undefined;
  const lng = longitude ? Number(longitude) : undefined;
  const hasPosition = lat !== undefined && !Number.isNaN(lat) && lng !== undefined && !Number.isNaN(lng);
  const position: [number, number] = hasPosition ? [lat as number, lng as number] : DEFAULT_CENTER;

  return (
    // `isolate` traps Leaflet's own internal z-index stack (its panes and
    // controls go up to 1000 — see leaflet.css) inside this box, so it can
    // never bleed out and out-rank unrelated positioned page elements like a
    // modal overlay (Modal.tsx sits at z-[99]).
    <div className={cn("isolate mb-4 w-full", className)}>
      <p className="mb-2 text-sm text-primary-5">
        {t("COMMON.CLICK_MAP_TO_SET_LOCATION")}
      </p>
      <div className="h-[300px] w-full overflow-hidden rounded-2xl border border-[#29246D1A]/10">
        <MapContainer
          center={position}
          zoom={hasPosition ? PICKED_ZOOM : DEFAULT_ZOOM}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPick
            onPick={(newLat, newLng) => onPick(newLat.toString(), newLng.toString())}
          />
          {hasPosition && (
            <>
              <Marker
                position={position}
                icon={markerIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat: newLat, lng: newLng } = e.target.getLatLng();
                    onPick(newLat.toString(), newLng.toString());
                  },
                }}
              />
              <RecenterMap position={position} zoom={PICKED_ZOOM} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
