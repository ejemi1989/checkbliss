"use client";

import { useState, useMemo } from "react";
import { getAdminBookings, getCalendarBookings } from "@/lib/data";
import { formatMinor } from "@/lib/currency";

export function BookingsView() {
  const [bookings] = useState(() => getAdminBookings());
  const [calendarBookings] = useState(() => getCalendarBookings());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [bookingModal, setBookingModal] = useState<typeof bookings[0] | null>(null);
  const [today] = useState(() => new Date());

  const bookingsByDate: Record<string, (typeof calendarBookings)[0]> = {};
  calendarBookings.forEach((b) => b.dates.forEach((d) => { bookingsByDate[d] = b; }));

  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows: { day: number; dateStr: string; isToday: boolean; booking: (typeof calendarBookings)[0] | null }[] = [];
    for (let i = 0; i < firstDay; i++) rows.push({ day: 0, dateStr: "", isToday: false, booking: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      rows.push({ day: d, dateStr, isToday, booking: bookingsByDate[dateStr] ?? null });
    }
    return rows;
  }, [month, year, bookingsByDate, today]);

  function monthLabel() { return new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" }); }

  const statusColor: Record<string, string> = {
    confirmed: "text-success",
    pending: "text-warning",
    completed: "text-ink-secondary",
    cancelled: "text-danger",
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-hairline rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ink">Booking Calendar</h2>
          <div className="flex items-center gap-x-2">
            <button onClick={() => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); }} className="px-3 py-1.5 rounded-lg border border-hairline text-sm hover:bg-primary-bg cursor-pointer">&larr;</button>
            <span className="text-sm font-semibold text-ink w-28 text-center">{monthLabel()}</span>
            <button onClick={() => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); }} className="px-3 py-1.5 rounded-lg border border-hairline text-sm hover:bg-primary-bg cursor-pointer">&rarr;</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-secondary mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendar.map((cell, i) => (
            <div key={i} className={`py-2 text-sm rounded-lg ${
              cell.day === 0 ? "" :
              cell.booking ? "bg-primary text-white font-semibold cursor-pointer hover:bg-primary-dark transition-colors" :
              cell.isToday ? "bg-primary-bg text-ink font-semibold" : "text-ink-secondary"
            }`}
              onClick={() => {
                if (cell.booking) {
                  const b = bookings.find((bk) => bk.guest === cell.booking?.guest);
                  if (b) setBookingModal(b);
                }
              }}
            >
              {cell.day > 0 ? cell.day : ""}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-x-4 mt-4 text-xs text-ink-secondary">
          <div className="flex items-center gap-x-1.5"><div className="w-3 h-3 rounded bg-primary" /> Booked</div>
          <div className="flex items-center gap-x-1.5"><div className="w-3 h-3 rounded bg-primary-bg border border-hairline" /> Today</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-ink">Platform Bookings ({bookings.length})</h2>
        </div>
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-hairline hover:bg-primary-bg transition-colors cursor-pointer" onClick={() => setBookingModal(b)}>
              <div className="flex-1">
                <div className="flex items-center gap-x-2">
                  <p className="text-sm font-semibold text-ink">{b.guest}</p>
                  <span className={`text-[11px] font-semibold ${statusColor[b.status] ?? "text-ink-secondary"}`}>{b.status}</span>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">{b.property_name} · {b.unit} · {b.check_in} → {b.check_out} · {b.nights} nights · {b.guest_count} guests</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-sm font-bold tabular-nums text-ink">{formatMinor(b.amount_minor)}</p>
                <p className="text-xs text-ink-secondary">{b.guest_email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {bookingModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBookingModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Booking — {bookingModal.guest}</h3>
              <button onClick={() => setBookingModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: "Guest", value: bookingModal.guest },
                { label: "Email", value: bookingModal.guest_email },
                { label: "Property", value: bookingModal.property_name },
                { label: "Unit", value: bookingModal.unit },
                { label: "Check-in", value: bookingModal.check_in },
                { label: "Check-out", value: bookingModal.check_out },
                { label: "Nights", value: String(bookingModal.nights) },
                { label: "Guests", value: String(bookingModal.guest_count) },
                { label: "Status", value: bookingModal.status },
                { label: "Amount", value: formatMinor(bookingModal.amount_minor) },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-xl bg-primary-bg">
                  <span className="text-xs font-medium text-ink-secondary">{f.label}</span>
                  <p className="text-sm font-semibold mt-0.5 text-ink">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
