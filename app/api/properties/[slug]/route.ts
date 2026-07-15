import { NextRequest, NextResponse } from "next/server";
import { supabaseConfigured, createBrowser } from "@/lib/supabase";
import { getSeedProperties } from "@/lib/seed-data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!supabaseConfigured) {
    const prop = getSeedProperties().find((p) => p.slug === slug && p.status === "approved");
    if (!prop) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return NextResponse.json(formatDetail(prop));
  }

  const db = createBrowser();
  const { data } = await db
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (data) {
    const row = data as Record<string, unknown>;
    return NextResponse.json(formatDetail({
      id: row.id as string,
      slug: row.slug as string,
      name: (row.branded_name as string) || (row.name as string) || "",
      branded_name: (row.branded_name as string) || (row.name as string) || "",
      building_name: (row.building_name as string) || "",
      city: row.city as string,
      neighbourhood: row.neighbourhood as string,
      neighbourhood_slug: (row.neighbourhood_slug as string) || "",
      building_slug: (row.building_slug as string) || "",
      country: (row.country as string) || "Nigeria",
      description: row.description as string,
      amenities: (row.amenities as string[]) || [],
      route_note: (row.route_note as string) || "",
      bedrooms: row.bedrooms as number,
      sleeps: (row.sleeps as number) || (row.max_guests as number) || 2,
      nightly_rate_minor: (row.nightly_rate_minor as number) || (row.nightly_price_minor as number) || 0,
      deposit_minor: (row.deposit_minor as number) || 0,
      currency: (row.currency as string) || "GBP",
      extended_checkout_offered: (row.extended_checkout_offered as boolean) || false,
      extended_checkout_price_minor: (row.extended_checkout_price_minor as number) || null,
      is_featured: (row.is_featured as boolean) || false,
      status: row.status as string,
      images: (row.images as string[]) || [],
      cover_photo_url: (row.cover_photo_url as string) || null,
    }));
  }

  // Fall back to mock data
  const prop = getSeedProperties().find((p) => p.slug === slug && p.status === "approved");
  if (!prop) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  return NextResponse.json(formatDetail(prop));
}

function formatDetail(p: {
  name: string;
  id: string;
  slug: string;
  city: string;
  neighbourhood: string;
  description: string;
  amenities: string[];
  route_note: string;
  bedrooms: number;
  sleeps: number;
  nightly_rate_minor: number;
  deposit_minor: number;
  currency: string;
  extended_checkout_offered: boolean;
  extended_checkout_price_minor: number | null;
  branded_name?: string;
  building_name?: string;
  neighbourhood_slug?: string;
  building_slug?: string;
  country?: string;
  is_featured?: boolean;
  status?: string;
  images?: string[];
  cover_photo_url?: string | null;
}) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    city: p.city,
    neighbourhood: p.neighbourhood,
    description: p.description,
    amenities: p.amenities,
    route_note: p.route_note,
    bedrooms: p.bedrooms,
    sleeps: p.sleeps,
    nightly_rate_minor: p.nightly_rate_minor,
    deposit_minor: p.deposit_minor,
    currency: p.currency,
    extended_checkout: {
      offered: p.extended_checkout_offered,
      price_minor: p.extended_checkout_price_minor,
      note: "Extended checkout to 18:00. Request at least 48 hours before check-out.",
    },
    deposit: {
      hold_minor: p.deposit_minor,
      note: "Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout.",
    },
  };
}
