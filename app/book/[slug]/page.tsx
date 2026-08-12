import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSeedProperties } from "@/lib/seed-data";
import { Footer } from "@/components/footer";
import { BookingFlow } from "./client";

export const dynamic = "force-dynamic";

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
  const { slug } = await params;
  const sp = await searchParams;
  const prop = getSeedProperties().find((p) => p.slug === slug && p.status === "approved");
  if (!prop) notFound();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  today.setUTCDate(today.getUTCDate() + 14);
  const minDateStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

  return (
    <>
      <BookingFlow
        key={prop.id}
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
        minDate={minDateStr}
      />
      <Footer />
    </>
  );
}
