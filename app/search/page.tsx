import type { Metadata } from "next";
import { searchPropertiesAsync } from "@/lib/data";
import { SearchResultsClient } from "./client";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    where?: string;
    in?: string;
    out?: string;
    amenities?: string;
    guests?: string;
    rooms?: string;
  }>;
}): Promise<Metadata> {
  const { where, amenities, guests, rooms } = await searchParams;
  const displayWhere = where || "Lagos";
  const amenityText = amenities ? ` with ${amenities}` : "";
  const groupText =
    guests && rooms ? ` for ${guests} guests · ${rooms} rooms` :
    guests ? ` for ${guests} guests` :
    rooms ? ` with ${rooms} bedrooms` : "";
  const title = `Verified stays in ${displayWhere}${groupText}${amenityText} — CheckinBliss`;
  return {
    title,
    description: `Browse hand-selected, verified apartments in ${displayWhere}, Nigeria${amenityText}. Every property inspected in person. Instant booking — no host approval needed.`,
    alternates: { canonical: "/search" },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    where?: string;
    in?: string;
    out?: string;
    currency?: string;
    amenities?: string;
    guests?: string;
    rooms?: string;
  }>;
}) {
  const { where, in: checkIn, out: checkOut, currency, amenities, guests, rooms } =
    await searchParams;
  const properties = await searchPropertiesAsync({
    where,
    checkIn,
    checkOut,
    amenities,
    guests: parsePositiveInt(guests),
    rooms: parsePositiveInt(rooms),
  });
  const activeWhere = where || (checkIn && checkOut ? "Lagos" : "");

  return (
    <SearchResultsClient
      properties={properties}
      activeWhere={activeWhere || ""}
      checkIn={checkIn || ""}
      checkOut={checkOut || ""}
      displayCurrency={(currency === "USD" || currency === "EUR") ? currency : "GBP"}
      activeAmenity={amenities || ""}
      activeGuests={parsePositiveInt(guests)}
      activeRooms={parsePositiveInt(rooms)}
    />
  );
}
