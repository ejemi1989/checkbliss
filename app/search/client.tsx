"use client";

import { useState, useMemo, Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import type { SeedProperty } from "@/lib/seed-data";
import { SearchBar } from "@/components/search-bar";
import { Footer } from "@/components/footer";
import { propertyHref } from "@/lib/slug";
import { formatMinor, convertMinor, type CurrencyCode, CURRENCY_OPTIONS } from "@/lib/currency";

type SortKey = "price-asc" | "price-desc" | "beds-asc" | "beds-desc" | "name" | null;

export function SearchResultsClient({
  properties,
  activeWhere,
  checkIn,
  checkOut,
  displayCurrency = "GBP",
}: {
  properties: SeedProperty[];
  activeWhere: string;
  checkIn: string;
  checkOut: string;
  displayCurrency?: CurrencyCode;
}) {
  const hasSearch = !!(activeWhere || checkIn || checkOut);
  const displayWhere = activeWhere || "Lagos";

  const defaultCurrency: CurrencyCode = displayCurrency !== "GBP" ? displayCurrency : "GBP";
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("checkbliss_currency");
      if (v === "USD" || v === "EUR") setCurrency(v);
    } catch { /* SSR guard */ }
    setHydrated(true);
  }, []);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const updateCurrency = (c: CurrencyCode) => {
    setCurrency(c);
    localStorage.setItem("checkbliss_currency", c);
    setCurrencyOpen(false);
  };

  const [sort, setSort] = useState<SortKey>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const filtered = useMemo(() => {
    let result = [...properties];

    if (sort === "price-asc") result.sort((a, b) => a.nightly_rate_minor - b.nightly_rate_minor);
    else if (sort === "price-desc") result.sort((a, b) => b.nightly_rate_minor - a.nightly_rate_minor);
    else if (sort === "beds-asc") result.sort((a, b) => a.bedrooms - b.bedrooms);
    else if (sort === "beds-desc") result.sort((a, b) => b.bedrooms - a.bedrooms);
    else if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));

    if (!sort && !hasSearch) {
      result = result.filter((p) => p.city === displayWhere);
    }

    return result;
  }, [properties, sort, hasSearch, displayWhere]);

  const propertyCoords = useMemo(() => {
    const center = activeWhere === "Abuja"
      ? { lat: 9.0695, lng: 7.4837 }
      : { lat: 6.4295, lng: 3.4219 };
    return filtered.map((p, i) => ({
      id: p.id,
      name: p.name,
      lat: center.lat + (Math.sin(i * 2.3) * 0.06),
      lng: center.lng + (Math.cos(i * 2.7) * 0.08),
      price: formatMinor(
        currency === "GBP" ? p.nightly_rate_minor : convertMinor(p.nightly_rate_minor, currency),
        currency,
      ),
    }));
  }, [filtered, activeWhere, currency]);

  const cycleSort = (key: SortKey) => {
    setSort((prev) => (prev === key ? null : key));
    setSortOpen(false);
  };

  const sortLabel = sort
    ? { "price-asc": "Price ↑", "price-desc": "Price ↓", "beds-asc": "Beds ↑", "beds-desc": "Beds ↓", "name": "Name" }[sort]
    : "Sort";

  useEffect(() => {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (typeof window === "undefined" || !MAPBOX_TOKEN) return;
    const container = mapContainerRef.current;
    if (!container || propertyCoords.length === 0) return;
    let cancelled = false;

    async function loadAndRender() {
      if (!(window as any).mapboxgl) {
        await new Promise<void>((resolve) => {
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
      mapboxgl.accessToken = MAPBOX_TOKEN;

      if (mapRef.current) mapRef.current.remove();

      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/light-v11",
        center: [propertyCoords[0].lng, propertyCoords[0].lat],
        zoom: 11,
        interactive: false,
      });

      propertyCoords.forEach((c) => {
        const el = document.createElement("div");
        el.innerHTML = `<span class="map-marker-badge">${c.price}</span>`;
        new mapboxgl.Marker({ element: el.firstElementChild, anchor: "bottom" })
          .setLngLat([c.lng, c.lat])
          .addTo(map);
      });

      mapRef.current = map;
    }

    loadAndRender();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
    };
  }, [propertyCoords]);

  return (
    <div className="min-h-screen bg-canvas">
      <style>{`
        .map-marker-badge {
          background: #2F3D2C;
          color: #FCFDFB;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          font-family: var(--font-sans, Inter, system-ui, sans-serif);
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,.2);
          cursor: default;
        }
      `}</style>
      {/* Header */}
      <header className="bg-card border-b border-hairline">
        <div className="max-w-[1240px] mx-auto px-8 py-5 flex items-center justify-between max-sm:px-5">
          <Link href="/" className="shrink-0 no-underline">
            <img src="/assets/images/logo/Logo.png" alt="CheckinBliss" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="font-sans text-[13px] font-medium text-ink-secondary no-underline hover:text-green-soft transition-colors">
              Home
            </Link>
            <div className="relative">
              <button
                className="flex items-center gap-1.5 font-sans text-[13px] font-medium text-ink-secondary border-b border-transparent hover:border-hairline transition-colors pb-0.5 cursor-pointer bg-transparent"
                onClick={() => setCurrencyOpen(!currencyOpen)}
                onBlur={() => setTimeout(() => setCurrencyOpen(false), 200)}
              >
                {currency}
                <svg className={`w-2.5 h-2.5 transition-transform ${currencyOpen ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5l3 3 3-3"/>
                </svg>
              </button>
              {currencyOpen && (
                <div className="absolute top-full right-0 mt-2 w-36 bg-card rounded-xl border border-hairline shadow-xl z-50 overflow-hidden">
                  {CURRENCY_OPTIONS.map((c) => (
                    <button
                      key={c.code}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-medium cursor-pointer border-none bg-transparent transition-colors ${currency === c.code ? "bg-primary-bg text-primary" : "text-ink-secondary hover:bg-bone"}`}
                      onClick={() => updateCurrency(c.code)}
                    >
                      <span className="mr-2">{c.flag}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search bar */}
      <div className="bg-card border-b border-hairline">
        <div className="max-w-[860px] mx-auto px-8 py-6 max-sm:px-5">
          <Suspense fallback={<div className="h-[52px] bg-bone rounded-[var(--radius-sm)] animate-pulse" />}>
            <SearchBar />
          </Suspense>
        </div>
      </div>

      {/* Filters */}
      {hasSearch && (
        <div className="px-8 py-4 max-sm:px-5">
          <div className="max-w-[1240px] mx-auto flex items-center justify-between">
            <p className="font-sans text-[13px] text-mute font-medium">
              {filtered.length} {filtered.length === 1 ? "stay" : "stays"}
            </p>
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                onBlur={() => setTimeout(() => setSortOpen(false), 200)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-[13px] font-medium cursor-pointer transition-all ${
                  sort ? "border-green-soft text-ink bg-green-soft/5" : "border-hairline text-ink-secondary bg-card hover:border-line"
                }`}
              >
                {sortLabel}
                <svg className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5l3 3 3-3"/>
                </svg>
              </button>
              {sortOpen && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-card rounded-xl border border-hairline shadow-lg z-40 py-2 animate-slideIn">
                  {[
                    { label: "Price ↑", key: "price-asc" as SortKey },
                    { label: "Price ↓", key: "price-desc" as SortKey },
                    { label: "Bedrooms ↑", key: "beds-asc" as SortKey },
                    { label: "Bedrooms ↓", key: "beds-desc" as SortKey },
                    { label: "Name A–Z", key: "name" as SortKey },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => cycleSort(opt.key)}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-sans cursor-pointer border-none bg-transparent transition-colors ${
                        sort === opt.key ? "text-ink font-semibold bg-soft" : "text-ink-secondary hover:bg-bone"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <main className="py-10 pb-[80px]" id="main-content">
        <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
          {filtered.length === 0 && hasSearch ? (
            <div className="text-center py-16">
              <h1 className="font-display text-2xl font-medium text-ink mb-3">No stays found</h1>
              <p className="font-sans text-[14px] text-ink-secondary mb-8 max-w-[480px] mx-auto">
                No stays match your search. Try a different city or date range.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/search?where=Lagos" className="rounded-full border border-hairline px-5 py-2.5 text-[13px] font-medium text-ink-secondary hover:bg-card transition-colors no-underline">Browse Lagos</Link>
                <Link href="/search?where=Abuja" className="rounded-full border border-hairline px-5 py-2.5 text-[13px] font-medium text-ink-secondary hover:bg-card transition-colors no-underline">Browse Abuja</Link>
                <Link href="/search" className="rounded-[var(--radius-sm)] bg-brass px-5 py-2.5 text-[13px] font-semibold text-bone hover:bg-brass-dark transition-colors no-underline">Clear search</Link>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <img src="/assets/images/logo/Logo.png" alt="CheckinBliss" className="h-8 w-auto mx-auto mb-8 opacity-60" />
              <h1 className="font-display text-2xl font-medium text-ink mb-3">Browse stays</h1>
              <p className="font-sans text-[14px] text-ink-secondary mb-8">Select a city to begin searching.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/search?where=Lagos" className="rounded-full border border-hairline px-6 py-3 text-[14px] font-medium text-ink-secondary hover:bg-card hover:border-line transition-colors no-underline">Lagos</Link>
                <Link href="/search?where=Abuja" className="rounded-full border border-hairline px-6 py-3 text-[14px] font-medium text-ink-secondary hover:bg-card hover:border-line transition-colors no-underline">Abuja</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_380px] gap-10 items-start max-lg:grid-cols-1">
                <div className="flex flex-col gap-8 max-sm:gap-10">
                  {filtered.map((p) => (
                    <PropertyCard key={p.id} p={p} currency={currency} />
                  ))}
                </div>
                <div className="sticky top-[80px] space-y-6 max-lg:hidden">
                  <div className="bg-card rounded-[var(--radius-lg)] border border-hairline overflow-hidden">
                    <div ref={mapContainerRef} className="w-full aspect-[4/3] bg-ink/90 flex items-center justify-center">
                      <div className="text-center map-placeholder">
                        <svg className="w-12 h-12 text-white/20 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <p className="font-sans text-[14px] text-white/40">{displayWhere}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card rounded-[var(--radius-lg)] border border-hairline p-5">
                    <p className="font-sans text-[13px] text-mute">
                      Every apartment in {displayWhere} is inspected in person before listing. Instant booking — no host approval needed.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PropertyCard({ p, currency = "GBP" }: { p: SeedProperty; currency?: CurrencyCode }) {
  const displayMinor = currency === "GBP" ? p.nightly_rate_minor : convertMinor(p.nightly_rate_minor, currency);
  return (
    <Link
      href={propertyHref(p)}
      className="flex gap-6 no-underline text-inherit group bg-card rounded-[var(--radius-lg)] overflow-hidden border border-hairline hover:border-green-soft/30 transition-all max-sm:flex-col"
    >
      <div className="w-[280px] shrink-0 relative max-sm:w-full">
        <div className="aspect-[5/4] overflow-hidden">
          <img
            src={p.cover_photo_url ?? undefined}
            alt={p.name}
            className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </div>
      <div className="flex flex-col justify-center py-6 pr-5 max-sm:py-4 max-sm:px-5 max-sm:pb-6">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-mute mb-1.5">{p.neighbourhood}</p>
        <h2 className="font-display text-[clamp(18px,1.8vw,24px)] font-normal text-ink leading-[1.2] mb-1">{p.name}</h2>
        <p className="font-sans text-[13px] text-ink-secondary/70 mb-3">{p.city}, Nigeria</p>
        <div className="flex items-center gap-2 font-sans text-[13px] text-ink-secondary/80">
          <span>{p.bedrooms} bed{p.bedrooms > 1 ? "s" : ""}</span>
          <span className="text-hairline-dark">·</span>
          <span>{p.sleeps} guest{p.sleeps > 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-end justify-between mt-3">
          <div className="flex items-baseline gap-1">
            <span className="font-sans text-[20px] font-semibold text-ink tracking-[-0.01em]">{formatMinor(displayMinor, currency)}</span>
            <span className="font-sans text-[13px] font-normal text-ink-secondary/70">night</span>
          </div>
          {p.amenities && p.amenities.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              {p.amenities.slice(0, 2).map((a) => (
                <span key={a} className="text-[11px] text-mute bg-bone px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
