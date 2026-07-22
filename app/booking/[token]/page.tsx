import { getSeedReservations, getSeedProperties } from "@/lib/seed-data";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import Link from "next/link";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

function parseToken(token: string): { email: string; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [email, expires] = decoded.split("|");
    const expiresAt = parseInt(expires, 10);
    if (!email || !expiresAt || Date.now() > expiresAt) return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = parseToken(token);

  if (!session) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="font-serif text-2xl font-bold text-ink mb-2">Link expired</h1>
          <p className="text-sm text-ink-secondary mb-6">Your booking link has expired. Request a new one to view your stay.</p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-brass px-8 py-3 text-sm font-semibold text-white no-underline hover:bg-brass-dark"
          >
            Sign in to view bookings
          </Link>
        </div>
      </div>
    );
  }

  let reservations: {
    id: string;
    property_name: string;
    property_id: string;
    check_in: string;
    check_out: string;
    nights: number;
    total_minor: number;
    deposit_minor: number;
    status: string;
    checkout_time: string | null;
    deposit_status: "held" | "released" | "claimed" | "expired";
  }[] = [];

  if (!supabaseAdminConfigured) {
    const seedReservations = getSeedReservations();
    const properties = getSeedProperties();
    reservations = seedReservations.map((r) => {
      const prop = properties.find((p) => p.id === r.property_id);
      const nights = Math.round(
        (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        id: r.id,
        property_name: prop?.name ?? "Your stay",
        property_id: r.property_id,
        check_in: r.check_in,
        check_out: r.check_out,
        nights,
        total_minor: (prop?.nightly_rate_minor ?? 0) * nights,
        deposit_minor: prop?.deposit_minor ?? 10000,
        status: r.status,
        checkout_time: "11:00",
        deposit_status: "held" as const,
      };
    });
  } else {
    const db = createAdmin();
    const { data: rows } = await db
      .from("reservations")
      .select("id, property_name, property_id, check_in, check_out, total_minor, status, confirmed_checkout_time")
      .eq("guest_email", session.email.toLowerCase())
      .neq("status", "cancelled");

    if (rows) {
      for (const r of rows) {
        const { data: holds } = await db
          .from("deposit_holds")
          .select("status, amount_minor")
          .eq("reservation_id", r.id)
          .single();

        reservations.push({
          id: r.id,
          property_name: r.property_name,
          property_id: r.property_id,
          check_in: r.check_in,
          check_out: r.check_out,
          nights: Math.round(
            (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60 * 24),
          ),
          total_minor: r.total_minor,
          deposit_minor: holds?.amount_minor ?? 0,
          status: r.status,
          checkout_time: r.confirmed_checkout_time ?? "11:00",
          deposit_status: (holds?.status as "held" | "released" | "claimed" | "expired") ?? "held",
        });
      }
    }
  }

  if (reservations.length === 0) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="font-serif text-2xl font-bold text-ink mb-2">No bookings found</h1>
          <p className="text-sm text-ink-secondary mb-6">We couldn&apos;t find any active bookings for {session.email}.</p>
          <Link href="/" className="inline-block rounded-full bg-brass px-8 py-3 text-sm font-semibold text-white no-underline hover:bg-brass-dark">
            Browse stays
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone">
      <nav className="bg-white border-b border-hairline px-8 py-4 max-sm:px-5">
        <Link href="/" className="no-underline">
          <img src="/assets/images/logo/logo-wrd.png" alt="CheckinBliss" className="h-7 w-auto" />
        </Link>
      </nav>

      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-[clamp(24px,3vw,36px)] font-bold leading-tight tracking-tight text-ink mb-1">
            Your bookings
          </h1>
          <p className="font-sans text-xs text-ink-secondary">{session.email}</p>
        </div>

        <div className="space-y-5">
          {reservations.map((r, i) => (
            <div key={i} className="bg-white rounded-[var(--radius-md)] border border-hairline p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-serif text-base font-semibold text-ink">{r.property_name}</p>
                  <p className="font-sans text-xs text-ink-secondary mt-0.5">
                    {r.check_in} → {r.check_out} · {r.nights} night{r.nights > 1 ? "s" : ""} · Checkout {r.checkout_time}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  r.status === "confirmed" ? "bg-success/10 text-success" : "bg-primary-bg text-primary"
                }`}>
                  {r.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Total paid</span>
                  <span className="font-semibold tabular-nums text-ink">{formatMinor(r.total_minor, "GBP" as CurrencyCode)}</span>
                </div>

                {/* Deposit status */}
                <div className="flex justify-between items-center">
                  <span className="text-ink-secondary">Deposit hold</span>
                  <div className="flex items-center gap-x-2">
                    <span className="font-semibold tabular-nums text-ink">{formatMinor(r.deposit_minor, "GBP" as CurrencyCode)}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      r.deposit_status === "held" ? "bg-warning/10 text-warning" :
                      r.deposit_status === "released" ? "bg-success/10 text-success" :
                      r.deposit_status === "claimed" ? "bg-danger/10 text-danger" :
                      "bg-ink-secondary/10 text-ink-secondary"
                    }`}>
                      {r.deposit_status}
                    </span>
                  </div>
                </div>
              </div>

              {r.deposit_status === "held" && (
                <p className="font-sans text-[11px] leading-relaxed text-ink-tertiary mt-3 pt-3 border-t border-hairline">
                  Pre-authorised — not a charge. Released within 7 days of a clean checkout. If your deposit hasn&apos;t been released 7 days after check-out, contact us.
                </p>
              )}

              {r.deposit_status === "claimed" && (
                <div className="mt-3 pt-3 border-t border-hairline">
                  <p className="font-sans text-xs text-danger font-medium mb-2">A claim has been filed against your deposit.</p>
                  <Link
                    href="/login"
                    className="inline-block text-xs font-semibold text-brass hover:text-brass-dark transition-colors"
                  >
                    View claim details & dispute →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="font-sans text-xs text-ink-secondary hover:text-ink transition-colors">
            ← Browse more stays
          </Link>
        </div>
      </div>
    </div>
  );
}
