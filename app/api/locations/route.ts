import { NextResponse } from "next/server";
import { getLocations } from "@/lib/data";

export async function GET() {
  const locations = getLocations();
  return NextResponse.json(locations, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
