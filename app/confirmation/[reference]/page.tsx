import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { getSeedProperties } from "@/lib/seed-data";
import Link from "next/link";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  let booking: {
    reference: string;
    reservations: { property_name: string; check_in: string; check_out: string; total_minor: number; deposit_minor: number; checkout_time: string | null; status: string }[];
    charge_total_minor: number;
    deposit_hold_minor: number;
    currency: string;
  };

  const props = getSeedProperties();
  booking = {
    reference,
    reservations: [
      {
        property_name: props[0]?.name ?? "Your stay",
        check_in: "2026-09-15",
        check_out: "2026-09-19",
        total_minor: 96000,
        deposit_minor: 10000,
        checkout_time: "18:00",
        status: "confirmed",
      },
    ],
    charge_total_minor: 96000,
    deposit_hold_minor: 10000,
    currency: "GBP",
  };

  const chargeLabel = formatMinor(booking.charge_total_minor, booking.currency as CurrencyCode);
  const depositLabel = formatMinor(booking.deposit_hold_minor, booking.currency as CurrencyCode);

  return (
    <div className="min-h-screen bg-bone">
      {/* Nav */}
      <nav className="bg-white border-b border-hairline px-8 py-4 flex items-center justify-between max-sm:px-5">
        <Link href="/" className="no-underline">
          <img src="/assets/images/logo/logo-wrd.png" alt="CheckinBliss" className="h-7 w-auto" />
        </Link>
      </nav>

      <div className="mx-auto max-w-[640px] px-4 sm:px-6 lg:px-8 py-12">
        {/* Confirmation header */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="font-sans text-xs font-semibold uppercase tracking-[2.5px] text-brass mb-2">Booking confirmed</p>
          <h1 className="font-serif text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] tracking-tight text-ink mb-2">
            Your stay is booked.
          </h1>
          <p className="font-sans text-sm text-ink-secondary">
            Reference: <span className="font-mono font-semibold text-ink">{booking.reference}</span>
          </p>
        </div>

        {/* Per-stay summaries */}
        <div className="space-y-3 mb-8">
          {booking.reservations.map((r, i) => {
            const totalLabel = formatMinor(r.total_minor, booking.currency as CurrencyCode);
            return (
              <div key={i} className="p-5 rounded-[var(--radius-md)] bg-white border border-hairline">
                <p className="font-serif text-base font-semibold text-ink mb-1">{r.property_name}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary mb-3">
                  <span>{r.check_in} → {r.check_out}</span>
                  <span>·</span>
                  <span>Checkout: {r.checkout_time ?? "11:00"}</span>
                  <span>·</span>
                  <span className="font-semibold text-success capitalize">{r.status}</span>
                </div>
                <p className="font-sans text-sm font-semibold tabular-nums text-ink">{totalLabel}</p>
              </div>
            );
          })}
        </div>

        {/* Payment summary */}
        <div className="p-5 rounded-[var(--radius-md)] bg-white border border-hairline mb-6">
          <h2 className="font-serif text-base font-semibold text-ink mb-4">Payment summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-secondary">Total charged</span>
              <span className="font-bold tabular-nums text-ink">{chargeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Deposit hold</span>
              <span className="font-semibold text-ink">{depositLabel}</span>
            </div>
            <p className="font-sans text-[11px] leading-relaxed text-ink-tertiary pt-2 border-t border-hairline">
              Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout. The owner has been notified.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex gap-x-3">
            <Link
              href="/"
              className="flex-1 py-3 rounded-full border border-hairline text-sm font-medium text-ink-secondary text-center no-underline hover:bg-bone transition-colors"
            >
              Browse more stays
            </Link>
            <Link
              href="/login"
              className="flex-1 py-3 rounded-full bg-brass text-white text-sm font-semibold text-center no-underline hover:bg-brass-dark transition-all"
            >
              View dashboard
            </Link>
          </div>

          {/* Add to calendar */}
          {booking.reservations.length > 0 && (
            <div className="text-center">
              <a
                href={`data:text/calendar;charset=utf-8,${encodeURIComponent(
                  booking.reservations.map((r) => {
                    const start = r.check_in.replace(/-/g, "");
                    const end = r.check_out.replace(/-/g, "");
                    return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CheckinBliss//Calendar//EN\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:CheckinBliss — ${r.property_name}\nDESCRIPTION:Booking ref: ${booking.reference}\\nCheck-in: ${r.check_in}\\nCheck-out: ${r.check_out}\\n\\nVerified by CheckinBliss.\\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`;
                  }).join("\n")
                )}`}
                download={`checkinbliss-${booking.reference}.ics`}
                className="inline-flex items-center gap-x-2 text-xs font-medium text-brass hover:text-brass-dark transition-colors no-underline"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Add to calendar
              </a>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
