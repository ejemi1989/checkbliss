"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ADVANCE_DAYS = 14;
const MIN_NIGHTS = 2;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function HeroSearch() {
  const router = useRouter();
  const [dest, setDest] = useState("");
  const [guests, setGuests] = useState("1");
  const [calOpen, setCalOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + ADVANCE_DAYS);
  minDate.setHours(0, 0, 0, 0);

  function daysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }

  function formatDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function isBlocked(d: Date) {
    return d < minDate;
  }

  function handleDayClick(d: Date) {
    if (isBlocked(d)) return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(d);
      setEndDate(null);
    } else {
      if (d <= startDate) {
        setStartDate(d);
        setEndDate(null);
      } else {
        const nights = Math.round((d.getTime() - startDate.getTime()) / 86400000);
        if (nights < MIN_NIGHTS) return;
        setEndDate(d);
      }
    }
  }

  function isInRange(d: Date) {
    if (!startDate || !endDate) return false;
    return d > startDate && d < endDate;
  }

  function isStart(d: Date) { return startDate && d.getTime() === startDate.getTime(); }
  function isEnd(d: Date) { return endDate && d.getTime() === endDate.getTime(); }

  function handleSearch() {
    if (!dest) return;
    const params = new URLSearchParams();
    params.set("where", dest);
    if (startDate && endDate) {
      params.set("in", formatDate(startDate));
      params.set("out", formatDate(endDate));
    }
    params.set("guests", guests);
    router.push(`/search?${params.toString()}`);
    setCalOpen(false);
  }

  const displayLabel = startDate && endDate
    ? `${startDate.getDate()} ${MONTHS[startDate.getMonth()].slice(0, 3)} – ${endDate.getDate()} ${MONTHS[endDate.getMonth()].slice(0, 3)}`
    : "Add dates";

  return (
    <div className="search" style={{ display: "flex", alignItems: "stretch", background: "var(--card)", maxWidth: 780, width: "100%", boxShadow: "var(--sh4)", margin: "0 auto" }}>
      <div className="field" style={{ flex: 1, padding: "12px 20px", borderRight: "1px solid var(--line)" }}>
        <select
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          className="field-select"
          style={{ appearance: "none", background: "var(--card)", border: "none", fontSize: 14, color: dest ? "var(--ink)" : "var(--mute)", cursor: "pointer", width: "100%", outline: "none" }}
        >
          <option value="">Where — destinations</option>
          <option value="Lagos">Lagos</option>
          <option value="Abuja">Abuja</option>
          <option value="Victoria Island">Victoria Island</option>
          <option value="Ikoyi">Ikoyi</option>
          <option value="Lekki">Lekki</option>
          <option value="Maitama">Maitama</option>
          <option value="Asokoro">Asokoro</option>
        </select>
      </div>

      <div className="field field-dates" style={{ flex: 1, padding: "12px 20px", borderRight: "1px solid var(--line)", position: "relative" }}>
        <button
          type="button"
          onClick={() => setCalOpen(!calOpen)}
          className="field-dates-btn"
          style={{ background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontSize: 14, color: startDate ? "var(--ink)" : "var(--mute)", padding: 0 }}
          data-active={startDate ? "true" : undefined}
        >
          {displayLabel}
        </button>

        {calOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 8999 }} onClick={() => setCalOpen(false)} />
            <div className="cal-panel" style={{
              position: "absolute", top: "100%", left: 0, marginTop: 8, zIndex: 9000,
              background: "var(--card)", borderRadius: 4, boxShadow: "0 8px 40px rgba(23,25,21,.14)",
              padding: 24, minWidth: 600
            }}>
              <div className="cal-months" style={{ display: "flex", gap: 32 }}>
                {[0, 1].map((offset) => {
                  const d = new Date(viewDate);
                  d.setMonth(d.getMonth() + offset);
                  const y = d.getFullYear();
                  const m = d.getMonth();
                  const dim = daysInMonth(y, m);
                  const firstDow = new Date(y, m, 1).getDay();

                  return (
                    <div key={offset} style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 12, textAlign: "center" }}>
                        {MONTHS[m]} {y}
                      </div>
                      <div className="cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 36px)", gap: 2 }}>
                        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((dow) => (
                          <div key={dow} style={{ fontSize: 10, color: "var(--mute)", textAlign: "center", padding: "4px 0" }}>{dow}</div>
                        ))}
                        {Array.from({ length: (firstDow + 6) % 7 }, (_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: dim }, (_, i) => {
                          const day = i + 1;
                          const date = new Date(y, m, day);
                          const blocked = isBlocked(date);
                          const range = isInRange(date);
                          const start = isStart(date);
                          const end = isEnd(date);
                          const hov = hoverDate && startDate && !endDate && date > startDate && date <= hoverDate;

                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={blocked}
                              onClick={() => handleDayClick(date)}
                              onMouseEnter={() => startDate && !endDate && setHoverDate(date)}
                              style={{
                                height: 36, width: 36, border: "none", cursor: blocked ? "not-allowed" : "pointer",
                                borderRadius: 0,
                                background: start || end ? "var(--green)" : range || hov ? "rgba(47,61,44,.08)" : "transparent",
                                color: start || end ? "var(--card)" : blocked ? "var(--line)" : "var(--ink)",
                                fontSize: 13, fontWeight: range || hov ? 600 : 400,
                                textDecoration: blocked ? "line-through" : "none",
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => { setStartDate(null); setEndDate(null); }}
                  style={{ fontSize: 12, color: "var(--mute)", background: "none", border: "none", cursor: "pointer" }}
                >
                  Clear dates
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  style={{
                    padding: "8px 24px", background: "var(--green)", color: "var(--card)",
                    border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Search
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="field" style={{ flex: 1, padding: "12px 20px", borderRight: "1px solid var(--line)" }}>
        <select
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          style={{ appearance: "none", background: "var(--card)", border: "none", fontSize: 14, color: guests !== "1" ? "var(--ink)" : "var(--mute)", cursor: "pointer", width: "100%", outline: "none" }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1} guest{i > 0 ? "s" : ""}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleSearch}
        className="search-btn"
        style={{
          background: "var(--green)", color: "var(--card)", border: "none",
          padding: "0 34px", cursor: "pointer", margin: 3,
          fontSize: 14, fontWeight: 600
        }}
      >
        Search
      </button>
    </div>
  );
}
