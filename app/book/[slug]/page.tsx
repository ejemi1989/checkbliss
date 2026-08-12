import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSeedProperties } from "@/lib/seed-data";
import { Footer } from "@/components/footer";

const BookingFlow = dynamic(() => import("./client").then((m) => ({ default: m.BookingFlow })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-bone">
      <div className="bg-card border-b border-hairline sticky top-0 z-50">
        <div className="max-w-[1240px] mx-auto px-8 py-4 flex items-center gap-5">
          <span className="font-sans text-sm text-ink-secondary">← Back to property</span>
          <span className="font-display text-xl font-medium text-ink">CheckinBliss</span>
        </div>
      </div>
      <div className="max-w-[1240px] mx-auto px-8 py-10">
        <div className="grid grid-cols-[1fr_400px] gap-16 items-start">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border-[1.5px] border-hairline flex items-center justify-center text-[13px] text-mute">{n}</div>
                  <span className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">{["Dates", "Guest info", "Payment"][n - 1]}</span>
                  {n < 3 && <div className="w-6 h-px bg-hairline" />}
                </div>
              ))}
            </div>
            <div className="h-6 bg-hairline rounded w-1/3 animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-[46px] bg-hairline rounded-[var(--radius-md)] animate-pulse" />
              <div className="h-[46px] bg-hairline rounded-[var(--radius-md)] animate-pulse" />
            </div>
            <div className="h-[46px] bg-hairline rounded-[var(--radius-md)] animate-pulse w-1/4" />
          </div>
          <div className="p-7 rounded-[var(--radius-lg)] border border-hairline space-y-4">
            <div className="h-5 bg-hairline rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-hairline rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-hairline rounded w-1/3 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  ),
});

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  await connection();
  const { slug } = await params;
  const sp = await searchParams;
  const prop = getSeedProperties().find((p) => p.slug === slug && p.status === "approved");
  if (!prop) notFound();

  return (
    <>
      <BookingFlow
        propertyId={prop.id}
        propertySlug={prop.slug}
        propertyName={prop.name}
        city={prop.city}
        neighbourhood={prop.neighbourhood}
        neighbourhoodSlug={prop.neighbourhood_slug}
        buildingSlug={prop.building_slug}
        nightlyRateMinor={prop.nightly_rate_minor}
        depositMinor={prop.deposit_minor}
        currency={prop.currency}
        extendedCheckoutOffered={prop.extended_checkout_offered}
        extendedCheckoutPriceMinor={prop.extended_checkout_price_minor}
        sleeps={prop.sleeps}
        coverPhotoUrl={prop.cover_photo_url ?? prop.images?.[0] ?? null}
        initialStep={sp.step ?? "dates"}
      />
      <Footer />
    </>
  );
}
