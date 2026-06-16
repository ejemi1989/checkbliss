import { NextRequest, NextResponse } from "next/server";
import { supabaseConfigured, createBrowser } from "@/lib/supabase";
import { getSeedProperties } from "@/lib/seed-data";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");

  if (!supabaseConfigured) {
    let props = getSeedProperties().filter((p) => p.status === "approved");
    if (city) {
      props = props.filter((p) => p.city.toLowerCase() === city.toLowerCase());
    }
    return NextResponse.json(
      props.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        city: p.city,
        neighbourhood: p.neighbourhood,
        bedrooms: p.bedrooms,
        sleeps: p.sleeps,
        nightly_rate_minor: p.nightly_rate_minor,
        currency: p.currency,
        is_featured: p.is_featured,
      })),
    );
  }

  const db = createBrowser();
  let query = db
    .from("properties")
    .select("id, slug, name, city, neighbourhood, bedrooms, sleeps, nightly_rate_minor, currency, is_featured")
    .eq("status", "approved");

  if (city) {
    query = query.ilike("city", city);
  }

  const { data } = await query;
  return NextResponse.json(data ?? []);
}
