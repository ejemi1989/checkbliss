"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatMinor } from "@/lib/currency";
import { getOwnerBookings } from "@/lib/data";
import { submitDispute } from "@/actions/disputes";
import type { AuthUser } from "@/lib/auth";

const bookings = getOwnerBookings().slice(0, 6);

function fmt(n: number) { return formatMinor(n); }

type GuestTab = "overview" | "bookings" | "history" | "claims" | "support" | "settings" | "notifications";

export function GuestDashboard({ user, initialTab }: { user: AuthUser | null; initialTab?: GuestTab }) {
  const displayUser = { name: user?.name ?? "Guest", email: user?.email ?? "" };
  const [tab, setTab] = useState<GuestTab>(initialTab ?? "overview");
  const [bookingDetail, setBookingDetail] = useState<typeof bookings[0] | null>(null);

  const upcoming = bookings.filter(b => b.status === "confirmed");
  const past = bookings.filter(b => b.status === "completed");

  const tabs: { key: GuestTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "bookings", label: "Upcoming" },
    { key: "history", label: "Past Stays" },
    { key: "claims", label: "Claims" },
    { key: "support", label: "Contact" },
    { key: "settings", label: "Settings" },
  ];

  const sharedSidebar = (
    <div className="w-56 shrink-0 max-lg:hidden">
      <div className="p-4">
        <p className="font-display text-lg font-medium text-ink">{displayUser.name}</p>
        <p className="font-sans text-xs text-ink-secondary">{displayUser.email}</p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === t.key ? "bg-primary-bg text-ink" : "text-ink-secondary hover:text-ink hover:bg-primary-bg/50"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-bone">
      <div className="max-w-[1100px] mx-auto px-6 py-8 flex gap-8 max-lg:flex-col">
        {sharedSidebar}

        <div className="flex-1 min-w-0">
          {/* Mobile nav */}
          <div className="hidden max-lg:flex gap-1 overflow-x-auto pb-3 mb-5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === t.key ? "bg-card text-ink shadow-sm" : "text-ink-secondary"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-medium text-ink">Welcome back, {displayUser.name.split(" ")[0]}</h1>
              <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                <div className="p-5 rounded-xl border border-hairline bg-card">
                  <p className="text-sm text-ink-secondary mb-1">Upcoming stays</p>
                  <p className="font-display text-3xl font-semibold text-ink">{upcoming.length}</p>
                </div>
                <div className="p-5 rounded-xl border border-hairline bg-card">
                  <p className="text-sm text-ink-secondary mb-1">Past stays</p>
                  <p className="font-display text-3xl font-semibold text-ink">{past.length}</p>
                </div>
                <div className="p-5 rounded-xl border border-hairline bg-card">
                  <p className="text-sm text-ink-secondary mb-1">Open claims</p>
                  <p className="font-display text-3xl font-semibold text-ink">0</p>
                </div>
              </div>

              <div>
                <h2 className="font-display text-lg font-medium text-ink mb-3">Upcoming stays</h2>
                <div className="space-y-2">
                  {upcoming.slice(0, 3).map((b) => (
                    <BookingCard key={b.id} booking={b} onClick={() => setBookingDetail(b)} />
                  ))}
                  {upcoming.length === 0 && <p className="text-sm text-ink-secondary">No upcoming stays.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Upcoming Bookings ── */}
          {tab === "bookings" && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-medium text-ink">Upcoming stays</h1>
              <div className="space-y-2">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} onClick={() => setBookingDetail(b)} />
                ))}
                {upcoming.length === 0 && <p className="text-sm text-ink-secondary">No upcoming stays.</p>}
              </div>
            </div>
          )}

          {/* ── Past Stays ── */}
          {tab === "history" && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-medium text-ink">Past stays</h1>
              <div className="space-y-2">
                {past.map((b) => (
                  <BookingCard key={b.id} booking={b} onClick={() => setBookingDetail(b)} />
                ))}
                {past.length === 0 && <p className="text-sm text-ink-secondary">No past stays.</p>}
              </div>
            </div>
          )}

          {/* ── Claims + Dispute ── */}
          {tab === "claims" && <ClaimsTab user={displayUser} />}

          {/* ── Contact / Support ── */}
          {tab === "support" && <ContactTab user={displayUser} />}

          {/* ── Notifications ── */}
          {tab === "notifications" && <ContactTab user={displayUser} />}

          {/* ── Settings ── */}
          {tab === "settings" && <SettingsTab user={displayUser} />}

          {/* ── Booking Detail Modal ── */}
          {bookingDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setBookingDetail(null)}>
              <div className="absolute inset-0 bg-ink/40" />
              <div className="relative bg-card rounded-xl border border-hairline shadow-lg w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-medium text-ink">{bookingDetail.property}</h3>
                    <p className="text-sm text-ink-secondary">{bookingDetail.city}, {bookingDetail.neighbourhood}</p>
                  </div>
                  <button onClick={() => setBookingDetail(null)} className="p-1 rounded-lg hover:bg-primary-bg cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary-bg">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute mb-0.5">Check-in</p>
                    <p className="text-sm font-medium text-ink">{bookingDetail.check_in}</p>
                    <p className="text-xs text-ink-secondary">After 2:00 PM</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary-bg">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute mb-0.5">Check-out</p>
                    <p className="text-sm font-medium text-ink">{bookingDetail.check_out}</p>
                    <p className="text-xs text-ink-secondary">Before 11:00 AM</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Booking reference", value: bookingDetail.id },
                    { label: "Guests", value: `${bookingDetail.guests}` },
                    { label: "Status", value: bookingDetail.status },
                    { label: "Amount", value: fmt(bookingDetail.amount_minor) },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-ink-secondary">{r.label}</span>
                      <span className="font-medium text-ink">{r.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setBookingDetail(null)}
                  className="w-full py-2.5 rounded-lg bg-primary-bg text-ink text-sm font-medium hover:bg-hairline transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking, onClick }: { booking: any; onClick: () => void }) {
  return (
    <div onClick={onClick} className="p-4 rounded-xl border border-hairline bg-card hover:bg-primary-bg transition-colors cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-base font-medium text-ink">{booking.property}</p>
          <p className="text-xs text-ink-secondary mt-0.5">{booking.check_in} – {booking.check_out} · {booking.guests} guest{booking.guests > 1 ? "s" : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-ink">{fmt(booking.amount_minor)}</p>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${booking.status === "confirmed" ? "bg-success/10 text-success" : "bg-ink/5 text-ink-secondary"}`}>{booking.status}</span>
        </div>
      </div>
    </div>
  );
}

