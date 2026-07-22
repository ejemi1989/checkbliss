"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface HeroSearchProps {
  advanceDays?: number;
  minNights?: number;
}

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function HeroSearch({ advanceDays = 14, minNights = 2 }: HeroSearchProps) {
  const router = useRouter();
  const [dest, setDest] = useState("");
  const [guests, setGuests] = useState("1");
  const [calOpen, setCalOpen] = useState(false);
  const [calTarget, setCalTarget] = useState<"in" | "out">("in");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + advanceDays);
  minDate.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (errorMsg) {
      if (errTimer.current) clearTimeout(errTimer.current);
      errTimer.current = setTimeout(() => setErrorMsg(null), 3000);
    }
    return () => { if (errTimer.current) clearTimeout(errTimer.current); };
  }, [errorMsg]);

  useEffect(() => {
    if (calOpen || mobileOpen) {
      if (window.innerWidth < 640) document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [calOpen, mobileOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCalOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function daysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }
  function firstDayOffset(y: number, m: number) {
    return (new Date(y, m, 1).getDay() + 6) % 7;
  }
  function sameDay(a: Date | null, b: Date | null) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function fmtDateISO(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function fmtShort(d: Date | null) {
    if (!d) return "";
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtMonthYear(y: number, m: number) {
    return new Date(y, m, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
  }
  function shiftMonth(y: number, m: number, delta: number) {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }
  function isBlocked(d: Date) {
    return d < minDate;
  }
  function nightsCount() {
    if (!checkIn || !checkOut) return 0;
    return Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
  }

  function openCal(target: "in" | "out") {
    setCalTarget(target);
    if (target === "in" && checkIn) {
      setViewDate(new Date(checkIn.getFullYear(), checkIn.getMonth(), 1));
    } else if (target === "out" && checkOut) {
      setViewDate(new Date(checkOut.getFullYear(), checkOut.getMonth(), 1));
    } else {
      const m = new Date(minDate);
      setViewDate(new Date(m.getFullYear(), m.getMonth(), 1));
    }
    setCalOpen(true);
  }

  function handleDayClick(d: Date) {
    if (isBlocked(d)) return;

    if (calTarget === "in") {
      setCheckIn(d);
      if (checkOut && d >= checkOut) {
        setCheckOut(null);
      }
      setCalOpen(false);
    } else {
      if (checkIn && d <= checkIn) {
        setCheckIn(d);
        setCheckOut(null);
      } else {
        const nights = Math.round((d.getTime() - (checkIn || d).getTime()) / 86400000);
        if (!checkIn) {
          setCheckIn(d);
          setCalOpen(false);
          return;
        }
        if (nights < minNights) {
          setErrorMsg(`Minimum stay is ${minNights} nights`);
          return;
        }
        setCheckOut(d);
        setCalOpen(false);
      }
    }
  }

  function canGoPrev() {
    const prev = shiftMonth(viewDate.getFullYear(), viewDate.getMonth(), -1);
    const prevFirst = new Date(prev.y, prev.m, 1);
    const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    return prevFirst >= minMonth;
  }

  function goPrev() {
    if (!canGoPrev()) return;
    const prev = shiftMonth(viewDate.getFullYear(), viewDate.getMonth(), -1);
    setViewDate(new Date(prev.y, prev.m, 1));
  }

  function goNext() {
    const next = shiftMonth(viewDate.getFullYear(), viewDate.getMonth(), 1);
    setViewDate(new Date(next.y, next.m, 1));
  }

  function clearDates() {
    setCheckIn(null);
    setCheckOut(null);
    setHoverDate(null);
    setErrorMsg(null);
  }

  function handleSearch() {
    if (!dest) return;
    const params = new URLSearchParams();
    params.set("where", dest);
    if (checkIn && checkOut) {
      params.set("in", fmtDateISO(checkIn));
      params.set("out", fmtDateISO(checkOut));
    }
    params.set("guests", guests);
    setCalOpen(false);
    setMobileOpen(false);
    router.push(`/search?${params.toString()}`);
  }

  function renderMonth(y: number, m: number) {
    const dim = daysInMonth(y, m);
    const offset = firstDayOffset(y, m);

    return (
      <div key={`${y}-${m}`} style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink)", textAlign: "center", marginBottom: 12, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {fmtMonthYear(y, m)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 36px)", marginBottom: 4 }}>
          {DOW.map((d) => (
            <span key={d} style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 600, textAlign: "center", padding: "4px 0" }}>{d}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 36px)", gap: 2 }}>
          {Array.from({ length: offset }, (_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: dim }, (_, i) => {
            const day = i + 1;
            const date = new Date(y, m, day);
            const blocked = isBlocked(date);
            const isStart = sameDay(checkIn, date);
            const isEnd = sameDay(checkOut, date);
            const rangeEnd = checkOut || hoverDate;
            let isRange = false;
            if (checkIn && rangeEnd) {
              const lo = checkIn <= rangeEnd ? checkIn : rangeEnd;
              const hi = checkIn <= rangeEnd ? rangeEnd : checkIn;
              isRange = date > lo && date < hi;
            }

            let bg = "transparent";
            let color = "var(--ink)";
            let border = "1px solid transparent";
            let cursor = "pointer";
            let textDecoration: string | undefined;

            if (blocked) {
              color = "var(--line)";
              cursor = "not-allowed";
              textDecoration = "line-through";
            } else if (isStart && !checkOut) {
              bg = "var(--green)";
              color = "#fff";
              border = "1px solid var(--green)";
            } else if (isStart || isEnd) {
              bg = "var(--green)";
              color = "#fff";
              border = "1px solid var(--green)";
            } else if (isRange) {
              bg = "rgba(47,61,44,.08)";
            }

            return (
              <div
                key={day}
                onClick={(e) => { e.stopPropagation(); handleDayClick(date); }}
                onMouseEnter={() => { if (checkIn && !checkOut && !blocked) setHoverDate(date); }}
                style={{
                  height: 36, width: 36, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 500, color, background: bg, border, borderRadius: 2,
                  cursor, transition: "background 0.15s, color 0.15s", textDecoration,
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function getCheckinLabel() {
    return checkIn ? fmtShort(checkIn) : "Add date";
  }
  function getCheckoutLabel() {
    return checkOut ? fmtShort(checkOut) : "Add date";
  }
  function getGuestsLabel() {
    const n = parseInt(guests);
    return `${n} guest${n > 1 ? "s" : ""}`;
  }

  const calHintText = errorMsg || (!checkIn
    ? "Select check-in date"
    : !checkOut
      ? `Select check-out (min ${minNights} nights)`
      : `${nightsCount()} night${nightsCount() !== 1 ? "s" : ""} selected`);

  return (
    <>
      {/* Desktop search bar */}
      <div className="sb-desktop" style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", background: "var(--card)", borderRadius: "var(--r-3, 6px)", boxShadow: "var(--sh4, 0 4px 20px rgba(0,0,0,.08))", overflow: "hidden" }}>

          {/* Where */}
          <div className="sb-field" style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRight: "1px solid var(--line)", minWidth: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mute)", flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mute)" }}>Where</div>
              <select
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                style={{ appearance: "none", background: "transparent", border: "none", fontSize: 15, fontWeight: 500, color: dest ? "var(--ink)" : "var(--mute)", cursor: "pointer", width: "100%", outline: "none", fontFamily: "inherit", padding: 0 }}
              >
                <option value="">Lagos, Nigeria</option>
                <option value="Lagos">Lagos</option>
                <option value="Abuja">Abuja</option>
                <option value="Victoria Island">Victoria Island</option>
                <option value="Ikoyi">Ikoyi</option>
                <option value="Lekki">Lekki</option>
                <option value="Maitama">Maitama</option>
                <option value="Asokoro">Asokoro</option>
              </select>
            </div>
          </div>

          {/* Check-in */}
          <div
            className="sb-field sb-field--clickable"
            onClick={() => openCal("in")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openCal("in"); }}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRight: "1px solid var(--line)", cursor: "pointer", minWidth: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mute)", flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mute)" }}>Check-in</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: checkIn ? "var(--ink)" : "var(--mute)" }}>{getCheckinLabel()}</div>
            </div>
          </div>

          {/* Check-out */}
          <div
            className="sb-field sb-field--clickable"
            onClick={() => openCal("out")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openCal("out"); }}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRight: "1px solid var(--line)", cursor: "pointer", minWidth: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mute)", flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mute)" }}>Check-out</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: checkOut ? "var(--ink)" : "var(--mute)" }}>{getCheckoutLabel()}</div>
            </div>
          </div>

          {/* Guests */}
          <div className="sb-field" style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", minWidth: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mute)", flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mute)" }}>Guests</div>
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                style={{ appearance: "none", background: "transparent", border: "none", fontSize: 15, fontWeight: 500, color: "var(--ink)", cursor: "pointer", width: "100%", outline: "none", fontFamily: "inherit", padding: 0 }}
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} guest{i > 0 ? "s" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search button */}
          <button
            type="button"
            onClick={handleSearch}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "16px 34px", background: "var(--green)", color: "#F4F6F0",
              border: "none", borderRadius: 0, fontSize: 15, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--green-d, #2a3828)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--green)"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            Search
          </button>
        </div>

        {/* Desktop calendar popover */}
        {calOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 8999 }} onClick={() => setCalOpen(false)} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Select dates"
              style={{
                position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                marginTop: 8, zIndex: 9000, background: "var(--card)",
                borderRadius: "var(--r-3, 6px)", boxShadow: "0 8px 40px rgba(23,25,21,.14)",
                border: "1px solid var(--line)", padding: 24, minWidth: 560,
                display: "flex", flexDirection: "column",
              }}
            >
              {/* Nav + months */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!canGoPrev()}
                  aria-label="Previous month"
                  style={{
                    background: "transparent", border: "1px solid var(--line)", borderRadius: 2,
                    width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: canGoPrev() ? "pointer" : "default",
                    color: canGoPrev() ? "var(--ink)" : "var(--line)", alignSelf: "center",
                    opacity: canGoPrev() ? 1 : 0.35,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>

                <div style={{ display: "flex", gap: 32, flex: 1, justifyContent: "center" }}>
                  {[0, 1].map((offset) => {
                    const d = new Date(viewDate);
                    d.setMonth(d.getMonth() + offset);
                    return renderMonth(d.getFullYear(), d.getMonth());
                  })}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next month"
                  style={{
                    background: "transparent", border: "1px solid var(--line)", borderRadius: 2,
                    width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer", color: "var(--ink)", alignSelf: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, marginTop: 16, borderTop: "1px solid var(--line)", gap: 12 }}>
                <span style={{ fontFamily: "inherit", fontSize: 13, color: errorMsg ? "#c0392b" : "var(--mute)", flex: 1, fontWeight: errorMsg ? 500 : 400 }}>
                  {calHintText}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {(checkIn || checkOut) && (
                    <button
                      type="button"
                      onClick={clearDates}
                      style={{
                        background: "transparent", border: "1px solid var(--line)", borderRadius: 2,
                        fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--mute)",
                        padding: "7px 16px", cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  )}
                  {checkIn && checkOut && (
                    <button
                      type="button"
                      onClick={() => setCalOpen(false)}
                      style={{
                        background: "var(--green)", color: "var(--soft, #F4F6F0)", border: "none", borderRadius: 2,
                        fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "7px 20px",
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      {/* Mobile search trigger */}
      <div className="sb-mobile sm:hidden" style={{ padding: "0 16px", marginTop: -20, zIndex: 50, position: "relative" }}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          style={{
            maxWidth: 480, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", gap: 12,
            background: "var(--card)", borderRadius: "var(--r-3, 6px)", boxShadow: "var(--sh4, 0 4px 20px rgba(0,0,0,.08))",
            padding: "14px 20px", border: "1px solid var(--line)", cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mute)" }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mute)" }}>Where</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: dest ? "var(--ink)" : "var(--mute)" }}>{dest || "Lagos, Nigeria"}</div>
          </div>
          <div style={{ width: 1, height: 32, background: "var(--line)" }} />
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mute)" }}>Dates</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: checkIn ? "var(--ink)" : "var(--mute)" }}>
              {checkIn && checkOut ? `${fmtShort(checkIn)} – ${fmtShort(checkOut)}` : "Add dates"}
            </div>
          </div>
        </button>
      </div>

      {/* Mobile full-screen overlay */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "var(--card)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "0.01em" }}>Select dates</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close"
              style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "20px 16px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
            {[0, 1].map((offset) => {
              const d = new Date(viewDate);
              d.setMonth(d.getMonth() + offset);
              return renderMonth(d.getFullYear(), d.getMonth());
            })}
          </div>

          <div style={{ flexShrink: 0, padding: "16px 20px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "inherit", fontSize: 13, color: errorMsg ? "#c0392b" : "var(--mute)", flex: 1, fontWeight: errorMsg ? 500 : 400 }}>
              {calHintText}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {(checkIn || checkOut) && (
                <button type="button" onClick={clearDates} style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 2, fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--mute)", padding: "7px 16px", cursor: "pointer" }}>Clear</button>
              )}
              {checkIn && checkOut && (
                <button type="button" onClick={() => { setMobileOpen(false); handleSearch(); }} style={{ background: "var(--green)", color: "var(--soft, #F4F6F0)", border: "none", borderRadius: 2, fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "7px 20px", cursor: "pointer" }}>Search</button>
              )}
            </div>
          </div>

          {/* Mobile nav arrows */}
          <div style={{ position: "absolute", top: 56, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 8px", pointerEvents: "none" }}>
            <button type="button" onClick={goPrev} disabled={!canGoPrev()} style={{ pointerEvents: "auto", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 2, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: canGoPrev() ? "pointer" : "default", opacity: canGoPrev() ? 1 : 0.35 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button type="button" onClick={goNext} style={{ pointerEvents: "auto", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 2, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .sb-field--clickable:hover { background: rgba(47,61,44,.03); }
        @media (max-width: 639px) {
          .sb-desktop { display: none !important; }
        }
        @media (min-width: 640px) {
          .sb-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
