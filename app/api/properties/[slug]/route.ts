import { NextRequest, NextResponse } from "next/server";
import { supabaseConfigured, createBrowser } from "@/lib/supabase";
import { getSeedProperties, type SeedProperty } from "@/lib/seed-data";

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
  const { data, error } = await db
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json(formatDetail(data as unknown as SeedProperty));
}

function formatDetail(p: SeedProperty) {
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
