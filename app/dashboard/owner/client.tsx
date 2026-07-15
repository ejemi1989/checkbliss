"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { formatMinor } from "@/lib/currency";
import { getOwnerBookings, getOwnerPayouts, getCalendarBookings, getOwnerProperties } from "@/lib/data";
import { blockDates, unblockDates } from "@/actions/properties";
import type { AuthUser } from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationsView } from "@/components/notifications-view";
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

const bookings = getOwnerBookings();
const payouts = getOwnerPayouts();
const calendarBookings = getCalendarBookings();
const properties = getOwnerProperties();
const damageClaims = getSeedDamageClaims().filter((c) => ["PR001", "PR002"].includes(c.property_id)).slice(0, 4);

function fmt(n: number) { return formatMinor(n); }

function statusColor(s: string) {
  switch (s) {
    case "confirmed": case "checked_in": case "completed": case "paid": return "text-success";
    case "pending": case "pending_payment": return "text-primary";
    case "cancelled": return "text-danger";
    default: return "text-ink-secondary";
  }
}

type OwnerTab = "home" | "bookings" | "properties" | "claims" | "payouts" | "calendar" | "notifications";

const SIDEBAR: { id: OwnerTab; icon: keyof typeof I; label: string }[] = [
  { id: "home", icon: "barChart3", label: "Dashboard" },
  { id: "bookings", icon: "calendar", label: "Bookings" },
  { id: "properties", icon: "building2", label: "Properties" },
  { id: "claims", icon: "shield", label: "Damage Claims" },
  { id: "payouts", icon: "receipt", label: "Payouts" },
  { id: "calendar", icon: "sync", label: "Calendar Sync" },
  { id: "notifications", icon: "bell", label: "Notifications" },
];

