import { NextRequest, NextResponse } from "next/server";
import { generateIcal, getOwnerCalendarEvents } from "@/lib/calendar";

/* Mock owner → properties mapping */
const OWNER_PROPERTIES: Record<string, string[]> = {
  "ow1": ["PR001", "PR003"],
  "ow2": ["PR004"],
  "ow3": ["PR005"],
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> },
) {
  const { ownerId } = await params;
  const propertyIds = OWNER_PROPERTIES[ownerId.toLowerCase()];
  if (!propertyIds) {
    return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  }

  const events = getOwnerCalendarEvents(propertyIds);
  const ical = generateIcal(events);

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="checkinbliss-${ownerId}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
