import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPropertyBySlugPath } from "@/lib/data";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { buildMetaDescription, descriptiveLine, buildPropertyJsonLd } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import Link from "next/link";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ city: string; neighbourhood: string; building: string; property: string }>;
}) {
  const { city, neighbourhood, building, property } = await params;
  const prop = await getPropertyBySlugPath({ city, neighbourhood, building, property });
  if (!prop) notFound();

  const nightlyLabel = formatMinor(prop.nightly_rate_minor, prop.currency as CurrencyCode);
  const depositLabel = formatMinor(prop.deposit_minor, prop.currency as CurrencyCode);
  const extendedLabel = prop.extended_checkout_price_minor
    ? formatMinor(prop.extended_checkout_price_minor, prop.currency as CurrencyCode)
    : null;

  return (
    <div className="min-h-screen bg-bone">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildPropertyJsonLd({
              branded_name: prop.branded_name,
              building_name: prop.building_name,
              neighbourhood: prop.neighbourhood,
              city: prop.city,
              country: prop.country,
              cover_photo_url: prop.cover_photo_url,
              nightly_rate_minor: prop.nightly_rate_minor,
              slug: prop.slug,
              neighbourhood_slug: prop.neighbourhood_slug,
              building_slug: prop.building_slug,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "CheckinBliss", item: "https://checkinbliss.com" },
              { "@type": "ListItem", position: 2, name: prop.city, item: `https://checkinbliss.com/${slugify(prop.city)}` },
              { "@type": "ListItem", position: 3, name: prop.neighbourhood, item: `https://checkinbliss.com/${slugify(prop.city)}/${prop.neighbourhood_slug}` },
              { "@type": "ListItem", position: 4, name: prop.building_name, item: `https://checkinbliss.com/${slugify(prop.city)}/${prop.neighbourhood_slug}/${prop.building_slug}` },
              { "@type": "ListItem", position: 5, name: prop.branded_name },
            ],
          }),
        }}
      />

      <header className="bg-card border-b border-line sticky top-0 z-50">
        <div className="max-w-[1240px] mx-auto px-8 py-4 flex items-center gap-5 max-sm:px-5">
          <Link href="/" className="font-sans text-sm font-medium text-ink-secondary no-underline hover:text-green-soft transition-colors shrink-0">
            &#8592; Home
          </Link>
          <Link href="/" className="shrink-0 no-underline">
            <img src="/checkbliss%20logo.png" alt="CheckinBliss" className="h-6 w-auto" />
          </Link>
          <div className="ml-auto flex gap-3">
            <button className="w-9 h-9 rounded-full border border-line bg-card flex items-center justify-center cursor-pointer text-ink-secondary text-base hover:text-ink transition-colors" aria-label="Share">
              &#8599;
            </button>
            <button className="w-9 h-9 rounded-full border border-line bg-card flex items-center justify-center cursor-pointer text-ink-secondary text-base hover:text-ink transition-colors" aria-label="Save">
              &#9825;
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-8 py-7 max-sm:px-5">
        {/* Gallery */}
        {(() => {
          const imgs = prop.images.length >= 3
            ? prop.images
            : [prop.cover_photo_url, prop.images[0], prop.images[1], prop.images[2]].filter(Boolean) as string[];
          return (
            <div className="grid grid-cols-[2fr_1fr] gap-2 mb-10 max-sm:grid-cols-1">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={imgs[0]} alt={prop.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex flex-col gap-2 max-sm:flex-row max-sm:flex-wrap">
                <div className="relative aspect-[16/10] overflow-hidden flex-1">
                  <img src={imgs[1]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="relative aspect-[16/10] overflow-hidden flex-1">
                  <img src={imgs[2]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                </div>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-[1fr_360px] gap-16 mb-20 max-lg:grid-cols-1 max-lg:gap-10">
          <div className="min-w-0">
            <p className="font-display italic text-xl text-green-soft mb-1">
              {prop.building_name} · {prop.neighbourhood}
            </p>
            <h1 className="font-display text-[clamp(2rem,3.6vw,3.2rem)] font-medium leading-[1.08] text-ink mb-2">
              {prop.branded_name}
            </h1>
            <p className="font-sans text-[15px] text-ink-secondary mb-4">{descriptiveLine(prop)}</p>
            <p className="font-sans text-[15px] text-mute mb-5">
              {prop.city}, {prop.country} · &#9733; 4.9 · 24 reviews · <span className="text-green-soft font-semibold">&#10003; Verified</span>
            </p>

            <div className="flex gap-6 mb-7 flex-wrap">
              <div className="text-center">
                <div className="font-display text-[28px] font-medium text-ink leading-tight">{prop.bedrooms}</div>
                <div className="font-sans text-[13px] text-mute">Bedroom{prop.bedrooms > 1 ? "s" : ""}</div>
              </div>
              <div className="text-center">
                <div className="font-display text-[28px] font-medium text-ink leading-tight">{prop.bedrooms}</div>
                <div className="font-sans text-[13px] text-mute">Bathroom{prop.bedrooms > 1 ? "s" : ""}</div>
              </div>
              <div className="text-center">
                <div className="font-display text-[28px] font-medium text-ink leading-tight">{prop.sleeps}</div>
                <div className="font-sans text-[13px] text-mute">Guest{prop.sleeps > 1 ? "s" : ""}</div>
              </div>
              <div className="text-center">
                <div className="font-display text-[28px] font-medium text-ink leading-tight">110</div>
                <div className="font-sans text-[13px] text-mute">sq metres</div>
              </div>
            </div>

            <hr className="border-none border-t border-line my-8" />

            <h2 className="font-display text-2xl font-medium text-ink mb-4">About this apartment</h2>
            <p className="font-sans text-[15px] leading-relaxed text-ink-secondary max-w-[56ch] mb-5">{prop.description}</p>

            <hr className="border-none border-t border-line my-8" />

            <h2 className="font-display text-2xl font-medium text-ink mb-4">Amenities</h2>
            <div className="grid grid-cols-2 gap-3 mb-4 max-sm:grid-cols-1">
              {prop.amenities.map((a) => (
                <div key={a} className="flex items-center gap-3 text-sm text-ink-secondary py-2">
                  <svg className="w-5 h-5 text-green-soft shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {a}
                </div>
              ))}
            </div>

            <hr className="border-none border-t border-line my-8" />

            <h2 className="font-display text-2xl font-medium text-ink mb-4">Getting here</h2>
            <p className="font-sans text-[15px] leading-relaxed text-ink-secondary">{prop.route_note}</p>
          </div>

          <aside className="relative">
            <div className="sticky top-[80px] p-7 bg-card rounded-[var(--radius-lg)] border border-line max-lg:static">
              <div className="font-display text-[22px] font-medium text-ink mb-1">
                {nightlyLabel} <span className="font-sans text-base font-normal text-ink-secondary">/ night</span>
              </div>
              <div className="font-sans text-sm text-mute mb-5">
                &#9733; <strong className="text-ink">4.9</strong> · 24 reviews
              </div>

              <Link
                href={`/book/${prop.slug}`}
                className="block w-full py-4 bg-brass text-soft font-sans text-base font-semibold border-none cursor-pointer text-center no-underline transition-colors hover:bg-brass-dark rounded-sm"
              >
                Reserve
              </Link>

              <p className="font-sans text-xs text-mute text-center mt-4">
                You won&rsquo;t be charged yet. Free cancellation up to 48 hours before check-in.
              </p>

              <div className="mt-5 font-sans text-[13px] text-mute">
                <div className="flex justify-between py-1"><span>Deposit hold</span><span className="font-semibold text-ink">{depositLabel}</span></div>
                <p className="font-sans text-[11px] leading-relaxed text-mute mt-1">
                  Pre-authorised — not a charge. Released within 7 days of a clean checkout.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; neighbourhood: string; building: string; property: string }>;
}): Promise<Metadata> {
  const { city, neighbourhood, building, property } = await params;
  const p = await getPropertyBySlugPath({ city, neighbourhood, building, property });
  if (!p) return {};

  const shortNeighbourhood = p.neighbourhood.split(",")[0].trim();
  const href = `/${slugify(p.city)}/${p.neighbourhood_slug}/${p.building_slug}/${p.slug}`;

  return {
    title: `${p.branded_name} — ${p.building_name}, ${shortNeighbourhood} | CheckinBliss`,
    description: buildMetaDescription(p),
    alternates: { canonical: href },
    openGraph: {
      title: `${p.branded_name} — ${p.building_name}, ${shortNeighbourhood} | CheckinBliss`,
      description: buildMetaDescription(p),
      url: `https://checkinbliss.com${href}`,
      siteName: "CheckinBliss",
      locale: "en_GB",
      type: "website",
    },
  };
}
