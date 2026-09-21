"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import { formatMinor } from "@/lib/currency";
import { getOwnerBookings, getOwnerPayouts, getCalendarBookings, getOwnerProperties } from "@/lib/data";
import type { OwnerPayout as OwnerPayoutType, OwnerBookingView } from "@/lib/types";
import type { OwnerPropertyView } from "@/lib/data-server";
import { blockDates, unblockDates } from "@/actions/properties";
import { saveOwnerPayoutDetails } from "@/actions/owner-payout-details";
import type { AuthUser } from "@/lib/auth";
import { NotificationsView } from "@/components/notifications-view";
import { Modal } from "@/components/dashboard/modal";
import { getSeedDamageClaims } from "@/lib/seed-data";

/* ---------- icons ---------- */
const I = {
  barChart3: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V6" /><path d="M17 16v-4" /></svg>,
  building2: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  receipt: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  sync: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  chevronLeft: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>,
  chevronRight: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  hamburger: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  logOut: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  helpCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
};

const bookingsFallback: OwnerBookingView[] = getOwnerBookings();
const defaultPayouts = getOwnerPayouts();
const calendarBookingsFallback = getCalendarBookings();
const propertiesFallback: OwnerPropertyView[] = getOwnerProperties();
const damageClaims = getSeedDamageClaims().filter((c) => ["PR001", "PR002"].includes(c.property_id)).slice(0, 4);

function fmt(n: number) { return formatMinor(n); }

function statusColor(s: string) {
  switch (s) {
    case "confirmed": case "checked_in": case "completed": case "paid": return "text-success";
    case "pending": case "pending_payment": case "eligible": case "released": return "text-primary";
    case "cancelled": case "failed": return "text-danger";
    case "refunded": return "text-warning";
    default: return "text-ink-secondary";
  }
}

