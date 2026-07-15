import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSeedProperties } from "@/lib/seed-data";
import { BookingFlow } from "./client";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prop = getSeedProperties().find((p) => p.slug === slug && p.status === "approved");
  if (!prop) notFound();

  return (
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
    />
  );
}
