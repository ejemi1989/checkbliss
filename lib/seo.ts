import type { SeedProperty } from "./seed-data";

export function bedroomWord(n: number): string {
  if (n === 1) return "one-bedroom";
  if (n === 2) return "two-bedroom";
  if (n === 3) return "three-bedroom";
  return `${n}-bedroom`;
}

function topAmenities(p: SeedProperty, limit: number): string[] {
  return p.amenities.slice(0, limit);
}

export function buildMetaDescription(p: SeedProperty): string {
  const top = topAmenities(p, 3);
  const amenityStr = top.length > 0 ? `Featuring ${top.join(", ")}. ` : "";
  const desc = `${p.branded_name}, a ${bedroomWord(p.bedrooms)} stay at ${p.building_name} in ` +
    `${p.neighbourhood}, ${p.city}. ${amenityStr}` +
    `Instant booking, verified by CheckinBliss.`;

  if (desc.length <= 155) return desc;

  const truncated = `${p.branded_name}, a ${bedroomWord(p.bedrooms)} stay at ${p.building_name} in ` +
    `${p.neighbourhood}, ${p.city}. Instant booking, verified by CheckinBliss.`;
  return truncated.length <= 155 ? truncated : truncated.slice(0, 152) + "...";
}

export function descriptiveLine(p: SeedProperty): string {
  return `A ${bedroomWord(p.bedrooms)} apartment at ${p.building_name}, ${p.neighbourhood}`;
}

export function formatPriceRange(nightlyRateMinor: number): string {
  const gbp = nightlyRateMinor / 100;
  return `£${gbp}`;
}

export type PropertyForLd = Pick<
  SeedProperty,
  "branded_name" | "building_name" | "neighbourhood" | "city" | "country" | "cover_photo_url" | "nightly_rate_minor" | "slug"
> & {
  neighbourhood_slug: string;
  building_slug: string;
};

export function buildPropertyJsonLd(p: PropertyForLd) {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: p.branded_name,
    containedInPlace: {
      "@type": "Place",
      name: p.building_name,
      address: {
        "@type": "PostalAddress",
        addressLocality: p.neighbourhood,
        addressRegion: p.city,
        addressCountry: p.country,
      },
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: p.neighbourhood,
      addressRegion: p.city,
      addressCountry: p.country,
    },
    image: p.cover_photo_url || undefined,
    priceRange: formatPriceRange(p.nightly_rate_minor),
    url: `https://checkinbliss.com/${p.city.toLowerCase()}/${p.neighbourhood_slug}/${p.building_slug}/${p.slug}`,
  };
}
