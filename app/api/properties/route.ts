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
        name: p.branded_name,
        branded_name: p.branded_name,
        building_name: p.building_name,
        city: p.city,
        neighbourhood: p.neighbourhood,
        neighbourhood_slug: p.neighbourhood_slug,
        building_slug: p.building_slug,
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
    .select("id, slug, branded_name, building_name, city, neighbourhood, neighbourhood_slug, building_slug, bedrooms, sleeps, nightly_rate_minor, currency, is_featured")
    .eq("status", "approved");

  if (city) {
    query = query.ilike("city", city);
  }

  const { data } = await query;
  if (data && data.length > 0) {
    return NextResponse.json(data);
  }

  // Fall back to mock data if Supabase returns 0 (no data yet)
  let props = getSeedProperties().filter((p) => p.status === "approved");
  if (city) {
    props = props.filter((p) => p.city.toLowerCase() === city.toLowerCase());
  }
  return NextResponse.json(
    props.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.branded_name,
      branded_name: p.branded_name,
      building_name: p.building_name,
      city: p.city,
      neighbourhood: p.neighbourhood,
      neighbourhood_slug: p.neighbourhood_slug,
      building_slug: p.building_slug,
      bedrooms: p.bedrooms,
      sleeps: p.sleeps,
      nightly_rate_minor: p.nightly_rate_minor,
      currency: p.currency,
      is_featured: p.is_featured,
    })),
  );
}
