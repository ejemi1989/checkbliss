import { notFound } from "next/navigation";
import { getSeedProperties } from "@/lib/seed-data";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import Link from "next/link";
import { Footer } from "@/components/footer";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const all = getSeedProperties().filter((p) => p.status === "approved");
  const s = slug.toLowerCase();
  const prop = all.find((p) => p.slug === slug)
    ?? all.find((p) => p.id.toLowerCase() === s)
    ?? all.find((p) => p.id.toLowerCase().replace(/^[a-z]+/, "") === s)
    ?? all.find((p) => p.id.toLowerCase() === `pr${s.replace(/^[a-z]+/, "")}`);
  if (!prop) notFound();

  const nightlyLabel = formatMinor(prop.nightly_rate_minor, prop.currency as CurrencyCode);
  const depositLabel = formatMinor(prop.deposit_minor, prop.currency as CurrencyCode);
  const extendedLabel = prop.extended_checkout_price_minor
    ? formatMinor(prop.extended_checkout_price_minor, prop.currency as CurrencyCode)
    : null;

  return (
    <div className="min-h-screen bg-bone">
      {/* Nav */}
      <nav className="bg-white border-b border-hairline px-8 py-4 flex items-center justify-between max-sm:px-5">
        <Link href="/" className="font-sans text-xl font-bold tracking-tight text-ink no-underline">
          checkin<span className="text-brass">Bliss</span>
        </Link>
        <Link href="/login" className="text-xs font-medium text-ink-secondary hover:text-ink transition-colors">
          Sign in
        </Link>
      </nav>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <p className="font-sans text-xs text-ink-tertiary mb-6">
          <Link href="/" className="hover:text-ink transition-colors">Home</Link>
          {" / "}
          <Link href={`/?city=${prop.city}`} className="hover:text-ink transition-colors">{prop.city}</Link>
          {" / "}
          <span className="text-ink-secondary">{prop.name}</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          {/* Left column */}
          <div>
            {/* Gallery placeholder */}
            <div className="aspect-[16/10] rounded-[var(--radius-md)] bg-ink overflow-hidden mb-8">
              <div className="h-full w-full flex items-center justify-center text-white/20">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            </div>

            {/* Name + Location */}
            <div className="mb-8">
              <p className="font-sans text-xs font-semibold uppercase tracking-[2.5px] text-brass mb-2">
                {prop.neighbourhood}, {prop.city}
              </p>
              <h1 className="font-serif text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.1] tracking-tight text-ink mb-3">
                {prop.name}
              </h1>
              <div className="flex items-center gap-x-4 text-xs text-ink-secondary">
                <span>{prop.bedrooms} bedroom{prop.bedrooms > 1 ? "s" : ""}</span>
                <span>·</span>
                <span>Sleeps {prop.sleeps}</span>
                <span>·</span>
                <span className="text-[#00b67a] font-semibold">★★★★★ Trustpilot</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-10">
              <h2 className="font-serif text-xl font-semibold tracking-tight text-ink mb-3">About this apartment</h2>
              <p className="font-sans text-sm leading-relaxed text-ink-secondary">{prop.description}</p>
            </div>

            {/* Amenities */}
            <div className="mb-10">
              <h2 className="font-serif text-xl font-semibold tracking-tight text-ink mb-4">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {prop.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-x-2.5 p-3 rounded-xl bg-white border border-hairline">
                    <Check />
                    <span className="font-sans text-xs text-ink">{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Route note */}
            <div className="mb-10 p-5 rounded-[var(--radius-md)] bg-white border border-hairline">
              <h2 className="font-serif text-base font-semibold tracking-tight text-ink mb-1">Getting here</h2>
              <p className="font-sans text-xs leading-relaxed text-ink-secondary">{prop.route_note}</p>
            </div>

            {/* Checkout options */}
            <div className="mb-10">
              <h2 className="font-serif text-xl font-semibold tracking-tight text-ink mb-4">Checkout options</h2>
              <div className="space-y-3">
                <div className="p-4 rounded-[var(--radius-md)] bg-white border border-hairline flex items-center justify-between">
                  <div>
                    <p className="font-sans text-sm font-semibold text-ink">Standard checkout — 11:00</p>
                    <p className="font-sans text-xs text-ink-secondary mt-0.5">Included with every booking.</p>
                  </div>
                  <span className="font-sans text-xs font-semibold text-success">Included</span>
                </div>
                {prop.extended_checkout_offered && extendedLabel && (
                  <div className="p-4 rounded-[var(--radius-md)] bg-white border border-hairline flex items-center justify-between">
                    <div>
                      <p className="font-sans text-sm font-semibold text-ink">Extended checkout — 18:00</p>
                      <p className="font-sans text-xs text-ink-secondary mt-0.5">+{extendedLabel}. Request at least 48 hours before check-out.</p>
                    </div>
                    <span className="font-sans text-xs font-semibold text-ink">+{extendedLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — sticky booking panel */}
          <div>
            <div className="lg:sticky lg:top-8 bg-white rounded-[var(--radius-md)] border border-hairline p-6 shadow-sm">
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <span className="font-sans text-2xl font-bold tabular-nums text-ink">{nightlyLabel}</span>
                  <span className="font-sans text-xs text-ink-secondary"> / night</span>
                </div>
                <span className="text-[#00b67a] text-sm font-semibold">★★★★★</span>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-secondary">Deposit hold</span>
                  <span className="font-semibold text-ink">{depositLabel}</span>
                </div>
                <p className="font-sans text-[11px] leading-relaxed text-ink-tertiary">
                  Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout.
                </p>
              </div>

              <Link
                href={`/book/${prop.slug}`}
                className="block w-full py-3.5 rounded-full bg-brass text-white text-sm font-semibold text-center no-underline transition-all hover:bg-brass-dark hover:-translate-y-px"
              >
                Reserve instantly
              </Link>

              <p className="font-sans text-[11px] leading-relaxed text-ink-tertiary text-center mt-4">
                No host approval. Instant confirmation. Book in GBP, USD, or EUR.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brass shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
