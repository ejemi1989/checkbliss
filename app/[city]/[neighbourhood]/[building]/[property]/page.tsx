import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPropertyBySlugPath } from "@/lib/data";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { buildMetaDescription } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import { PropertyClient } from "./property-client";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ city: string; neighbourhood: string; building: string; property: string }>;
}) {
  const { city, neighbourhood, building, property } = await params;
  const prop = await getPropertyBySlugPath({ city, neighbourhood, building, property });
  if (!prop) notFound();

  const formattedNightly = `$${Math.round(prop.nightly_rate_minor / 100).toLocaleString()}`;
  const formattedDeposit = `$${Math.round(prop.deposit_minor / 100).toLocaleString()}`;
  const formattedExtended = prop.extended_checkout_offered && prop.extended_checkout_price_minor
    ? `$${Math.round(prop.extended_checkout_price_minor / 100).toLocaleString()}`
    : null;
  const cityHref = `/${slugify(prop.city)}`;

  return (
    <PropertyClient
        property={{
          id: prop.id,
          name: prop.name,
          branded_name: prop.branded_name,
          building_name: prop.building_name,
          neighbourhood: prop.neighbourhood,
          city: prop.city,
          country: prop.country,
          description: prop.description,
          images: prop.images,
          cover_photo_url: prop.cover_photo_url ?? "",
          amenities: prop.amenities,
          route_note: prop.route_note,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms ?? prop.bedrooms,
          sleeps: prop.sleeps,
          nightly_rate_minor: prop.nightly_rate_minor,
          deposit_minor: prop.deposit_minor,
          extended_checkout_offered: prop.extended_checkout_offered,
          extended_checkout_price_minor: prop.extended_checkout_price_minor ?? 0,
          currency: prop.currency,
          slug: prop.slug,
        }}
        formattedNightly={formattedNightly}
        formattedDeposit={formattedDeposit}
        formattedExtended={formattedExtended}
        cityHref={cityHref}
      />
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
