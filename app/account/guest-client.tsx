"use client";

import type { AuthUser } from "@/lib/auth";
import { formatMinor } from "@/lib/currency";
import { getOwnerBookings } from "@/lib/data";

const I = {
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  star: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
};

type GuestTab = "overview" | "bookings" | "history" | "claims" | "settings" | "notifications";

function fmt(n: number) { return formatMinor(n); }

function statusColor(s: string) {
  switch (s) {
    case "confirmed": case "checked_in": return "text-success";
    case "pending": return "text-primary";
    case "completed": return "text-ink-secondary";
    case "cancelled": return "text-danger";
    default: return "text-ink-secondary";
  }
}

export function GuestDashboard({ user, initialTab }: { user: AuthUser | null; initialTab?: GuestTab }) {
  const bookings = getOwnerBookings().slice(0, 6);
  const displayName = user?.name ?? "Guest";

  return (
    <>
      <div className="mb-8">
        <h1 className="font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-tight text-ink">
          Welcome back, {displayName.split(" ")[0]}
        </h1>
        <p className="text-sm mt-1 text-ink-secondary">Your CheckinBliss account</p>
      </div>

      {initialTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-hairline p-6">
              <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary">Upcoming Stays</p>
              <p className="font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-medium mt-2 tabular-nums text-primary">{bookings.filter((b) => b.status === "confirmed").length}</p>
            </div>
            <div className="bg-white rounded-xl border border-hairline p-6">
              <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary">Past Stays</p>
              <p className="font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-medium mt-2 tabular-nums text-primary">{bookings.filter((b) => b.status === "completed").length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-hairline p-6">
            <h2 className="text-base font-sans font-semibold text-ink mb-4">Recent Bookings</h2>
              {bookings.length === 0 ? (
              <div className="text-center py-8 text-ink-secondary">
                <p className="text-sm">No bookings yet.</p>
                <a href="/search" className="text-sm text-primary hover:underline mt-2 inline-block">Browse stays</a>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-3 border-b border-hairline last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-bg text-primary flex items-center justify-center">{I.home}</div>
                      <div>
                        <p className="text-sm font-sans font-medium text-ink">{b.unit}</p>
                        <p className="text-xs text-ink-secondary">{b.check_in} – {b.check_out}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-sans font-medium text-ink tabular-nums">{fmt(b.amount_minor)}</p>
                      <span className={`text-[10px] font-sans font-medium uppercase tracking-[0.5px] ${statusColor(b.status)}`}>{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {initialTab === "bookings" && (
        <div className="space-y-4">
          <h2 className="text-base font-sans font-semibold text-ink">Upcoming Stays</h2>
          {bookings.filter((b) => b.status === "confirmed").length === 0 ? (
            <div className="text-center py-12 text-ink-secondary bg-white rounded-xl border border-hairline">
              <p className="text-sm">No upcoming stays scheduled.</p>
              <a href="/search" className="text-sm text-primary hover:underline mt-2 inline-block">Find your next stay</a>
            </div>
          ) : (
            bookings.filter((b) => b.status === "confirmed").map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-hairline p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans font-semibold text-ink">{b.unit}</p>
                    <p className="text-xs text-ink-secondary mt-1">{b.check_in} → {b.check_out} · {b.guest_count} guest{b.guest_count > 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.5px] rounded-full bg-success/10 text-success px-2.5 py-0.5">Confirmed</span>
                </div>
                <div className="mt-4 pt-4 border-t border-hairline flex items-center justify-between">
                  <p className="text-sm font-sans font-medium text-ink tabular-nums">{fmt(b.amount_minor)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {initialTab === "history" && (
        <div className="space-y-4">
          <h2 className="text-base font-sans font-semibold text-ink">Past Stays</h2>
          {bookings.filter((b) => b.status === "completed").length === 0 ? (
            <div className="text-center py-12 text-ink-secondary bg-white rounded-xl border border-hairline">
              <p className="text-sm">No past stays yet.</p>
            </div>
          ) : (
            bookings.filter((b) => b.status === "completed").map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-hairline p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans font-semibold text-ink">{b.unit}</p>
                    <p className="text-xs text-ink-secondary mt-1">{b.check_in} → {b.check_out} · {b.guest_count} guest{b.guest_count > 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.5px] rounded-full bg-bone text-ink-secondary px-2.5 py-0.5">Completed</span>
                </div>
                <div className="mt-4 pt-4 border-t border-hairline flex items-center justify-between">
                  <p className="text-sm font-sans font-medium text-ink tabular-nums">{fmt(b.amount_minor)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {initialTab === "claims" && (
        <div className="space-y-4">
          <h2 className="text-base font-sans font-semibold text-ink">My Damage Claims</h2>
          <div className="text-center py-12 text-ink-secondary bg-white rounded-xl border border-hairline">
            <p className="text-sm">No open damage claims.</p>
            <p className="text-xs mt-1">Claims related to your stays will appear here with evidence and resolution details.</p>
          </div>
        </div>
      )}

      {initialTab === "settings" && (
        <div className="space-y-6 max-w-lg">
          <h2 className="text-base font-sans font-semibold text-ink">Profile Settings</h2>
          <div className="bg-white rounded-xl border border-hairline p-6 space-y-5">
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Full Name</label>
              <input type="text" defaultValue={displayName} className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Email</label>
              <input type="email" defaultValue={user?.email ?? ""} className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" disabled />
            </div>
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Phone (WhatsApp)</label>
              <input type="tel" defaultValue="" placeholder="+234..." className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Communication Preference</label>
              <select className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors">
                <option>WhatsApp</option>
                <option>Email</option>
              </select>
            </div>
            <button className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-sans font-medium cursor-pointer hover:bg-lagoon transition-colors">Save Changes</button>
          </div>
        </div>
      )}

      {initialTab === "notifications" && (
        <div className="space-y-4">
          <h2 className="text-base font-sans font-semibold text-ink">Notifications</h2>
          <div className="text-center py-12 text-ink-secondary bg-white rounded-xl border border-hairline">
            <p className="text-sm">No notifications yet.</p>
          </div>
        </div>
      )}
    </>
  );
}
