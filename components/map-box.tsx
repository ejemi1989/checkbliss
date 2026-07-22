"use client";

import { useEffect, useRef } from "react";

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

export function MapBox({
  markers,
  center,
  zoom = 12,
  className = "",
  interactive = false,
  height = "100%",
}: MapBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container || markers.length === 0) return;
    let cancelled = false;

    async function init() {
      if (!(window as any).mapboxgl) {
        await new Promise<void>((resolve) => {
          const existing = document.querySelector("script[src*='mapbox-gl']");
          if (existing) {
            existing.addEventListener("load", () => resolve());
            return;
          }
          const css = document.createElement("link");
          css.href = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css";
          css.rel = "stylesheet";
          document.head.appendChild(css);
          const script = document.createElement("script");
          script.src = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js";
          script.async = true;
          script.addEventListener("load", () => resolve());
          document.head.appendChild(script);
        });
        if (cancelled) return;
      }

      const mapboxgl = (window as any).mapboxgl;
      mapboxgl.accessToken = token;

      if (mapRef.current) mapRef.current.remove();
      const mapCenter = center ?? { lat: markers[0].lat, lng: markers[0].lng };

      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/light-v11",
        center: [mapCenter.lng, mapCenter.lat],
        zoom,
        interactive,
      });

      if (!interactive) {
        map.scrollZoom.disable();
        map.dragPan.disable();
        map.doubleClickZoom.disable();
      }

      markers.forEach((m) => {
        const el = document.createElement("div");
        const color = m.color ?? "#2F3D2C";
        el.innerHTML = `<span style="background:${color};color:#FCFDFB;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:${interactive ? "pointer" : "default"}">${m.label ?? ""}</span>`;
        const marker = new mapboxgl.Marker({ element: el.firstElementChild, anchor: "bottom" })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
        if (m.popup && interactive) {
          marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setText(m.popup));
        }
      });

      mapRef.current = map;
      loadedRef.current = true;
    }

    init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
    };
  }, [markers, center, zoom, interactive]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className={`bg-ink/90 flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <svg className="w-10 h-10 text-white/20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <p className="font-sans text-sm text-white/40">Map unavailable</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={{ height }} />;
}
