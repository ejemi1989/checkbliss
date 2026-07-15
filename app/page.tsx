import type { Metadata } from "next";
import { searchPropertiesAsync } from "@/lib/data";
import { HomePageClient } from "./client";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    alternates: { canonical: "/" },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ where?: string; in?: string; out?: string }>;
}) {
  const { where, in: checkIn, out: checkOut } = await searchParams;
  const properties = await searchPropertiesAsync({ where, checkIn, checkOut });
  const hasSearch = !!(where || checkIn || checkOut);

  return <HomePageClient properties={properties} hasSearch={hasSearch} />;
}
