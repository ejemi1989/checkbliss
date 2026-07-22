"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface HeroSearchProps {
  advanceDays?: number;
  minNights?: number;
}

const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function HeroSearch({ advanceDays = 14, minNights = 2 }: HeroSearchProps) {
  const router = useRouter();
  const [dest, setDest] = useState("");
  const [guests, setGuests] = useState("1");
  const [calOpen, setCalOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + advanceDays);
  minDate.setHours(0, 0, 0, 0);

  // ── Error flash timer ──
  useEffect(() => {
    if (errorMsg) {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setErrorMsg(null), 3000);
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [errorMsg]);

  // ── Lock body scroll on mobile when calendar open ──
  useEffect(() => {
    if (calOpen && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [calOpen]);

  // ── Escape key ──
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.key === "Escape" || e.key === "Esc") && calOpen) {
        setCalOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [calOpen]);

  function daysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }

  function firstDayOffset(y: number, m: number) {
    return (new Date(y, m, 1).getDay() + 6) % 7;
  }

  function sameDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function formatDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function fmtShort(dt: Date | null) {
    if (!dt) return "";
    return dt.toLocaleString("en-GB", { day: "numeric", month: "short" });
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

  function isStart(d: Date) { return sameDay(startDate, d); }
  function isEnd(d: Date) { return sameDay(endDate, d); }

  function nightsCount(): number {
    if (!startDate || !endDate) return 0;
    return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  }

  // ── Hint text ──
  const hintText = errorMsg || (!startDate
    ? "Select check-in date"
    : !endDate
      ? `Select check-out (min ${minNights} nights)`
      : `${nightsCount()} night${nightsCount() !== 1 ? "s" : ""}`);

  const hintIsError = !!errorMsg;
  const showClear = !!(startDate || endDate);
  const canApply = !!(startDate && endDate);

  // ── Month navigation ──
  const canGoPrev = useCallback(() => {
    const prev = shiftMonth(viewDate.getFullYear(), viewDate.getMonth(), -1);
    const prevFirst = new Date(prev.y, prev.m, 1);
    const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    return prevFirst >= minMonth;
  }, [viewDate, minDate]);

  function goPrev() {
    if (!canGoPrev()) return;
    const prev = shiftMonth(viewDate.getFullYear(), viewDate.getMonth(), -1);
    setViewDate(new Date(prev.y, prev.m, 1));
  }

  function goNext() {
    const next = shiftMonth(viewDate.getFullYear(), viewDate.getMonth(), 1);
    setViewDate(new Date(next.y, next.m, 1));
  }

  function handleDayClick(d: Date) {
    if (isBlocked(d)) return;

    // Start a new selection if: nothing selected, range already complete, or clicked before start
    if (!startDate || endDate || d < startDate) {
      setStartDate(d);
      setEndDate(null);
      setHoverDate(null);
      return;
    }

    const nights = Math.round((d.getTime() - startDate.getTime()) / 86400000);
    if (nights < minNights) {
      setErrorMsg(`Minimum stay is ${minNights} nights`);
      return;
    }

    setEndDate(d);
    setHoverDate(null);
  }

  function handleDayHover(d: Date) {
    if (!startDate || endDate) return;
    if (sameDay(d, hoverDate)) return;
    setHoverDate(d);
  }

  function handleMonthsMouseLeave() {
    if (!startDate || endDate || !hoverDate) return;
    setHoverDate(null);
  }

  function getDayCellClass(d: Date): string {
    const blocked = isBlocked(d);
    const start = isStart(d);
    const e = isEnd(d);
    const rangeEnd = endDate || hoverDate;
    let isRange = false;
    if (startDate && rangeEnd) {
      const lo = startDate <= rangeEnd ? startDate : rangeEnd;
      const hi = startDate <= rangeEnd ? rangeEnd : startDate;
      isRange = d > lo && d < hi;
    }
    const sel = start && !endDate;

    if (blocked) return "cal-day cal-day--blocked";
    if (sel) return "cal-day cal-day--sel";
    if (start || e) return `cal-day cal-day--${start ? "start" : "end"}`;
    if (isRange) return "cal-day cal-day--range";
    return "cal-day";
  }

  // ── Dates button label ──
  const displayLabel = startDate && endDate
    ? `${fmtShort(startDate)} – ${fmtShort(endDate)}`
    : "Add dates";

  function handleApply() {
    if (!canApply) return;
    setCalOpen(false);
  }

  function handleClear() {
    setStartDate(null);
    setEndDate(null);
    setHoverDate(null);
    setErrorMsg(null);
  }

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

  function openPanel() {
    if (!startDate) {
      const min = new Date(minDate);
      setViewDate(new Date(min.getFullYear(), min.getMonth(), 1));
    }
    setCalOpen(true);
  }

  function renderMonth(y: number, m: number) {
    const dim = daysInMonth(y, m);
    const offset = firstDayOffset(y, m);

    return (
      <div className="cal-month" key={`${y}-${m}`}>
        <div className="cal-month-head">{fmtMonthYear(y, m)}</div>
        <div className="cal-dow">
          {DOW_LABELS.map((lbl) => (
            <span key={lbl}>{lbl}</span>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: offset }, (_, i) => (
            <div key={`e${i}`} className="cal-day cal-day--empty" />
          ))}
          {Array.from({ length: dim }, (_, i) => {
            const day = i + 1;
            const date = new Date(y, m, day);
            const blocked = isBlocked(date);

            return (
              <div
                key={day}
                className={getDayCellClass(date)}
                data-ts={blocked ? undefined : date.getTime().toString()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDayClick(date);
                }}
                onMouseEnter={() => handleDayHover(date)}
                style={blocked ? { color: "var(--line)", cursor: "not-allowed", textDecoration: "line-through" } : undefined}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="search" style={{ display: "flex", alignItems: "stretch", background: "var(--card)", maxWidth: 780, width: "100%", boxShadow: "var(--sh4)", margin: "0 auto" }}>
      <div className="field" style={{ flex: 1, padding: "8px 20px", borderRight: "1px solid var(--line)" }}>
        <select
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          className={`field-select${dest ? " has-value" : ""}`}
          style={{ appearance: "none", background: "var(--card)", border: "none", fontSize: 14, color: dest ? "var(--ink)" : "var(--mute)", cursor: "pointer", width: "100%", outline: "none" }}
        >
          <option value="">Where to?</option>
          <option value="Lagos">Lagos</option>
          <option value="Abuja">Abuja</option>
          <option value="Victoria Island">Victoria Island</option>
          <option value="Ikoyi">Ikoyi</option>
          <option value="Lekki">Lekki</option>
          <option value="Maitama">Maitama</option>
          <option value="Asokoro">Asokoro</option>
        </select>
      </div>

      <div className="field" style={{ flex: 1, padding: "8px 20px", borderRight: "1px solid var(--line)" }}>
        <button
          type="button"
          onClick={() => calOpen ? setCalOpen(false) : openPanel()}
          className="field-dates-btn"
          data-active={startDate && endDate ? "true" : undefined}
          aria-expanded={calOpen}
          aria-haspopup="true"
          style={{
            background: "transparent", border: "none", cursor: "pointer", width: "100%",
            textAlign: "left", fontSize: 14, fontWeight: 500, fontFamily: "inherit",
            color: startDate && endDate ? "var(--green)" : startDate ? "var(--ink)" : "var(--mute)",
            padding: 0, lineHeight: 1.5,
          }}
        >
          {displayLabel}
        </button>
      </div>

      {/* ── Calendar Panel ── */}
      {calOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 8999 }}
            onClick={() => setCalOpen(false)}
          />
          <div
            ref={panelRef}
            className="cal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Select dates"
            style={{
              position: window.innerWidth < 640 ? "fixed" : "absolute",
              top: window.innerWidth < 640 ? 0 : "100%",
              left: window.innerWidth < 640 ? 0 : 0,
              right: window.innerWidth < 640 ? 0 : undefined,
              bottom: window.innerWidth < 640 ? 0 : undefined,
              marginTop: window.innerWidth < 640 ? 0 : 8,
              zIndex: 9000,
              background: "var(--card)",
              borderRadius: window.innerWidth < 640 ? 0 : 4,
              boxShadow: window.innerWidth < 640 ? "none" : "0 8px 40px rgba(23,25,21,.14)",
              border: window.innerWidth < 640 ? "none" : "1px solid var(--line)",
              padding: window.innerWidth < 640 ? 0 : 24,
              minWidth: window.innerWidth < 640 ? "auto" : 600,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Mobile header */}
            <div className="cal-mobile-head" style={{ display: "none" }}>
              <span className="cal-mobile-title">Select dates</span>
              <button
                type="button"
                className="cal-close"
                aria-label="Close"
                onClick={() => setCalOpen(false)}
                style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Navigation + months */}
            <div className="cal-top" style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
              <button
                type="button"
                className="cal-nav cal-nav--prev"
                aria-label="Previous month"
                onClick={goPrev}
                disabled={!canGoPrev()}
                style={{
                  background: "transparent", border: "1px solid var(--line)", borderRadius: 2,
                  width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: canGoPrev() ? "pointer" : "default",
                  color: canGoPrev() ? "var(--ink)" : "var(--line)", alignSelf: "center",
                  opacity: canGoPrev() ? 1 : 0.35,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              <div
                className="cal-months"
                onMouseLeave={handleMonthsMouseLeave}
                style={{ display: "flex", gap: 32, flex: 1 }}
              >
                {[0, 1].map((offset) => {
                  const d = new Date(viewDate);
                  d.setMonth(d.getMonth() + offset);
                  return renderMonth(d.getFullYear(), d.getMonth());
                })}
              </div>

              <button
                type="button"
                className="cal-nav cal-nav--next"
                aria-label="Next month"
                onClick={goNext}
                style={{
                  background: "transparent", border: "1px solid var(--line)", borderRadius: 2,
                  width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", color: "var(--ink)", alignSelf: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* Footer: hint + actions */}
            <div className="cal-foot" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              paddingTop: 16, marginTop: 16, borderTop: "1px solid var(--line)", gap: 12,
            }}>
              <span
                className={`cal-hint${hintIsError ? " cal-hint--error" : ""}`}
                style={{ fontFamily: "inherit", fontSize: 13, color: hintIsError ? "#c0392b" : "var(--mute)", flex: 1, fontWeight: hintIsError ? 500 : 400 }}
              >
                {hintText}
              </span>
              <div className="cal-foot-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <button
                  type="button"
                  className="cal-clear"
                  onClick={handleClear}
                  hidden={!showClear}
                  style={{
                    background: "transparent", border: "1px solid var(--line)", borderRadius: 2,
                    fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--mute)",
                    padding: "7px 16px", cursor: "pointer",
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="cal-apply"
                  onClick={handleApply}
                  disabled={!canApply}
                  style={{
                    background: "var(--green)", color: "var(--soft)", border: "none", borderRadius: 2,
                    fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "7px 20px",
                    cursor: canApply ? "pointer" : "not-allowed", opacity: canApply ? 1 : 0.35, transition: "background .2s",
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Inline style sheet for calendar day states and mobile layout */}
          <style jsx>{`
            .cal-month-head {
              font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
              text-transform: uppercase; color: var(--ink); text-align: center;
              margin-bottom: 12px; height: 32px; display: flex; align-items: center; justify-content: center;
            }
            .cal-dow {
              display: grid; grid-template-columns: repeat(7, 36px); margin-bottom: 4px;
            }
            .cal-dow span {
              font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
              color: var(--mute); font-weight: 600; text-align: center; padding: 4px 0;
            }
            .cal-grid {
              display: grid; grid-template-columns: repeat(7, 36px); gap: 2px;
            }
            .cal-day {
              height: 36px; width: 36px; display: flex; align-items: center; justify-content: center;
              font-size: 13px; font-weight: 500; color: var(--ink); cursor: pointer;
              border-radius: 2px; border: 1px solid transparent;
              transition: background 0.15s, color 0.15s, border-color 0.15s;
            }
            .cal-day--empty { cursor: default; }
            .cal-day--blocked { color: var(--line); cursor: not-allowed; text-decoration: line-through; }
            .cal-day--range { background: rgba(47,61,44,.08); }
            .cal-day--start, .cal-day--end { background: var(--green); color: #fff; border-color: var(--green); }
            .cal-day--sel { background: var(--green); color: #fff; border-color: var(--green); }
            .cal-day:not(.cal-day--blocked):not(.cal-day--empty):not(.cal-day--start):not(.cal-day--end):not(.cal-day--sel):hover {
              border-color: var(--green-soft); background: rgba(47,61,44,.06);
            }
            .cal-day--start:hover, .cal-day--end:hover, .cal-day--sel:hover {
              background: var(--green-d) !important; border-color: var(--green-d) !important; color: #fff !important;
            }
            .cal-nav:hover:not(:disabled) { border-color: var(--green-soft); color: var(--green-soft); }
            .cal-clear:hover { border-color: var(--green-soft); color: var(--green-soft); }
            .cal-apply:hover:not(:disabled) { background: var(--green-d); }
            .cal-close:hover { color: var(--green-soft); }
            .field-dates-btn[data-active="true"] { color: var(--green); }

            @media (max-width: 639px) {
              .cal-panel {
                position: fixed !important; inset: 0 !important; width: 100% !important;
                height: 100% !important; overflow: hidden !important; border-radius: 0 !important;
                border: none !important; box-shadow: none !important; padding: 0 !important;
                display: flex !important; flex-direction: column;
              }
              .cal-mobile-head {
                display: flex !important; align-items: center; justify-content: space-between;
                padding: 16px 20px 14px; border-bottom: 1px solid var(--line); flex-shrink: 0;
              }
              .cal-mobile-title {
                font-size: 15px; font-weight: 600; color: var(--ink); letter-spacing: 0.01em;
              }
              .cal-top { flex: 1; overflow: hidden; padding: 0; gap: 0; }
              .cal-nav { display: none !important; }
              .cal-months {
                flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
                flex-direction: column !important; gap: 32px !important;
                padding: 20px 16px 32px; align-items: center;
              }
              .cal-month { width: max-content; }
              .cal-foot { flex-shrink: 0; padding: 16px 20px; margin-top: 0; }
            }
          `}</style>
        </>
      )}

      <div className="field" style={{ flex: 1, padding: "8px 20px", borderRight: "1px solid var(--line)" }}>
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
