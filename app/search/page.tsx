import type { Metadata } from "next";
import { searchPropertiesAsync } from "@/lib/data";
import { SearchResultsClient } from "./client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ where?: string; in?: string; out?: string }>;
}): Promise<Metadata> {
  const { where } = await searchParams;
  const displayWhere = where || "Lagos";
  const title = `Verified stays in ${displayWhere} — CheckinBliss`;
  return {
    title,
    description: `Browse hand-selected, verified apartments in ${displayWhere}, Nigeria. Every property inspected in person. Instant booking — no host approval needed.`,
    alternates: { canonical: "/search" },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ where?: string; in?: string; out?: string; currency?: string }>;
}) {
  const { where, in: checkIn, out: checkOut, currency } = await searchParams;
  const properties = await searchPropertiesAsync({ where, checkIn, checkOut });
  const activeWhere = where || (checkIn && checkOut ? "Lagos" : "");

  return (
    <SearchResultsClient
      properties={properties}
      activeWhere={activeWhere || ""}
      checkIn={checkIn || ""}
      checkOut={checkOut || ""}
      displayCurrency={(currency === "USD" || currency === "EUR") ? currency : "GBP"}
    />
  );
}
