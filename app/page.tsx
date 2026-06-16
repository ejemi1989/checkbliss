import { searchProperties } from "@/lib/data";
import { HomePageClient } from "./client";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ where?: string; in?: string; out?: string }>;
}) {
  const { where, in: checkIn, out: checkOut } = await searchParams;
  const properties = searchProperties({ where, checkIn, checkOut });
  const hasSearch = !!(where || checkIn || checkOut);

  return <HomePageClient properties={properties} hasSearch={hasSearch} />;
}
