"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface LocationData {
  cities: string[];
  neighbourhoods: string[];
}

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [where, setWhere] = useState(searchParams.get("where") ?? "");
  const [checkIn, setCheckIn] = useState(searchParams.get("in") ?? "");
  const [checkOut, setCheckOut] = useState(searchParams.get("out") ?? "");
  const [guests, setGuests] = useState(searchParams.get("guests") || "1");
  const [locations, setLocations] = useState<LocationData>({ cities: [], neighbourhoods: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 14);
  const minDateStr = minDate.toISOString().split("T")[0];

  const suggestions = where.length > 0
    ? [
        ...locations.cities.filter((c) => c.toLowerCase().includes(where.toLowerCase())),
        ...locations.neighbourhoods.filter((n) => n.toLowerCase().includes(where.toLowerCase())),
      ]
    : locations.cities;

  function search() {
    const params = new URLSearchParams();
    if (where.trim()) params.set("where", where.trim());
    if (checkIn) params.set("in", checkIn);
    if (checkOut) params.set("out", checkOut);
    if (guests && guests !== "1") params.set("guests", guests);
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      search();
    }
  }

  return (
    <div ref={ref} className="flex items-stretch bg-white/95 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.18)] rounded-sm max-sm:flex-col max-sm:divide-y max-sm:divide-hairline">
      {/* Destination */}
      <div className="relative flex flex-1 items-center gap-3 px-5 py-3.5 min-w-0">
        <svg className="w-[18px] h-[18px] text-ink-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <div className="text-left min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">Destination</div>
          <input
            type="text"
            placeholder="Where to?"
            value={where}
            onChange={(e) => { setWhere(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="w-full border-none outline-none bg-transparent text-[15px] font-medium text-ink placeholder:text-ink-tertiary/50 font-sans p-0 m-0"
          />
        </div>
        {where && (
          <button
            onClick={() => setWhere("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-ink-tertiary/10 text-ink-tertiary text-xs border-none cursor-pointer hover:bg-ink-tertiary/20 transition-colors"
            aria-label="Clear destination"
          >
            ✕
          </button>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-[var(--radius-md)] border border-line shadow-lg z-40 py-1 max-h-[200px] overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setWhere(s); setShowSuggestions(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-ink hover:bg-soft cursor-pointer border-none bg-transparent transition-colors font-sans"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px bg-hairline max-sm:hidden" />

      {/* Dates */}
      <div className="flex flex-1 items-center gap-3 px-5 py-3.5 min-w-0">
        <svg className="w-[18px] h-[18px] text-ink-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">Check in</div>
            <input
              ref={checkInRef}
              type="text"
              placeholder="Add date"
              aria-label="Check in date"
              onFocus={(e) => { (e.target as HTMLInputElement).type = "date"; }}
              onBlur={(e) => { if (!e.target.value) (e.target as HTMLInputElement).type = "text"; }}
              min={minDateStr}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full border-none outline-none bg-transparent text-[15px] font-medium text-ink placeholder:text-ink-tertiary/50 font-sans p-0 m-0 cursor-pointer"
            />
          </div>
          <span className="text-ink-tertiary/30 shrink-0 mt-5">—</span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">Check out</div>
            <input
              ref={checkOutRef}
              type="text"
              placeholder="Add date"
              aria-label="Check out date"
              onFocus={(e) => { (e.target as HTMLInputElement).type = "date"; }}
              onBlur={(e) => { if (!e.target.value) (e.target as HTMLInputElement).type = "text"; }}
              min={checkIn || minDateStr}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full border-none outline-none bg-transparent text-[15px] font-medium text-ink placeholder:text-ink-tertiary/50 font-sans p-0 m-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="w-px bg-hairline max-sm:hidden" />

      {/* Guests */}
      <div className="flex flex-1 items-center gap-3 px-5 py-3.5 min-w-0 max-w-[160px]">
        <svg className="w-[18px] h-[18px] text-ink-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">Guests</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGuests((g) => String(Math.max(1, parseInt(g || "1") - 1)))}
              className="w-6 h-6 flex items-center justify-center rounded-full border border-hairline text-ink-tertiary text-sm bg-transparent cursor-pointer hover:border-ink-tertiary hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={parseInt(guests || "1") <= 1}
              aria-label="Decrease guests"
            >
              −
            </button>
            <span className="text-[15px] font-medium text-ink font-sans min-w-[20px] text-center tabular-nums">{guests}</span>
            <button
              onClick={() => setGuests((g) => String(Math.min(16, parseInt(g || "1") + 1)))}
              className="w-6 h-6 flex items-center justify-center rounded-full border border-hairline text-ink-tertiary text-sm bg-transparent cursor-pointer hover:border-ink-tertiary hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={parseInt(guests || "1") >= 16}
              aria-label="Increase guests"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Search button */}
      <button
        onClick={search}
        className="flex items-center gap-2 px-8 py-4 bg-brass text-bone font-sans text-[15px] font-semibold border-none cursor-pointer whitespace-nowrap transition-colors hover:bg-brass-dark max-sm:w-full max-sm:justify-center"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        Search
      </button>
    </div>
  );
}
