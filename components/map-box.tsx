"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  popup?: string;
}

interface MapBoxProps {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  interactive?: boolean;
  height?: string;
}

function MapFallback({ className, height }: { className?: string; height?: string }) {
  return (
    <div className={`bg-ink/90 flex items-center justify-center ${className ?? ""}`} style={{ height: height ?? "100%" }}>
      <div className="text-center">
        <svg className="w-10 h-10 text-white/20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
        <p className="font-sans text-sm text-white/40">Map unavailable</p>
      </div>
    </div>
  );
}

function isBadToken(token: string): boolean {
  return !token || token.startsWith("sk.");
}

const HOUSE_ICON = `<svg viewBox="0 0 20 18" width="15" height="13" fill="currentColor" aria-hidden="true"><path d="M10 1L0 9h2v8h6v-5h4v5h6V9h2z"/></svg>`;

export function MapBox({
  markers,
  center,
  zoom = 12,
  className = "",
  interactive = false,
  height = "100%",
}: MapBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  useEffect(() => {
    if (isBadToken(token)) return;
    const container = containerRef.current;
    if (!container) return;

    mapboxgl.accessToken = token;

    if (mapRef.current) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    }

    const mapCenter = center ?? (markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 0, lng: 0 });

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/light-v11",
      center: [mapCenter.lng, mapCenter.lat],
      zoom,
      interactive,
    });

    map.on("error", (e) => {
      const msg = (e.error?.message ?? "").toLowerCase();
      if (msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("not found")) {
        setMapError(true);
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        map.remove();
        mapRef.current = null;
      }
    });

    map.on("load", () => {
      const brandColors = [
        ["landuse", "#D8DDD0"],
        ["water", "#C0CBB4"],
        ["building", "#D4D8CA"],
        ["landuse-residential", "#D8DDD0"],
        ["park", "#D8DDD0"],
        ["grass", "#D8DDD0"],
        ["wood", "#D8DDD0"],
      ];
      brandColors.forEach(([layer, color]) => {
        try { map.setPaintProperty(layer, "fill-color", color); } catch {}
      });
    });

    if (!interactive) {
      map.scrollZoom.disable();
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    }

    const created = markers.map((m) => {
      const el = document.createElement("div");
      el.className = "cb-marker";
      el.innerHTML = HOUSE_ICON;
      el.setAttribute("title", m.label ? `${m.label} / night` : "");
      el.setAttribute("aria-label", m.label ? `${m.label} / night` : "Property location");
      el.style.cursor = interactive ? "pointer" : "default";

      if (interactive) {
        el.addEventListener("mouseenter", () => el.classList.add("is-active"));
        el.addEventListener("mouseleave", () => el.classList.remove("is-active"));
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([m.lng, m.lat])
        .addTo(map);

      if (m.popup && interactive) {
        marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setText(m.popup));
      }
      return marker;
    });

    mapRef.current = map;
    markersRef.current = created;

    return () => {
      created.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [token, markers, center, zoom, interactive]);

  if (isBadToken(token) || mapError) {
    return <MapFallback className={className} height={height} />;
  }

  return <div ref={containerRef} className={className} style={{ height }} />;
}
