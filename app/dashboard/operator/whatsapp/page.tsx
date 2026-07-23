import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { getOwnersForCity, getOperatorBookings } from "@/lib/data";
import { getSeedProperties, getSeedReservations, getSeedBlocks } from "@/lib/seed-data";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { WhatsAppOwnerList } from "./whatsapp-client";

export const metadata: Metadata = { title: "Operator — WhatsApp", robots: { index: false, follow: false } };

function getAvailabilityForProperties(assignedCities: string[]) {
  const properties = getSeedProperties().filter(
    (p) => p.status === "approved" && assignedCities.includes(p.city),
  );
  const reservations = getSeedReservations();
  const blocks = getSeedBlocks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return properties.map((p) => {
    const booked = reservations
      .filter((r) => r.property_id === p.id && r.status !== "cancelled" && new Date(r.check_out) >= today)
      .map((r) => ({ checkIn: r.check_in, checkOut: r.check_out, status: r.status }))
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    const blocked = blocks
      .filter((b) => b.property_id === p.id && new Date(b.ends) >= today)
      .map((b) => ({ starts: b.starts, ends: b.ends, source: b.source }))
      .sort((a, b) => a.starts.localeCompare(b.starts));

    const nightsBooked = booked.reduce((sum, r) => {
      const diff = Math.ceil((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / (1000 * 60 * 60 * 24));
      return sum + diff;
    }, 0);

    return {
      id: p.id,
      name: p.name,
      city: p.city,
      neighbourhood: p.neighbourhood,
      nightlyRate: p.nightly_rate_minor,
      currency: p.currency as CurrencyCode,
      sleeps: p.sleeps,
      booked,
      blocked,
      nightsBooked,
    };
  });
}

export default async function OperatorWhatsAppPage() {
  const user = await getSession();
  const cities = user?.assignedCities ?? [];
  const owners = getOwnersForCity(cities);
  const properties = getAvailabilityForProperties(cities);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">WhatsApp & Owner Communication</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Follow up with property owners in {cities.length > 0 ? cities.join(" & ") : "your assigned cities"}.
          Automated messages are sent when bookings are confirmed and inspections are due.
        </p>
      </div>

      {/* Owner contacts */}
      <WhatsAppOwnerList owners={owners} />

      {/* Property availability */}
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-1">Property availability</h2>
        <p className="text-xs text-ink-secondary mb-5">Which dates are booked, blocked, or available for each property. Share this with owners to keep them informed.</p>
        <div className="space-y-4">
          {properties.map((p) => (
            <div key={p.id} className="p-4 rounded-xl border border-hairline">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-sans text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-ink-secondary">{p.neighbourhood}, {p.city} · Sleeps {p.sleeps} · {formatMinor(p.nightlyRate, p.currency)}/night</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${p.booked.length > 0 ? "bg-brass/15 text-brass-dark" : "bg-success/10 text-success"}`}>
                  {p.booked.length > 0 ? `${p.nightsBooked} nights booked` : "Open"}
                </span>
              </div>

              {p.booked.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-mute mb-1.5">Upcoming bookings</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.booked.map((b, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-lagoon/10 text-lagoon-dark">
                        {b.checkIn} → {b.checkOut}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {p.blocked.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-mute mb-1.5">Blocked dates</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.blocked.map((b, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-danger/8 text-danger">
                        {b.starts} → {b.ends} ({b.source})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {p.booked.length === 0 && p.blocked.length === 0 && (
                <p className="text-xs text-success font-medium">All dates open — no upcoming bookings or blocks.</p>
              )}
            </div>
          ))}
          {properties.length === 0 && (
            <p className="text-sm text-mute py-4 text-center">No properties assigned to your cities yet.</p>
          )}
        </div>
      </div>

      {/* Automated messages */}
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-1">Automated messages</h2>
        <p className="text-xs text-ink-secondary mb-5">These WhatsApp templates are sent automatically to owners. No manual action required.</p>
        <div className="space-y-3">
          {[
            { title: "New booking confirmed", desc: "Sent when a guest books. Includes guest name, dates, unit, and total amount.", icon: "calendar", timing: "Immediate" },
            { title: "Pre-checkout reminder", desc: "Sent 24 hours before guest checkout. Reminds owner to prepare for operator inspection.", icon: "clock", timing: "24h before checkout" },
            { title: "Inspection result — CLEAN", desc: "Deposit released. Owner notified that apartment is in good condition.", icon: "check", timing: "After inspection" },
            { title: "Inspection result — DAMAGE", desc: "Claim filed with photographic evidence and itemised estimate. Owner has 7 days to dispute.", icon: "alert", timing: "After inspection" },
            { title: "Monthly verification due", desc: "Property is due for re-verification inspection. Includes scheduled date.", icon: "refresh", timing: "Monthly" },
            { title: "Payout processed", desc: "Earnings for completed bookings have been transferred. Includes amount and reference.", icon: "bank", timing: "Weekly" },
          ].map((m) => (
            <div key={m.title} className="flex items-start justify-between p-3.5 rounded-lg bg-primary-bg gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{m.title}</p>
                <p className="text-xs text-ink-secondary mt-0.5">{m.desc}</p>
              </div>
              <span className="text-[10px] font-semibold text-mute shrink-0 px-2 py-0.5 rounded-md bg-white border border-hairline">{m.timing}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar sync */}
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-1">Calendar sync</h2>
        <p className="text-xs text-ink-secondary mb-5">Share these iCal links with owners so they can sync bookings to their personal calendar (Google Calendar, Apple Calendar, Outlook).</p>
        <div className="space-y-3">
          {owners.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 rounded-xl border border-hairline bg-primary-bg">
              <div>
                <p className="text-sm font-medium text-ink">{o.name}</p>
                <p className="text-xs text-ink-secondary mt-0.5">{o.properties_count ?? 0} properties · {o.whatsapp ?? "No phone"}</p>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(`https://checkinbliss.com/api/calendar/${o.id}`)}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-hairline text-ink-secondary hover:bg-white hover:border-green-soft transition-colors cursor-pointer bg-white"
              >
                Copy sync link
              </button>
            </div>
          ))}
          {owners.length === 0 && (
            <p className="text-sm text-mute py-4 text-center">No owners in your assigned cities yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