function payoutStatusLabel(s: string): string {
  switch (s) {
    case "paid": return "Paid";
    case "released": return "Disbursing";
    case "eligible": return "Eligible";
    case "pending": return "Pending";
    case "failed": return "Failed";
    case "refunded": return "Refunded";
    default: return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

type OwnerTab = "home" | "properties" | "bookings" | "claims" | "payouts" | "payout-details" | "calendar" | "notifications";

export interface OwnerPayoutDetailsData {
  nigerianBankName: string | null;
  bankCode: string | null;
  nigerianBankAccountNumber: string | null;
  nigerianBankAccountName: string | null;
  taxIdentificationNumber: string | null;
  fincraBeneficiaryId: string | null;
}

export function OwnerDashboard({
  user,
  initialTab,
  initialPayoutDetails,
  initialPayouts,
  initialBookings,
  initialProperties,
}: {
  user: AuthUser | null;
  initialTab?: OwnerTab;
  initialPayoutDetails?: OwnerPayoutDetailsData | null;
  initialPayouts?: OwnerPayoutType[];
  initialBookings?: OwnerBookingView[];
  initialProperties?: OwnerPropertyView[];
}) {
  const [tab, setTab] = useState<OwnerTab>(initialTab ?? "home");
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [bookingModal, setBookingModal] = useState<OwnerBookingView | null>(null);
  const [claimModal, setClaimModal] = useState<(typeof damageClaims)[0] | null>(null);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [pendingBlock, setPendingBlock] = useState<string | null>(null);

  const notify = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const todayRef = useRef<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const payouts = initialPayouts ?? defaultPayouts;
  const bookings = initialBookings ?? bookingsFallback;
  const properties = initialProperties ?? propertiesFallback;
  useEffect(() => {
    const next = new Date();
    if (!todayRef.current || todayRef.current.getTime() !== next.getTime()) {
      todayRef.current = next;
      setToday(next);
      setMonth(next.getMonth());
      setYear(next.getFullYear());
    }
  }, []);

  useEffect(() => {

  /* Escape key closes modals */
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") { setBookingModal(null); setClaimModal(null); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* calendar logic */
  const calendarBookings = useMemo(() => {
    if (bookings.length > 0) {
      return bookings.map((b) => {
        const dates: string[] = [];
        const start = new Date(`${b.check_in}T00:00:00`);
        const end = new Date(`${b.check_out}T00:00:00`);
        for (let t = new Date(start); t < end; t.setDate(t.getDate() + 1)) {
          dates.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`);
        }
        return { dates, unit: b.unit, guest: b.guest };
      });
    }
    return calendarBookingsFallback;
  }, [bookings]);

  const bookingsByDate: Record<string, (typeof calendarBookings)[0]> = {};
  calendarBookings.forEach((b) => b.dates.forEach((d) => { bookingsByDate[d] = b; }));

  const calendar = useMemo(() => {
    if (month === null || year === null) return [];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isCurrentMonth = !!today && today.getFullYear() === year && today.getMonth() === month;
    const cells: { day: number; isToday: boolean; hasBooking: boolean; bookingInfo?: { unit: string; guest: string } }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: 0, isToday: false, hasBooking: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, isToday: !!today && isCurrentMonth && today.getDate() === d, hasBooking: !!bookingsByDate[dateStr], bookingInfo: bookingsByDate[dateStr] });
    }
    return cells;
  }, [month, year, today]);

  const displayName = user?.role === "owner" ? (user?.name ?? "Adaora Mensah") : "Adaora Mensah";
  const firstName = displayName.split(" ")[0];
  const hour = today?.getHours() ?? -1;
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function monthLabel() { return month === null || year === null ? "" : `${MONTHS[month]} ${year}`; }

  function shiftMonth(delta: number) {
    if (month === null || year === null) return;
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  /* stats */
  const totalRevenue = bookings.reduce((s, b) => s + (b.status === "cancelled" ? 0 : b.amount_minor), 0);
  const activeBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "pending").length;
  const occupancyValues = properties.map((p) => parseInt(p.occ, 10)).filter((n) => !Number.isNaN(n));
  const occupancyPct = occupancyValues.length > 0 ? `${Math.round(occupancyValues.reduce((s, n) => s + n, 0) / occupancyValues.length)}%` : "—";

  return (
    <>
      {/* notification toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      {/* stats — only on dashboard home, editorial grid */}
      {tab === "home" && (
        <div className="mb-12 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-hairline">
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Revenue (MTD)</p>
            <p className="font-display text-[2.25rem] leading-none tracking-tight mt-2 tabular-nums text-primary">{fmt(totalRevenue)}</p>
            <p className="mt-2 text-xs text-success">↑ 12% vs May</p>
          </div>
          <div className="lg:pl-8">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Active Bookings</p>
            <p className="font-display text-[2.25rem] leading-none tracking-tight mt-2 tabular-nums text-ink">{activeBookings}</p>
            <p className="mt-2 text-xs text-ink-secondary">{properties.length} units</p>
          </div>
          <div className="lg:pl-8">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Occupancy</p>
            <p className="font-display text-[2.25rem] leading-none tracking-tight mt-2 tabular-nums text-ink">{occupancyPct}</p>
            <p className="mt-2 text-xs text-ink-secondary">This month</p>
          </div>
          <div className="lg:pl-8">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Next Payout</p>
            <p className="font-display text-[2.25rem] leading-none tracking-tight mt-2 tabular-nums text-primary">{fmt(payouts[0]?.amount_minor ?? 0)}</p>
            <p className="mt-2 text-xs text-ink-secondary">Expected Jul 5</p>
          </div>
        </div>
      )}

          {/* ---------- HOME / DASHBOARD ---------- */}
          {tab === "home" && (
            <div className="space-y-12">
              {/* Editorial page header */}
              <header className="pb-10 mb-10 border-b border-hairline">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Your portfolio</p>
                <h1 className="font-display text-[2.5rem] leading-[1.05] tracking-tight text-ink lg:text-[3.25rem]">{greet}, {firstName}.</h1>
                <p className="mt-4 text-base text-ink-secondary leading-relaxed max-w-[65ch]">Here&rsquo;s how your listings are performing, who&rsquo;s arriving next, and what needs your attention this week.</p>
              </header>

              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
                {/* Upcoming Bookings */}
                <section>
                  <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
                    <div>
                      <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Arriving</p>
                      <h2 className="font-display text-2xl tracking-tight text-ink mt-1.5">Upcoming Bookings</h2>
                    </div>
                    <button onClick={() => setTab("bookings")} className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent">
                      View all →
                    </button>
                  </div>
                  {bookings.length === 0 ? (
                    <p className="text-sm text-ink-secondary py-8">No bookings yet.</p>
                  ) : (
                    <ul className="divide-y divide-hairline border-y border-hairline">
                      {bookings.slice(0, 4).map((b) => (
                        <li key={b.id} onClick={() => setBookingModal(b)} className="flex items-center justify-between gap-4 py-4 px-1 transition-colors hover:bg-bone-secondary/40 cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-semibold text-ink truncate">{b.guest}</p>
                            <p className="text-xs text-ink-secondary mt-0.5">{b.unit} · {b.check_in} → {b.check_out}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums text-ink">{fmt(b.amount_minor)}</p>
                            <span className={`inline-block mt-0.5 text-[10px] font-sans font-semibold uppercase tracking-[0.06em] ${statusColor(b.status)}`}>{b.status}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Damage Claims */}
                <section>
                  <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
                    <div>
                      <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Outstanding</p>
                      <h2 className="font-display text-2xl tracking-tight text-ink mt-1.5">Damage Claims</h2>
                    </div>
                    <button onClick={() => setTab("claims")} className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent">
                      View all →
                    </button>
                  </div>
                  {damageClaims.length === 0 ? (
                    <p className="text-sm text-ink-secondary py-8">No open claims across your properties.</p>
                  ) : (
                    <ul className="divide-y divide-hairline border-y border-hairline">
                      {damageClaims.slice(0, 3).map((c) => (
                        <li key={c.id} onClick={() => setClaimModal(c)} className="flex items-center justify-between gap-4 py-4 px-1 transition-colors hover:bg-bone-secondary/40 cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-semibold text-ink truncate">{c.property_name}</p>
                            <p className="text-xs text-ink-secondary mt-0.5">{c.guest_name} · {c.booking_ref}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums text-ink">{fmt(c.estimated_cost_minor)}</p>
                            <span className={`inline-block mt-0.5 text-[10px] font-sans font-semibold uppercase tracking-[0.06em] capitalize ${c.admin_decision === "pending" ? "text-primary" : c.admin_decision === "approved" ? "text-success" : "text-danger"}`}>{c.admin_decision}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* Properties Overview */}
              <section>
                <div className="pb-5 mb-6 border-b border-hairline">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Listings</p>
                  <h2 className="font-display text-2xl tracking-tight text-ink mt-1.5">Your Properties</h2>
                </div>
                <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2 rounded-xl overflow-hidden border border-hairline">
                  {properties.map((p) => (
                    <div key={p.unit} className="bg-canvas p-6">
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-ink-tertiary">{p.name}</p>
                          <p className="font-display text-lg tracking-tight text-ink mt-1">{p.unit}</p>
                        </div>
                        <span className={`text-[10px] font-sans font-semibold uppercase tracking-[0.06em] ${p.active ? "text-success" : "text-danger"}`}>{p.active ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-hairline">
                        <div>
                          <p className="font-display text-base tabular-nums text-ink">{fmt(p.monthly_minor)}</p>
                          <p className="text-[10px] font-sans uppercase tracking-[0.1em] text-ink-tertiary mt-1">Revenue</p>
                        </div>
                        <div>
                          <p className="font-display text-base tabular-nums text-ink">{p.bookings}</p>
                          <p className="text-[10px] font-sans uppercase tracking-[0.1em] text-ink-tertiary mt-1">Bookings</p>
                        </div>
                        <div>
                          <p className="font-display text-base tabular-nums text-ink">{p.occ}</p>
                          <p className="text-[10px] font-sans uppercase tracking-[0.1em] text-ink-tertiary mt-1">Occupancy</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ---------- PROPERTIES ---------- */}
          {tab === "properties" && (
            <div className="space-y-10">
              <header className="pb-10 mb-10 border-b border-hairline">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Listings</p>
                <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Your properties</h2>
                <p className="mt-4 text-base text-ink-secondary leading-relaxed max-w-[65ch]">Performance, occupancy and revenue for each listing.</p>
              </header>

              {properties.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-hairline rounded-xl">
                  <p className="font-display text-base text-ink">No properties yet</p>
                  <p className="text-sm text-ink-secondary mt-1.5">Your operator will onboard a property for you.</p>
                </div>
              ) : properties.map((prop) => (
                <section key={prop.name} className="pb-10 mb-10 border-b border-hairline last:border-b-0 last:pb-0 last:mb-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                    <div>
                      <h3 className="font-display text-2xl tracking-tight text-ink">{prop.name}</h3>
                      <p className="text-sm text-ink-secondary mt-1.5">{prop.meta}</p>
                      <p className="text-xs text-ink-tertiary mt-1 font-sans">{prop.beds} bed{prop.beds > 1 ? "s" : ""} · {prop.baths} bath{prop.baths > 1 ? "s" : ""} · sleeps {prop.sleeps}</p>
                    </div>
                    <span className={`text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border px-2.5 py-1 self-start ${prop.active ? "border-primary/30 text-primary-dark bg-primary-bg" : "border-error/30 text-error bg-error/5"}`}>
                      {prop.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Revenue breakdown per property */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4 lg:divide-x lg:divide-hairline mb-8">
                    {[
                      { label: "Monthly revenue", value: `£${Math.round(prop.monthly_minor / 100).toLocaleString("en-GB")}` },
                      { label: "Bookings", value: `${prop.bookings} this month` },
                      { label: "Occupancy", value: prop.occ },
                      { label: "Avg nightly", value: `£${Math.round(prop.monthly_minor / (parseInt(prop.bookings) || 1) / 100)}` },
                    ].map((m, i) => (
                      <div key={m.label} className={i > 0 ? "lg:pl-8" : ""}>
                        <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">{m.label}</p>
                        <p className="font-display text-[1.75rem] leading-none tracking-tight tabular-nums text-ink mt-2">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Earnings bar */}
                  <div className="bg-primary-bg rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-primary">Revenue trend</p>
                      <p className="text-xs text-ink-secondary font-sans">Last 3 months</p>
                    </div>
                    <div className="flex items-end gap-3 h-20">
                      {[60, 75, parseInt(prop.occ)].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1.5">
                          <span className="text-[10px] font-sans font-semibold text-ink-secondary">{h}%</span>
                          <div className="w-full rounded-t bg-primary" style={{ height: `${h}%` }} />
                          <span className="text-[10px] font-sans uppercase tracking-[0.08em] text-ink-tertiary">{["Apr", "May", "Jun"][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* ---------- BOOKINGS ---------- */}
          {tab === "bookings" && (
            <div className="space-y-12">
              <header className="pb-10 mb-10 border-b border-hairline">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Calendar</p>
                <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Bookings & availability</h2>
                <p className="mt-4 text-base text-ink-secondary leading-relaxed max-w-[65ch]">Bookings across all your units. Block dates you can't host.</p>
              </header>

              {/* Calendar */}
              <section>
                <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline flex-wrap">
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Availability</p>
                    <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">{monthLabel()}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => shiftMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bone-secondary border border-hairline text-ink-secondary cursor-pointer bg-transparent">{I.chevronLeft}</button>
                    <button onClick={() => shiftMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bone-secondary border border-hairline text-ink-secondary cursor-pointer bg-transparent">{I.chevronRight}</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center text-[10px] font-sans font-semibold uppercase tracking-[0.12em] py-2 text-ink-tertiary">{d}</div>)}
                  {calendar.map((cell, i) =>
                    cell.day === 0 ? <div key={`e-${i}`} /> : (
                      <button key={cell.day}
                        onClick={() => { if (cell.hasBooking) { const b = bookings.find((ob) => ob.guest === cell.bookingInfo?.guest); if (b) setBookingModal(b); } }}
                        title={cell.hasBooking ? `Booked — ${cell.bookingInfo?.unit}: ${cell.bookingInfo?.guest}` : ""}
                        className={`py-3 text-center text-sm font-sans font-medium transition-colors cursor-pointer border border-transparent ${cell.hasBooking ? "bg-primary text-white hover:bg-primary-dark" : "hover:bg-primary-bg"} ${cell.isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas" : ""} ${!cell.hasBooking && !cell.isToday ? "text-ink" : ""}`}
                      >{cell.day}</button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-secondary font-sans">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary" />Booked</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-primary" />Today</span>
                </div>

                {/* Block/unblock dates */}
                <div className="mt-8 pt-6 border-t border-hairline">
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-4">Block or unblock dates</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="border border-hairline rounded-lg px-3 py-2 text-xs outline-none focus:border-primary text-ink bg-canvas font-sans" />
                    <span className="text-xs text-ink-secondary font-sans">to</span>
                    <input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="border border-hairline rounded-lg px-3 py-2 text-xs outline-none focus:border-primary text-ink bg-canvas font-sans" />
                    <select id="owner-block-property" className="border border-hairline rounded-lg px-3 py-2 text-xs outline-none text-ink bg-canvas font-sans">
                      {properties.map((p) => (
                        <option key={p.id ?? p.name} value={p.id ?? p.name}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      disabled={!blockStart || !blockEnd || pendingBlock === "block"}
                      onClick={async () => {
                        setPendingBlock("block");
                        const sel = document.getElementById("owner-block-property") as HTMLSelectElement | null;
                        const pid = sel?.value;
                        if (!pid) { notify("No property selected", "error"); setPendingBlock(null); return; }
                        const r = await blockDates({ propertyId: pid, starts: blockStart, ends: blockEnd });
                        notify(r.ok ? "Dates blocked." : r.message ?? "Error", r.ok ? "success" : "error");
                        setPendingBlock(null);
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-semibold border border-hairline text-ink-secondary hover:bg-primary-bg cursor-pointer bg-canvas disabled:opacity-50 disabled:cursor-wait"
                    >{pendingBlock === "block" ? "Blocking..." : "Block"}</button>
                    <button
                      disabled={!blockStart || !blockEnd || pendingBlock === "unblock"}
                      onClick={async () => {
                        setPendingBlock("unblock");
                        const sel = document.getElementById("owner-block-property") as HTMLSelectElement | null;
                        const pid = sel?.value;
                        if (!pid) { notify("No property selected", "error"); setPendingBlock(null); return; }
                        const r = await unblockDates({ propertyId: pid, starts: blockStart, ends: blockEnd });
                        notify(r.ok ? "Dates unblocked." : r.message ?? "Error", r.ok ? "success" : "error");
                        setPendingBlock(null);
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-semibold border border-hairline text-ink-secondary hover:bg-primary-bg cursor-pointer bg-canvas disabled:opacity-50 disabled:cursor-wait"
                    >{pendingBlock === "unblock" ? "Unblocking..." : "Unblock"}</button>
                  </div>
                </div>
              </section>

              {/* Upcoming bookings */}
              <section>
                <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Arriving</p>
                    <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">Upcoming Bookings</h3>
                  </div>
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
                    {bookings.length} upcoming
                  </span>
                </div>
                {bookings.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-hairline rounded-xl">
                    <p className="font-display text-base text-ink">No upcoming bookings</p>
                    <p className="text-sm text-ink-secondary mt-1.5">Confirmed stays will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {bookings.map((b) => (
                      <li key={b.id} onClick={() => setBookingModal(b)} className="flex items-start justify-between gap-4 py-4 px-1 hover:bg-bone-secondary/40 cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg tracking-tight text-ink truncate">{b.guest}</p>
                          <p className="text-xs text-ink-secondary mt-1">{b.unit}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-secondary font-sans">
                            <span>{b.check_in} → {b.check_out}</span>
                            <span>{b.guest_count} guest{b.guest_count > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-base tabular-nums text-ink">{fmt(b.amount_minor)}</p>
                          <span className={`inline-block mt-1.5 text-[10px] font-sans font-semibold uppercase tracking-[0.08em] ${statusColor(b.status)}`}>{b.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ---------- DAMAGE CLAIMS ---------- */}
          {tab === "claims" && (
            <div className="space-y-12">
              <header className="pb-10 mb-10 border-b border-hairline">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Damage</p>
                <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Claims</h2>
                <p className="mt-4 text-base text-ink-secondary leading-relaxed max-w-[65ch]">Claims filed against your properties — operator submits, admin adjudicates.</p>
              </header>
              <section>
                <div className="pb-5 mb-6 border-b border-hairline">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Filed</p>
                  <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">All claims</h3>
                </div>
                {damageClaims.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-hairline rounded-xl">
                    <p className="font-display text-base text-ink">No damage claims</p>
                    <p className="text-sm text-ink-secondary mt-1.5">Your properties are in good standing.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {damageClaims.map((c) => (
                      <li key={c.id} onClick={() => setClaimModal(c)} className="flex items-start justify-between gap-4 py-5 px-1 hover:bg-bone-secondary/40 cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg tracking-tight text-ink">{c.property_name}</p>
                          <p className="text-xs text-ink-secondary mt-1">Guest: {c.guest_name} · Booking: {c.booking_ref}</p>
                          <p className="text-xs text-ink-secondary mt-1.5 line-clamp-2 max-w-[60ch]">{c.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-lg tabular-nums text-ink">{fmt(c.estimated_cost_minor)}</p>
                          <span className={`inline-block mt-1.5 text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border px-2 py-0.5 ${
                            c.admin_decision === "approved"
                              ? "border-primary/30 text-primary-dark bg-primary-bg"
                              : c.admin_decision === "rejected"
                                ? "border-error/30 text-error bg-error/5"
                                : c.admin_decision === "adjusted"
                                  ? "border-warning/30 text-warning bg-warning/5"
                                  : "border-hairline text-ink-secondary bg-canvas"
                          }`}>{c.admin_decision}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ---------- PAYOUTS ---------- */}
          {tab === "payouts" && (
            <div className="space-y-12">
              <header className="pb-10 mb-10 border-b border-hairline flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[65ch]">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Earnings</p>
                  <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Statement</h2>
                  <p className="mt-4 text-base text-ink-secondary leading-relaxed">Consolidated payouts — all units combined.</p>
                </div>
                <div>
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary">Latest</p>
                  <p className="font-display text-[2rem] leading-none tracking-tight mt-2 tabular-nums text-primary">{fmt(payouts[0]?.amount_minor ?? 0)}</p>
                </div>
              </header>
              <section>
                <div className="pb-5 mb-6 border-b border-hairline">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">History</p>
                  <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">All payouts</h3>
                </div>
                {payouts.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-hairline rounded-xl">
                    <p className="font-display text-base text-ink">No payouts yet</p>
                    <p className="text-sm text-ink-secondary mt-1.5">Earnings appear here after each booking completes its inspection + settlement window.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {payouts.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-4 py-5 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg tracking-tight text-ink">{p.period}</p>
                          <p className="text-xs text-ink-secondary mt-1 font-sans">{p.units} · {p.paid_at}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-lg tabular-nums text-ink">{fmt(p.amount_minor)}</p>
                          <span className={`inline-block mt-1.5 text-[10px] font-sans font-semibold uppercase tracking-[0.08em] ${statusColor(p.status)}`}>{payoutStatusLabel(p.status)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ---------- PAYOUT DETAILS (bank info for NGN disbursement) ---------- */}
          {tab === "payout-details" && <PayoutDetailsForm initial={initialPayoutDetails ?? null} onNotify={notify} />}

          {/* ---------- CALENDAR SYNC ---------- */}
          {tab === "calendar" && (
            <div className="space-y-12">
              <header className="pb-10 mb-10 border-b border-hairline">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">External</p>
                <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Calendar sync</h2>
                <p className="mt-4 text-base text-ink-secondary leading-relaxed max-w-[65ch]">
                  Subscribe to your CheckinBliss booking calendar. Updates automatically — one-way sync from our system to yours.
                </p>
              </header>
              <section>
                <div className="pb-5 mb-6 border-b border-hairline">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">URL</p>
                  <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">Subscribe URL</h3>
                </div>
                <div className="bg-primary-bg rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-xs bg-canvas border border-hairline rounded-lg px-3 py-2 text-ink-secondary flex-1 break-all font-mono min-w-0">
                      https://checkinbliss.com/api/calendar/ow1
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText("https://checkinbliss.com/api/calendar/ow1"); notify("Copied to clipboard", "success"); }}
                      className="text-xs px-4 py-2 rounded-lg border border-hairline text-ink-secondary hover:bg-canvas transition-colors cursor-pointer bg-transparent font-sans font-semibold"
                    >Copy</button>
                  </div>
                </div>
                <p className="text-xs text-ink-secondary mb-4 font-sans">Add to your calendar app:</p>
                <div className="flex flex-wrap gap-3">
                  <a href="https://calendar.google.com/calendar/r?cid=https://checkinbliss.com/api/calendar/ow1" target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans font-medium text-ink-secondary hover:bg-bone-secondary transition-colors no-underline bg-canvas">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 3.39H1.44A1.44 1.44 0 0 0 0 4.83v15.34A1.44 1.44 0 0 0 1.44 21.6h21.12A1.44 1.44 0 0 0 24 20.17V4.83a1.44 1.44 0 0 0-1.44-1.44zM16.8 16.8H7.2v-2.4h9.6v2.4zm0-4.8H7.2V9.6h9.6v2.4z"/></svg>
                    Google Calendar
                  </a>
                  <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent("BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CheckinBliss//Calendar//EN\nMETHOD:PUBLISH\nX-WR-CALNAME:CheckinBliss\nEND:VCALENDAR")}`} download="checkinbliss-bookings.ics" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans font-medium text-ink-secondary hover:bg-bone-secondary transition-colors no-underline bg-canvas">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 0h-11A2.5 2.5 0 0 0 4 2.5v19A2.5 2.5 0 0 0 6.5 24h11a2.5 2.5 0 0 0 2.5-2.5v-19A2.5 2.5 0 0 0 17.5 0zm-5.5 22a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
                    Outlook / Apple Calendar
                  </a>
                </div>
                <p className="text-xs text-ink-tertiary mt-5 font-sans">Updates every 15 minutes. Your calendar app checks for changes automatically.</p>
              </section>
              <section>
                <div className="pb-5 mb-6 border-b border-hairline">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Bookings</p>
                  <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">Your upcoming bookings</h3>
                </div>
                {bookings.length === 0 ? (
                  <p className="text-sm text-ink-secondary font-sans">No upcoming bookings to sync.</p>
                ) : (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {bookings.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-4 py-4 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-sans font-semibold text-ink">{b.guest} · {b.unit}</p>
                          <p className="text-xs text-ink-secondary mt-0.5 font-sans">{b.check_in} → {b.check_out}</p>
                        </div>
                        <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${b.check_in.replace(/-/g, "")}\nDTEND:${b.check_out.replace(/-/g, "")}\nSUMMARY:CheckinBliss — ${b.unit}\nDESCRIPTION:Guest: ${b.guest}\nBooking: ${b.id}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`)}`} download={`booking-${b.id}.ics`} className="text-[10px] font-sans font-semibold uppercase tracking-[0.08em] text-primary hover:text-primary-dark no-underline">
                          Add to calendar →
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ---------- NOTIFICATIONS ---------- */}
          {tab === "notifications" && <NotificationsView role="owner" userId={user?.id} />}

      {/* Booking detail modal */}
      <Modal
        open={!!bookingModal}
        onClose={() => setBookingModal(null)}
        title={bookingModal ? `Booking #${bookingModal.id}` : undefined}
        size="lg"
      >
        {bookingModal && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Guest", value: bookingModal.guest },
              { label: "Property", value: bookingModal.unit },
              { label: "Check in", value: bookingModal.check_in },
              { label: "Check out", value: bookingModal.check_out },
              { label: "Amount", value: fmt(bookingModal.amount_minor) },
              { label: "Status", value: bookingModal.status },
              { label: "Nights", value: String(bookingModal.nights) },
              { label: "Guests", value: String(bookingModal.guest_count) },
            ].map((f) => (
              <div key={f.label} className="p-3 rounded-xl bg-bone-secondary">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-ink-tertiary">{f.label}</span>
                <p className="text-sm font-sans font-semibold mt-1 text-ink capitalize">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Damage claim detail modal */}
      <Modal
        open={!!claimModal}
        onClose={() => setClaimModal(null)}
        title={claimModal ? `Claim ${claimModal.id}` : undefined}
        size="lg"
      >
        {claimModal && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Property", value: claimModal.property_name },
                { label: "Guest", value: claimModal.guest_name },
                { label: "Booking", value: claimModal.booking_ref },
                { label: "Claimed Amount", value: fmt(claimModal.estimated_cost_minor) },
                { label: "Decision", value: claimModal.admin_decision },
                { label: "Status", value: claimModal.dispute_status },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-xl bg-bone-secondary">
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-ink-tertiary">{f.label}</span>
                  <p className="text-sm font-sans font-semibold mt-1 text-ink capitalize">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-bone-secondary">
              <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-ink-tertiary mb-1.5">Description</p>
              <p className="text-sm text-ink leading-relaxed font-sans">{claimModal.description}</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Payout Details form — owner enters bank details for Fincra payout */
/* ------------------------------------------------------------------ */

const NIGERIAN_BANKS: Array<{ name: string; code: string }> = [
  { name: "Access Bank", code: "044" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Globus Bank", code: "00103" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Keystone Bank", code: "082" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank Nigeria", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "SunTrust Bank", code: "100" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

function PayoutDetailsForm({
  initial,
  onNotify,
}: {
  initial: OwnerPayoutDetailsData | null;
  onNotify: (message: string, type?: "success" | "error") => void;
}) {
  const [bankName, setBankName] = useState(initial?.nigerianBankName ?? "");
  const [bankCode, setBankCode] = useState(initial?.bankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(initial?.nigerianBankAccountNumber ?? "");
  const [accountName, setAccountName] = useState(initial?.nigerianBankAccountName ?? "");
  const [tin, setTin] = useState(initial?.taxIdentificationNumber ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const alreadyRegistered = Boolean(initial?.fincraBeneficiaryId);

  function onBankSelect(name: string) {
    setBankName(name);
    const match = NIGERIAN_BANKS.find((b) => b.name === name);
    if (match) setBankCode(match.code);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await saveOwnerPayoutDetails({
        nigerianBankName: bankName,
        bankCode,
        nigerianBankAccountNumber: accountNumber,
        nigerianBankAccountName: accountName,
        taxIdentificationNumber: tin,
      });
      if (result.ok) {
        onNotify(alreadyRegistered ? "Payout details updated" : "Payout details saved — beneficiary registered with Fincra", "success");
      } else {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        onNotify(result.message, "error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-hairline p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display text-lg font-medium text-ink">Payout Details</h2>
            <p className="text-xs mt-0.5 text-ink-secondary">
              Your 88% owner share is disbursed in NGN to this account via Fincra. Required for payouts to land.
            </p>
          </div>
          {alreadyRegistered && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-success/15 text-success whitespace-nowrap">
              Registered
            </span>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="bankName" className="block text-xs font-semibold text-ink-secondary mb-1.5">Bank</label>
            <select
              id="bankName"
              value={bankName}
              onChange={(e) => onBankSelect(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-hairline bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">Select your bank…</option>
              {NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.name}>{b.name}</option>
              ))}
            </select>
            {errors.nigerianBankName && <p className="text-xs text-danger mt-1">{errors.nigerianBankName}</p>}
          </div>

          <div>
            <label htmlFor="bankCode" className="block text-xs font-semibold text-ink-secondary mb-1.5">Bank code</label>
            <input
              id="bankCode"
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value.replace(/\D/g, ""))}
              placeholder="058"
              className="w-full px-3 py-2.5 rounded-xl border border-hairline bg-white text-sm text-ink tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <p className="text-xs text-ink-secondary mt-1">Auto-filled from bank selection. 3-digit CBN code.</p>
            {errors.bankCode && <p className="text-xs text-danger mt-1">{errors.bankCode}</p>}
          </div>

          <div>
            <label htmlFor="accountNumber" className="block text-xs font-semibold text-ink-secondary mb-1.5">Account number</label>
            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="0123456789"
              className="w-full px-3 py-2.5 rounded-xl border border-hairline bg-white text-sm text-ink tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {errors.nigerianBankAccountNumber && <p className="text-xs text-danger mt-1">{errors.nigerianBankAccountNumber}</p>}
          </div>

          <div>
            <label htmlFor="accountName" className="block text-xs font-semibold text-ink-secondary mb-1.5">Account name</label>
            <input
              id="accountName"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="As it appears on your bank statement"
              className="w-full px-3 py-2.5 rounded-xl border border-hairline bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {errors.nigerianBankAccountName && <p className="text-xs text-danger mt-1">{errors.nigerianBankAccountName}</p>}
          </div>

          <div>
            <label htmlFor="tin" className="block text-xs font-semibold text-ink-secondary mb-1.5">Tax ID (TIN) <span className="text-ink-secondary font-normal">— optional</span></label>
            <input
              id="tin"
              type="text"
              inputMode="numeric"
              value={tin}
              onChange={(e) => setTin(e.target.value.replace(/\D/g, ""))}
              placeholder="8–14 digits"
              className="w-full px-3 py-2.5 rounded-xl border border-hairline bg-white text-sm text-ink tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {errors.taxIdentificationNumber && <p className="text-xs text-danger mt-1">{errors.taxIdentificationNumber}</p>}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
            >
              {pending ? "Saving…" : alreadyRegistered ? "Update details" : "Save & register with Fincra"}
            </button>
            <p className="text-xs text-ink-secondary">
              Bank details are registered with Fincra as a beneficiary on first save.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