function ClaimsTab({ user }: { user: { name: string; email: string } }) {
  const [form, setForm] = useState({ claimId: "", reason: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.claimId.trim() || !form.reason.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.reason.length < 10) {
      setError("Reason must be at least 10 characters.");
      return;
    }
    setError(null);
    try {
      await submitDispute({ ...form, guestName: user.name, guestEmail: user.email });
      setSubmitted(true);
    } catch {
      setError("Failed to submit dispute. Please try again.");
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-medium text-ink">Damage claims</h1>

      {submitted ? (
        <div className="p-6 rounded-xl border border-success/20 bg-success/5 text-center">
          <svg className="w-10 h-10 text-success mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
          <p className="font-display text-lg font-medium text-ink mb-1">Dispute submitted</p>
          <p className="text-sm text-ink-secondary">Your dispute has been recorded. The admin team will review it and respond within 3 business days.</p>
          <button onClick={() => { setSubmitted(false); setForm({ claimId: "", reason: "" }); }} className="mt-4 text-sm font-medium text-primary hover:underline cursor-pointer">Submit another dispute</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-secondary">If a damage claim has been filed against your stay and you believe it's incorrect, you can submit a dispute here.</p>

          <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-hairline bg-card space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-mute">Claim ID</label>
              <input
                type="text"
                placeholder="e.g. C001"
                value={form.claimId}
                onChange={(e) => setForm({ ...form, claimId: e.target.value })}
                className="px-4 py-3 rounded-lg border border-line bg-card text-sm text-ink outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-mute">Reason for dispute</label>
              <textarea
                placeholder="Explain why you believe this claim is incorrect... (min 10 characters)"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={4}
                className="px-4 py-3 rounded-lg border border-line bg-card text-sm text-ink outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            {error && <p className="text-xs font-medium text-danger">{error}</p>}

            <button type="submit" className="w-full py-3 rounded-lg bg-brass text-soft text-sm font-semibold hover:bg-brass-dark transition-colors cursor-pointer">
              Submit dispute
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function ContactTab({ user }: { user: { name: string; email: string } }) {
  const [sent, setSent] = useState(false);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-medium text-ink">Contact us</h1>
      <p className="text-sm text-ink-secondary">Need help with a booking, have a question about your stay, or want to report an issue? Send us a message and we'll respond within 24 hours.</p>

      {sent ? (
        <div className="p-6 rounded-xl border border-success/20 bg-success/5 text-center">
          <svg className="w-10 h-10 text-success mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
          <p className="font-display text-lg font-medium text-ink mb-1">Message sent</p>
          <p className="text-sm text-ink-secondary">We'll get back to you at {user.email} within 24 hours.</p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-6 rounded-xl border border-hairline bg-card space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">Subject</label>
            <input
              type="text"
              placeholder="What can we help with?"
              className="px-4 py-3 rounded-lg border border-line bg-card text-sm text-ink outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">Message</label>
            <textarea
              placeholder="Describe your issue or question..."
              rows={4}
              className="px-4 py-3 rounded-lg border border-line bg-card text-sm text-ink outline-none focus:border-primary transition-colors resize-none"
              required
            />
          </div>
          <p className="text-[11px] text-ink-secondary">
            Replies will be sent to {user.email}. You can also reach us on WhatsApp at the number in your booking confirmation.
          </p>
          <button type="submit" className="w-full py-3 rounded-lg bg-brass text-soft text-sm font-semibold hover:bg-brass-dark transition-colors cursor-pointer">
            Send message
          </button>
        </form>
      )}
    </div>
  );
}

function SettingsTab({ user }: { user: { name: string; email: string } }) {
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-medium text-ink">Account settings</h1>

      <form onSubmit={handleSave} className="p-6 rounded-xl border border-hairline bg-card space-y-5">
        {/* Avatar upload */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full border-2 border-hairline bg-primary-bg overflow-hidden shrink-0 flex items-center justify-center">
            {photo ? (
              <img src={photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-2xl font-medium text-ink-secondary">{user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-ink mb-1">Profile photo</p>
            <p className="text-xs text-ink-secondary mb-2">JPG or PNG, max 5MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg border border-line text-sm font-medium text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer">
                Upload photo
              </button>
              {photo && (
                <button type="button" onClick={() => setPhoto(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-mute hover:text-danger transition-colors cursor-pointer">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <hr className="border-hairline" />

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">Full name</label>
            <input type="text" defaultValue={user.name} className="px-4 py-3 rounded-lg border border-line bg-card text-sm text-ink outline-none focus:border-primary transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute">Email</label>
            <input type="email" defaultValue={user.email} disabled className="px-4 py-3 rounded-lg border border-line bg-primary-bg text-sm text-ink-secondary outline-none cursor-not-allowed" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-mute">Phone (WhatsApp)</label>
          <input type="tel" placeholder="+234 801 234 5678" className="px-4 py-3 rounded-lg border border-line bg-card text-sm text-ink outline-none focus:border-primary transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-mute">Communication preference</label>
          <select className="px-4 py-3 rounded-lg border border-line bg-card text-sm text-ink outline-none focus:border-primary transition-colors cursor-pointer">
            <option>WhatsApp</option>
            <option>Email</option>
          </select>
        </div>

        {saved && <p className="text-xs font-medium text-success">Settings saved.</p>}

        <button type="submit" className="py-3 px-6 rounded-lg bg-brass text-soft text-sm font-semibold hover:bg-brass-dark transition-colors cursor-pointer">
          Save changes
        </button>
      </form>
    </div>
  );
}
