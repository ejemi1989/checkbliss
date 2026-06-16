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
  const [locations, setLocations] = useState<LocationData>({ cities: [], neighbourhoods: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    router.push(params.toString() ? `/?${params.toString()}` : "/");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      search();
    }
  }

  return (
    <div ref={ref} className="flex w-full max-w-[680px] items-center rounded-full bg-white shadow-lg shadow-black/10 max-sm:flex-col max-sm:rounded-2xl max-sm:gap-0 max-sm:overflow-hidden">
      {/* Where */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-3.5 rounded-l-full transition-colors hover:bg-bone/30">
        <span className="text-[10px] font-semibold uppercase tracking-[1px] text-ink-secondary">Where</span>
        <input
          type="text"
          placeholder="Destinations or neighbourhoods"
          value={where}
          onChange={(e) => { setWhere(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="w-full border-none outline-none bg-transparent text-sm font-medium text-ink placeholder:text-ink-secondary/50 font-sans p-0 m-0"
        />

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-hairline shadow-lg z-40 py-1 max-h-[200px] overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setWhere(s); setShowSuggestions(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-ink hover:bg-primary-bg cursor-pointer border-none bg-transparent transition-colors font-sans"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-10 w-px bg-hairline" />

      {/* Check in */}
      <div className="relative flex flex-col justify-center px-6 py-3.5 cursor-pointer transition-colors hover:bg-bone/30" onClick={() => (document.querySelector('input[aria-label="Check in"]') as HTMLInputElement)?.showPicker?.()}>
        <span className="text-[10px] font-semibold uppercase tracking-[1px] text-ink-secondary">Check in</span>
        <input
          type="date"
          aria-label="Check in"
          min={minDateStr}
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className={`w-[130px] border-none outline-none bg-transparent text-sm font-sans p-0 m-0 cursor-pointer ${checkIn ? "font-medium text-ink" : "text-ink-secondary/50"}`}
          style={{ colorScheme: "normal" }}
        />
      </div>

      <div className="h-10 w-px bg-hairline" />

      {/* Check out */}
      <div className="relative flex flex-col justify-center px-6 py-3.5 cursor-pointer transition-colors hover:bg-bone/30" onClick={() => (document.querySelector('input[aria-label="Check out"]') as HTMLInputElement)?.showPicker?.()}>
        <span className="text-[10px] font-semibold uppercase tracking-[1px] text-ink-secondary">Check out</span>
        <input
          type="date"
          aria-label="Check out"
          min={checkIn || minDateStr}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className={`w-[130px] border-none outline-none bg-transparent text-sm font-sans p-0 m-0 cursor-pointer ${checkOut ? "font-medium text-ink" : "text-ink-secondary/50"}`}
          style={{ colorScheme: "normal" }}
        />
      </div>

      {/* Search button */}
      <button
        onClick={search}
        className="mr-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brass text-white transition-all hover:bg-brass-dark hover:scale-105 cursor-pointer border-none"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    </div>
  );
}
