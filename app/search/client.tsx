"use client";

import { useState, useMemo, Suspense } from "react";
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

  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    if (displayCurrency !== "GBP") return displayCurrency;
    try {
      const v = localStorage.getItem("checkbliss_currency");
      if (v === "USD" || v === "EUR") return v;
    } catch { /* SSR guard */ }
    return "GBP";
  });
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const updateCurrency = (c: CurrencyCode) => {
    setCurrency(c);
    localStorage.setItem("checkbliss_currency", c);
    setCurrencyOpen(false);
  };

  const [sort, setSort] = useState<SortKey>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [bedFilter, setBedFilter] = useState<number | null>(null);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => p.amenities?.forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [properties]);

  const filtered = useMemo(() => {
    let result = [...properties];

    const activeFilters = Object.entries(filters).filter(([, v]) => v).map(([k]) => k);
    if (activeFilters.length > 0) {
      result = result.filter((p) =>
        activeFilters.every((f) => p.amenities?.includes(f))
      );
    }

    if (bedFilter) {
      result = result.filter((p) => p.bedrooms === bedFilter);
    }

    if (sort === "price-asc") result.sort((a, b) => a.nightly_rate_minor - b.nightly_rate_minor);
    else if (sort === "price-desc") result.sort((a, b) => b.nightly_rate_minor - a.nightly_rate_minor);
    else if (sort === "beds-asc") result.sort((a, b) => a.bedrooms - b.bedrooms);
    else if (sort === "beds-desc") result.sort((a, b) => b.bedrooms - a.bedrooms);
    else if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));

    if (!sort && !hasSearch) {
      result = result.filter((p) => p.city === displayWhere);
    }

    return result;
  }, [properties, filters, bedFilter, sort, hasSearch, displayWhere]);

  const toggleFilter = (amenity: string) => {
    setFilters((prev) => ({ ...prev, [amenity]: !prev[amenity] }));
  };

  const cycleSort = (key: SortKey) => {
    setSort((prev) => (prev === key ? null : key));
    setSortOpen(false);
  };

  const sortLabel = sort
    ? { "price-asc": "Price ↑", "price-desc": "Price ↓", "beds-asc": "Beds ↑", "beds-desc": "Beds ↓", "name": "Name" }[sort]
    : "Sort";

  const bedOptions = useMemo(() => {
    const counts = new Set(properties.map((p) => p.bedrooms));
    return Array.from(counts).sort((a, b) => a - b);
  }, [properties]);

  return (
    <div className="min-h-screen bg-bone">
      {/* Header */}
      <header className="bg-card border-b border-line sticky top-0 z-50">
        <div className="max-w-[1240px] mx-auto px-8 py-4 flex items-center gap-5 max-sm:px-5">
          <Link href="/" className="font-sans text-sm font-medium text-ink-secondary no-underline hover:text-green-soft transition-colors shrink-0">
            &#8592; Home
          </Link>
          <Link href="/" className="shrink-0 no-underline">
            <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-6 w-auto" />
          </Link>
          <div className="ml-auto relative">
            <button
              className="flex items-center gap-1.5 font-sans text-xs font-semibold text-ink-secondary bg-bone border border-hairline rounded-full py-1.5 px-3 cursor-pointer hover:bg-hairline-dark/20 transition-colors"
              onClick={() => setCurrencyOpen(!currencyOpen)}
              onBlur={() => setTimeout(() => setCurrencyOpen(false), 200)}
            >
              {currency}
            </button>
            {currencyOpen && (
              <div className="absolute top-full right-0 mt-1 w-36 bg-white rounded-xl border border-hairline shadow-xl z-50 overflow-hidden">
                {CURRENCY_OPTIONS.map((c) => (
                  <button
                    key={c.code}
                    className={`w-full text-left px-3 py-2 text-sm font-medium cursor-pointer border-none transition-colors ${currency === c.code ? "bg-primary text-white" : "text-ink-secondary hover:bg-bone"}`}
                    onClick={() => updateCurrency(c.code)}
                  >
                    <span className="mr-1.5">{c.flag}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search bar */}
      <div className="bg-card px-8 py-4 border-b border-line max-sm:px-5">
        <div className="max-w-[1240px] mx-auto">
          <Suspense fallback={<div className="h-12 bg-soft rounded-sm animate-pulse" />}>
            <SearchBar />
          </Suspense>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 bg-bone border-b border-line max-sm:px-5">
        <div className="max-w-[1240px] mx-auto flex items-center gap-2 flex-wrap">
          <span className="font-sans text-[13px] text-mute mr-auto">
            <strong className="text-ink">{filtered.length}</strong> {filtered.length === 1 ? "stay" : "stays"} in {displayWhere}
          </span>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all ${
                sort ? "border-green-soft text-ink bg-green-soft/5" : "border-line text-ink-secondary bg-card hover:border-green-soft hover:text-ink"
              }`}
            >
              {sortLabel}
              <svg className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5l3 3 3-3"/>
              </svg>
            </button>
            {sortOpen && (
              <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-line rounded-[var(--radius-md)] shadow-lg z-40 py-1 animate-slideIn">
                {[
                  { label: "Price ↑", key: "price-asc" as SortKey },
                  { label: "Price ↓", key: "price-desc" as SortKey },
                  { label: "Beds ↑", key: "beds-asc" as SortKey },
                  { label: "Beds ↓", key: "beds-desc" as SortKey },
                  { label: "Name", key: "name" as SortKey },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => cycleSort(opt.key)}
                    className={`w-full text-left px-4 py-2 text-sm font-sans cursor-pointer border-none bg-transparent transition-colors ${
                      sort === opt.key ? "text-ink font-semibold bg-soft" : "text-ink-secondary hover:bg-soft"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amenity filters */}
          {allAmenities.slice(0, 4).map((amenity) => (
            <button
              key={amenity}
              onClick={() => toggleFilter(amenity)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all ${
                filters[amenity]
                  ? "border-green-soft bg-green-soft/5 text-ink"
                  : "border-line text-ink-secondary bg-card hover:border-green-soft hover:text-ink"
              }`}
            >
              {amenity}
            </button>
          ))}

          {/* Bed filter */}
          {bedOptions.map((n) => (
            <button
              key={n}
              onClick={() => setBedFilter(bedFilter === n ? null : n)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all ${
                bedFilter === n
                  ? "border-green-soft bg-green-soft/5 text-ink"
                  : "border-line text-ink-secondary bg-card hover:border-green-soft hover:text-ink"
              }`}
            >
              {n} bed{n > 1 ? "s" : ""}
            </button>
          ))}

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-brass bg-brass text-bone text-[13px] font-medium whitespace-nowrap">
            &#10003; Verified only
          </span>
        </div>
      </div>

      {/* Results */}
      <main className="py-10 pb-[80px]" id="main-content">
        <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
          {filtered.length === 0 && hasSearch ? (
            <div className="text-center py-16">
              <h1 className="font-display text-2xl font-medium text-ink mb-3">No stays found</h1>
              <p className="font-sans text-sm text-ink-secondary mb-8 max-w-[480px] mx-auto">
                No stays match those filters. Try a different combination or clear some filters.
              </p>
              <div className="flex items-center justify-center gap-x-3 flex-wrap">
                {Object.keys(filters).length > 0 && (
                  <button onClick={() => setFilters({})} className="rounded-full border border-line px-5 py-2.5 text-xs font-medium text-ink-secondary hover:bg-card transition-colors cursor-pointer bg-transparent">Clear filters</button>
                )}
                <Link href="/search?where=Lagos" className="rounded-full border border-line px-5 py-2.5 text-xs font-medium text-ink-secondary hover:bg-card transition-colors no-underline">Browse Lagos</Link>
                <Link href="/search?where=Abuja" className="rounded-full border border-line px-5 py-2.5 text-xs font-medium text-ink-secondary hover:bg-card transition-colors no-underline">Browse Abuja</Link>
                <Link href="/search" className="rounded-[var(--radius-sm)] bg-brass px-5 py-2.5 text-xs font-semibold text-bone hover:bg-brass-dark transition-colors no-underline">Clear search</Link>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <h1 className="font-display text-2xl font-medium text-ink mb-3">Browse stays</h1>
              <p className="font-sans text-sm text-ink-secondary">Select a city to get started.</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[clamp(1.6rem,2.5vw,2rem)] font-medium text-ink mb-1">
                {filtered.length} {filtered.length === 1 ? "stay" : "stays"} in {displayWhere}
              </h1>
              <p className="font-sans text-sm text-mute mb-8">Every apartment inspected in person. Instant booking — no host approval needed.</p>
              <div className="grid grid-cols-3 gap-7 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-10">
                {filtered.map((p) => (
                  <PropertyCard key={p.id} p={p} currency={displayCurrency} />
                ))}
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
      className="block no-underline text-inherit group"
    >
      <div className="mb-4 overflow-hidden relative aspect-[4/3]">
        <img src={p.cover_photo_url ?? undefined} alt={p.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
      </div>
      <p className="font-display italic text-base text-green-soft mb-1">{p.neighbourhood}</p>
      <h2 className="font-display text-[clamp(18px,1.6vw,24px)] font-medium text-ink leading-tight mb-1">{p.name}</h2>
      <p className="font-sans text-sm text-mute mb-2">{p.city}, Nigeria</p>
      <div className="flex items-center gap-2 font-sans text-[13px] text-ink-secondary flex-wrap">
        <span>{p.bedrooms} bed{p.bedrooms > 1 ? "s" : ""}</span><span>&middot;</span>
        <span>{p.sleeps} guest{p.sleeps > 1 ? "s" : ""}</span>
      </div>
      <div className="flex items-center gap-2 mt-2 font-sans text-[13px]">
        <span className="text-trustpilot">★★★★★</span>
        <span className="text-ink-secondary">4.8</span>
        <span>&middot;</span>
        <span className="text-[11px] font-semibold text-green-soft uppercase tracking-[0.06em]">&#10003; Verified</span>
      </div>
      <div className="mt-2 font-sans font-semibold text-ink">
        {formatMinor(displayMinor, currency)} <span className="font-normal text-ink-secondary">/ night</span>
      </div>
      {p.amenities && p.amenities.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {p.amenities.slice(0, 3).map((a) => (
            <span key={a} className="text-[11px] text-mute bg-soft px-2 py-0.5 rounded-full">{a}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
