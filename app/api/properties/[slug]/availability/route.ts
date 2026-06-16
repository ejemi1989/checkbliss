import { NextRequest, NextResponse } from "next/server";
import { supabaseConfigured, createBrowser } from "@/lib/supabase";
import { getSeedProperties, getSeedReservations, getSeedBlocks } from "@/lib/seed-data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!supabaseConfigured) {
    const prop = getSeedProperties().find((p) => p.slug === slug);
    if (!prop) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    const reservations = getSeedReservations()
      .filter((r) => r.property_id === prop.id && r.status !== "cancelled")
      .map((r) => ({ from: r.check_in, to: r.check_out }));
    const blocks = getSeedBlocks()
      .filter((b) => b.property_id === prop.id)
      .map((b) => ({ from: b.starts, to: b.ends }));
    return NextResponse.json({ unavailable: [...reservations, ...blocks] });
  }

  const db = createBrowser();
  const { data: property } = await db
    .from("properties")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const [reservations, blocks] = await Promise.all([
    db
      .from("reservations")
      .select("check_in, check_out")
      .eq("property_id", property.id)
      .neq("status", "cancelled"),
    db
      .from("availability_blocks")
      .select("starts, ends")
      .eq("property_id", property.id),
  ]);

  const unavailable = [
    ...(reservations.data ?? []).map((r) => ({ from: r.check_in, to: r.check_out })),
    ...(blocks.data ?? []).map((b) => ({ from: b.starts, to: b.ends })),
  ];

  return NextResponse.json({ unavailable });
}