export function OwnerDashboard({ user }: { user: AuthUser | null }) {
  const [tab, setTab] = useState<OwnerTab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [bookingModal, setBookingModal] = useState<(typeof bookings)[0] | null>(null);
  const [claimModal, setClaimModal] = useState<(typeof damageClaims)[0] | null>(null);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [pendingBlock, setPendingBlock] = useState<string | null>(null);

  const notify = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const today = new Date();
  const displayName = user?.name ?? "Adaora Mensah";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const firstName = displayName.split(" ")[0];
  const displayEmail = user?.email ?? "owner@checkbliss.com";

  /* Escape key closes modals */
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") { setBookingModal(null); setClaimModal(null); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* calendar logic */
  const bookingsByDate: Record<string, (typeof calendarBookings)[0]> = {};
  calendarBookings.forEach((b) => b.dates.forEach((d) => { bookingsByDate[d] = b; }));

  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const cells: { day: number; isToday: boolean; hasBooking: boolean; bookingInfo?: { unit: string; guest: string } }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: 0, isToday: false, hasBooking: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, isToday: isCurrentMonth && today.getDate() === d, hasBooking: !!bookingsByDate[dateStr], bookingInfo: bookingsByDate[dateStr] });
    }
    return cells;
  }, [month, year, today]);

  function monthLabel() { return new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" }); }

  const hour = today.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  /* stats */
  const totalRevenue = bookings.reduce((s, b) => s + (b.status === "cancelled" ? 0 : b.amount_minor), 0);
  const activeBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "pending").length;
  const claimsCount = damageClaims.length;
  const occupancyPct = "68%";

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink font-sans antialiased">
      {/* notification toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      {/* mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 lg:hidden bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* ---------- sidebar ---------- */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-hairline shrink-0 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <Link href="/" className="flex items-center gap-x-2.5 no-underline">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-base">O</div>
            <span className="text-base font-bold tracking-tight text-primary">CheckinBliss</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 flex items-center justify-center text-ink-secondary">{I.x}</button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 scroll-thin">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-primary px-4 mb-2 mt-2">Owner</p>
          <nav className="space-y-0.5">
            {SIDEBAR.map((item) => {
              const badge = item.id === "claims" ? String(claimsCount) : null;
              return (
                <button
                  key={item.id}
                  onClick={() => { setTab(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-x-3 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none text-left transition-colors ${tab === item.id ? "bg-primary text-white" : "text-ink-secondary hover:bg-primary-bg hover:text-primary bg-transparent"}`}
                >
                  <span className="w-4 shrink-0 flex items-center justify-center">{I[item.icon]}</span>
                  <span>{item.label}</span>
                  {badge && badge !== "0" ? (
                    <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-semibold ${tab === item.id ? "bg-white/20 text-white" : "bg-primary text-white"}`}>
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-ink-secondary px-4 mt-6 mb-2">Account</p>
          <nav className="space-y-0.5">
            <form action={logoutAction}>
              <button className="w-full flex items-center gap-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-ink-secondary hover:bg-primary-bg hover:text-primary cursor-pointer border-none text-left bg-transparent font-sans">
                <span className="w-4 shrink-0 flex items-center justify-center">{I.logOut}</span><span>Logout</span>
              </button>
            </form>
          </nav>
        </div>

        <div className="p-4 border-t border-hairline shrink-0 bg-primary-bg">
          <div className="flex items-center gap-x-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">{initials}</div>
            <div>
              <div className="text-sm font-semibold text-ink">{displayName}</div>
              <div className="text-xs text-ink-secondary">{displayEmail}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-hairline flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-x-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.hamburger}</button>
            <div className="flex items-center gap-x-2">
              <span className="text-sm font-semibold text-ink">Owner Dashboard</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-primary-bg text-primary">Verified</span>
            </div>
          </div>
          <div className="flex items-center gap-x-2">
            <NotificationBell role="owner" userId={user?.id} onViewAll={() => setTab("notifications")} />
            <button onClick={() => alert("Owner Help:\n\n• Bookings: View upcoming stays and block dates.\n• Properties: Monitor your units' performance.\n• Claims: Review damage claims and disputes.\n• Payouts: Track your earnings.\n• Calendar Sync: Subscribe to your booking calendar.")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-bg transition-colors text-ink-secondary cursor-pointer">
              {I.helpCircle}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 scroll-thin" onClick={() => sidebarOpen && setSidebarOpen(false)}>
          {/* stats always visible */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl border bg-white border-hairline hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all cursor-default">
              <p className="text-xs font-medium text-ink-secondary">Revenue (MTD)</p>
              <p className="text-2xl font-bold mt-1 tabular-nums text-primary">{fmt(totalRevenue)}</p>
              <p className="text-xs mt-1 font-medium text-success">↑ 12% vs May</p>
            </div>
            <div className="p-4 rounded-xl border bg-white border-hairline hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all cursor-default">
              <p className="text-xs font-medium text-ink-secondary">Active Bookings</p>
              <p className="text-2xl font-bold mt-1 tabular-nums text-ink">{activeBookings}</p>
              <p className="text-xs mt-1 font-medium text-ink-secondary">{properties.length} units</p>
            </div>
            <div className="p-4 rounded-xl border bg-white border-hairline hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all cursor-default">
              <p className="text-xs font-medium text-ink-secondary">Occupancy</p>
              <p className="text-2xl font-bold mt-1 tabular-nums text-ink">{occupancyPct}</p>
              <p className="text-xs mt-1 font-medium text-ink-secondary">This month</p>
            </div>
            <div className="p-4 rounded-xl border bg-primary text-white border-transparent transition-all cursor-default">
              <p className="text-xs font-medium text-blue-100">Next Payout</p>
              <p className="text-2xl font-bold mt-1 tabular-nums text-white">{fmt(payouts[0]?.amount_minor ?? 0)}</p>
              <p className="text-xs mt-1 font-medium text-blue-200">Expected Jul 5</p>
            </div>
          </div>

          {/* ---------- HOME / DASHBOARD ---------- */}
          {tab === "home" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-ink mb-1">{greet}, {firstName}</h1>
                <p className="text-sm text-ink-secondary">Here&rsquo;s your portfolio overview.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Bookings */}
                <div className="bg-white rounded-xl border border-hairline p-5">
                  <h2 className="text-base font-bold text-ink mb-4">Upcoming Bookings</h2>
                  <div className="space-y-2">
                    {bookings.slice(0, 4).map((b) => (
                      <div key={b.id} onClick={() => setBookingModal(b)} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{b.guest} · {b.unit}</p>
                          <p className="text-xs text-ink-secondary">{b.check_in} → {b.check_out}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums text-ink">{fmt(b.amount_minor)}</p>
                          <span className={`inline-block mt-0.5 text-[11px] font-semibold ${statusColor(b.status)}`}>{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setTab("bookings")} className="mt-4 text-xs font-semibold text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent">View all bookings →</button>
                </div>

                {/* Damage Claims */}
                <div className="bg-white rounded-xl border border-hairline p-5">
                  <h2 className="text-base font-bold text-ink mb-4">Recent Damage Claims</h2>
                  {damageClaims.length === 0 ? (
                    <p className="text-sm text-ink-secondary py-4">No open claims across your properties.</p>
                  ) : (
                    <div className="space-y-2">
                      {damageClaims.slice(0, 3).map((c) => (
                        <div key={c.id} onClick={() => setClaimModal(c)} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg cursor-pointer transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">{c.property_name}</p>
                            <p className="text-xs text-ink-secondary">{c.guest_name} · {c.booking_ref}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold tabular-nums text-ink">{fmt(c.estimated_cost_minor)}</p>
                            <span className={`inline-block mt-0.5 text-[11px] font-semibold capitalize ${c.admin_decision === "pending" ? "text-primary" : c.admin_decision === "approved" ? "text-success" : "text-danger"}`}>{c.admin_decision}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setTab("claims")} className="mt-4 text-xs font-semibold text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent">View all claims →</button>
                </div>
              </div>

              {/* Properties Overview */}
              <div className="bg-white rounded-xl border border-hairline p-5">
                <h2 className="text-base font-bold text-ink mb-4">Your Properties</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {properties.map((p) => (
                    <div key={p.unit} className="p-4 rounded-xl border border-hairline hover:bg-primary-bg transition-colors cursor-default">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{p.name}</p>
                          <p className="text-base font-bold mt-0.5 text-ink">{p.unit}</p>
                        </div>
                        <span className={`text-[11px] font-semibold ${p.active ? "text-success" : "text-danger"}`}>{p.active ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-sm font-semibold text-ink tabular-nums">{fmt(p.monthly_minor)}</p><p className="text-[10px] text-ink-secondary">Revenue</p></div>
                        <div><p className="text-sm font-semibold text-ink tabular-nums">{p.bookings}</p><p className="text-[10px] text-ink-secondary">Bookings</p></div>
                        <div><p className="text-sm font-semibold text-ink tabular-nums">{p.occ}</p><p className="text-[10px] text-ink-secondary">Occupancy</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------- BOOKINGS ---------- */}
          {tab === "bookings" && (
            <div className="space-y-6">
              {/* Calendar */}
              <div className="bg-white rounded-xl border border-hairline p-5">
                <div className="flex items-center justify-between mb-5">
                  <div><h2 className="text-base font-bold text-ink">Availability Calendar</h2><p className="text-xs mt-0.5 text-ink-secondary">Bookings across all your units</p></div>
                  <div className="flex items-center gap-x-2">
                    <button onClick={() => { setMonth((m) => { if (m <= 0) { setYear((y) => y - 1); return 11; } return m - 1; }); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg border border-hairline text-ink-secondary cursor-pointer">{I.chevronLeft}</button>
                    <span className="text-sm font-semibold text-ink w-28 text-center">{monthLabel()}</span>
                    <button onClick={() => { setMonth((m) => { if (m >= 11) { setYear((y) => y + 1); return 0; } return m + 1; }); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg border border-hairline text-ink-secondary cursor-pointer">{I.chevronRight}</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center text-xs font-semibold py-2 text-ink-secondary">{d}</div>)}
                  {calendar.map((cell, i) =>
                    cell.day === 0 ? <div key={`e-${i}`} /> : (
                      <button key={cell.day}
                        onClick={() => { if (cell.hasBooking) { const b = bookings.find((ob) => ob.guest === cell.bookingInfo?.guest); if (b) setBookingModal(b); } }}
                        title={cell.hasBooking ? `Booked — ${cell.bookingInfo?.unit}: ${cell.bookingInfo?.guest}` : ""}
                        className={`py-2 text-center text-sm rounded-lg transition-colors cursor-pointer ${cell.hasBooking ? "bg-primary text-white font-semibold hover:bg-primary-dark" : "hover:bg-primary-bg"} ${cell.isToday ? "ring-2 ring-primary ring-offset-[-2px]" : ""} ${!cell.hasBooking && !cell.isToday ? "text-ink" : ""}`}
                      >{cell.day}</button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-x-4 mt-4 text-xs text-ink-secondary">
                  <span className="flex items-center gap-x-1.5"><span className="w-3 h-3 rounded bg-primary" />Booked</span>
                  <span className="flex items-center gap-x-1.5"><span className="w-3 h-3 rounded border-2 border-primary" />Today</span>
                </div>

                {/* Block/unblock dates */}
                <div className="mt-5 pt-5 border-t border-hairline">
                  <p className="text-xs font-semibold text-ink mb-3">Block or unblock dates</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    <input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="border border-hairline rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-ink" />
                    <span className="text-xs text-ink-secondary">to</span>
                    <input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="border border-hairline rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-ink" />
                    <select className="border border-hairline rounded-lg px-2 py-1.5 text-xs outline-none text-ink">
                      <option>The Palms Maisonette</option>
                      <option>Sunset Dove</option>
                    </select>
                    <button
                      disabled={!blockStart || !blockEnd || pendingBlock === "block"}
                      onClick={async () => {
                        setPendingBlock("block");
                        const sel = document.querySelector("select") as HTMLSelectElement;
                        const pid = sel?.value === "Sunset Dove" ? "P002" : "P001";
                        const r = await blockDates({ propertyId: pid, starts: blockStart, ends: blockEnd });
                        notify(r.ok ? "Dates blocked." : r.message ?? "Error", r.ok ? "success" : "error");
                        setPendingBlock(null);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-hairline text-ink-secondary hover:bg-primary-bg cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >{pendingBlock === "block" ? "Blocking..." : "Block"}</button>
                    <button
                      disabled={!blockStart || !blockEnd || pendingBlock === "unblock"}
                      onClick={async () => {
                        setPendingBlock("unblock");
                        const sel = document.querySelector("select") as HTMLSelectElement;
                        const pid = sel?.value === "Sunset Dove" ? "P002" : "P001";
                        const r = await unblockDates({ propertyId: pid, starts: blockStart, ends: blockEnd });
                        notify(r.ok ? "Dates unblocked." : r.message ?? "Error", r.ok ? "success" : "error");
                        setPendingBlock(null);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-hairline text-ink-secondary hover:bg-primary-bg cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >{pendingBlock === "unblock" ? "Unblocking..." : "Unblock"}</button>
                  </div>
                </div>
              </div>

              {/* Upcoming bookings */}
              <div className="bg-white rounded-xl border border-hairline p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-ink">Upcoming Bookings</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-primary-bg text-primary">{bookings.length} upcoming</span>
                </div>
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.id} onClick={() => setBookingModal(b)} className="p-3 rounded-xl border border-hairline hover:bg-primary-bg cursor-pointer transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{b.guest}</p>
                          <p className="text-xs mt-0.5 text-ink-secondary">{b.unit}</p>
                          <div className="flex items-center gap-x-3 mt-1.5 text-xs text-ink-secondary">
                            <span>{b.check_in} → {b.check_out}</span>
                            <span>{b.guest_count} guest{b.guest_count > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums text-ink">{fmt(b.amount_minor)}</p>
                          <span className={`inline-block mt-1 text-[11px] font-semibold ${statusColor(b.status)}`}>{b.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------- PROPERTIES ---------- */}
          {tab === "properties" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-hairline p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-ink">Your Properties</h2>
                    <p className="text-xs text-ink-secondary mt-0.5">{properties.length} units · Managed by CheckinBliss</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {properties.map((p) => (
                    <div key={p.unit} className="bg-white p-5 rounded-xl border border-hairline hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all cursor-default">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{p.name}</p>
                          <p className="text-lg font-bold mt-0.5 text-ink">{p.unit}</p>
                          <p className="text-xs mt-0.5 text-ink-secondary">{p.meta}</p>
                        </div>
                        <span className={`text-[11px] font-semibold ${p.active ? "text-success" : "text-danger"}`}>{p.active ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center border-t border-hairline pt-4">
                        <div><p className="text-base font-semibold text-ink tabular-nums">{fmt(p.monthly_minor)}</p><p className="text-[10px] text-ink-secondary">Revenue</p></div>
                        <div><p className="text-base font-semibold text-ink tabular-nums">{p.bookings}</p><p className="text-[10px] text-ink-secondary">Bookings</p></div>
                        <div><p className="text-base font-semibold text-ink tabular-nums">{p.occ}</p><p className="text-[10px] text-ink-secondary">Occupancy</p></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center mt-3 pt-3 border-t border-hairline">
                        <div><p className="text-xs text-ink-secondary">Beds</p><p className="text-sm font-semibold text-ink">{p.beds ?? 2}</p></div>
                        <div><p className="text-xs text-ink-secondary">Baths</p><p className="text-sm font-semibold text-ink">{p.baths ?? 2}</p></div>
                        <div><p className="text-xs text-ink-secondary">Sleeps</p><p className="text-sm font-semibold text-ink">{p.sleeps ?? 4}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------- DAMAGE CLAIMS ---------- */}
          {tab === "claims" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-hairline p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-ink">Damage Claims</h2>
                    <p className="text-xs text-ink-secondary mt-0.5">Claims filed against your properties</p>
                  </div>
                </div>
                {damageClaims.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-ink-secondary">No damage claims. Your properties are in good standing.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {damageClaims.map((c) => (
                      <div key={c.id} onClick={() => setClaimModal(c)} className="p-4 rounded-xl border border-hairline hover:bg-primary-bg cursor-pointer transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink">{c.property_name}</p>
                            <p className="text-xs text-ink-secondary mt-0.5">Guest: {c.guest_name} · Booking: {c.booking_ref}</p>
                            <p className="text-xs text-ink-secondary mt-1 line-clamp-2">{c.description}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-sm font-bold tabular-nums text-ink">{fmt(c.estimated_cost_minor)}</p>
                            <span className={`inline-block mt-1 text-[11px] font-semibold capitalize ${c.admin_decision === "pending" ? "bg-primary-bg text-primary px-2 py-0.5 rounded-full" : c.admin_decision === "approved" ? "text-success" : c.admin_decision === "adjusted" ? "text-primary" : "text-danger"}`}>{c.admin_decision}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------- PAYOUTS ---------- */}
          {tab === "payouts" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-hairline p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-base font-bold text-ink">Earnings Statement</h2>
                    <p className="text-xs mt-0.5 text-ink-secondary">Consolidated payouts — all units combined</p>
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-primary">{fmt(payouts[0]?.amount_minor ?? 0)}</span>
                </div>
                <div className="space-y-2">
                  {payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-ink">{p.period} — {p.units}</p>
                        <p className="text-xs text-ink-secondary">Paid {p.paid_at}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums text-ink">{fmt(p.amount_minor)}</p>
                        <span className={`inline-block mt-0.5 text-[11px] font-semibold ${statusColor(p.status)}`}>Paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------- CALENDAR SYNC ---------- */}
          {tab === "calendar" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-hairline p-5">
                <h2 className="text-base font-bold text-ink mb-2">Sync with your calendar</h2>
                <p className="text-sm text-ink-secondary mb-5">
                  Subscribe to your CheckinBliss booking calendar. Updates automatically — one-way sync from our system to yours.
                </p>
                <div className="space-y-3 mb-5">
                  <div className="p-4 rounded-xl bg-primary-bg">
                    <p className="text-sm font-semibold text-ink mb-1">Subscribe URL</p>
                    <div className="flex items-center gap-x-2">
                      <code className="text-xs bg-white border border-hairline rounded-lg px-3 py-2 text-ink-secondary flex-1 break-all font-mono">
                        https://checkinbliss.com/api/calendar/ow1
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText("https://checkinbliss.com/api/calendar/ow1"); notify("Copied to clipboard", "success"); }}
                        className="text-xs px-3 py-2 rounded-lg border border-hairline text-ink-secondary hover:bg-white transition-colors cursor-pointer"
                      >Copy</button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-ink-secondary mb-4">Add to your calendar app:</p>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  <a href="https://calendar.google.com/calendar/r?cid=https://checkinbliss.com/api/calendar/ow1" target="_blank" rel="noopener" className="inline-flex items-center gap-x-2 px-4 py-2.5 rounded-xl border border-hairline text-sm font-medium text-ink-secondary hover:bg-primary-bg transition-colors no-underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 3.39H1.44A1.44 1.44 0 0 0 0 4.83v15.34A1.44 1.44 0 0 0 1.44 21.6h21.12A1.44 1.44 0 0 0 24 20.17V4.83a1.44 1.44 0 0 0-1.44-1.44zM16.8 16.8H7.2v-2.4h9.6v2.4zm0-4.8H7.2V9.6h9.6v2.4z"/></svg>
                    Google Calendar
                  </a>
                  <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent("BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CheckinBliss//Calendar//EN\nMETHOD:PUBLISH\nX-WR-CALNAME:CheckinBliss\nEND:VCALENDAR")}`} download="checkinbliss-bookings.ics" className="inline-flex items-center gap-x-2 px-4 py-2.5 rounded-xl border border-hairline text-sm font-medium text-ink-secondary hover:bg-primary-bg transition-colors no-underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 0h-11A2.5 2.5 0 0 0 4 2.5v19A2.5 2.5 0 0 0 6.5 24h11a2.5 2.5 0 0 0 2.5-2.5v-19A2.5 2.5 0 0 0 17.5 0zm-5.5 22a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
                    Outlook / Apple Calendar
                  </a>
                </div>
                <p className="text-xs text-ink-tertiary mt-4">Updates every 15 minutes. Your calendar app checks for changes automatically.</p>
              </div>
              <div className="bg-white rounded-xl border border-hairline p-5">
                <h3 className="text-sm font-semibold text-ink mb-3">Your upcoming bookings</h3>
                <div className="space-y-2">
                  {bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-hairline">
                      <div>
                        <p className="text-sm font-semibold text-ink">{b.guest} · {b.unit}</p>
                        <p className="text-xs text-ink-secondary">{b.check_in} → {b.check_out}</p>
                      </div>
                      <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${b.check_in.replace(/-/g, "")}\nDTEND:${b.check_out.replace(/-/g, "")}\nSUMMARY:CheckinBliss — ${b.unit}\nDESCRIPTION:Guest: ${b.guest}\\nBooking: ${b.id}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`)}`} download={`booking-${b.id}.ics`} className="text-xs font-medium text-brass hover:text-brass-dark no-underline">
                        Add to calendar ↓
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------- NOTIFICATIONS ---------- */}
          {tab === "notifications" && <NotificationsView role="owner" userId={user?.id} />}
        </div>
      </div>

      {/* Booking detail modal */}
      {bookingModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBookingModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Booking #{bookingModal.id}</h3>
              <button onClick={() => setBookingModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
                <div key={f.label} className="p-3 rounded-xl bg-primary-bg">
                  <span className="text-xs font-medium text-ink-secondary">{f.label}</span>
                  <p className="text-sm font-semibold mt-0.5 text-ink capitalize">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Damage claim detail modal */}
      {claimModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setClaimModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Claim {claimModal.id}</h3>
              <button onClick={() => setClaimModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: "Property", value: claimModal.property_name },
                { label: "Guest", value: claimModal.guest_name },
                { label: "Booking", value: claimModal.booking_ref },
                { label: "Claimed Amount", value: fmt(claimModal.estimated_cost_minor) },
                { label: "Decision", value: claimModal.admin_decision },
                { label: "Status", value: claimModal.dispute_status },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-xl bg-primary-bg">
                  <span className="text-xs font-medium text-ink-secondary">{f.label}</span>
                  <p className="text-sm font-semibold mt-0.5 text-ink capitalize">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-soft">
              <p className="text-xs font-semibold text-ink-secondary mb-1">Description</p>
              <p className="text-sm text-ink leading-relaxed">{claimModal.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
