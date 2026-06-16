/**
 * iCal / ICS calendar feed generator.
 * Generates RFC 5545-compliant calendar files for confirmed bookings.
 * One-way outbound sync — internal calendar stays source of truth.
 */

import { getSeedProperties, getSeedReservations } from "./seed-data";

interface CalendarEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  created: string;
}

function escapeIcal(text: string): string {
  return text.replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
}

function formatIcalDate(dateStr: string): string {
  return dateStr.replace(/-/g, "") + "T000000";
}

export function generateIcal(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CheckinBliss//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:CheckinBliss Bookings",
    "X-WR-CALDESC:Your CheckinBliss property bookings — one-way sync from your dashboard.",
    "X-WR-TIMEZONE:Africa/Lagos",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
  ];

  for (const event of events) {
    const start = formatIcalDate(event.startDate);
    const end = formatIcalDate(event.endDate);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${formatIcalDate(new Date().toISOString().split("T")[0])}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcal(event.summary)}`,
      `DESCRIPTION:${escapeIcal(event.description)}`,
      `LOCATION:${escapeIcal(event.location)}`,
      `CREATED:${event.created}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function getOwnerCalendarEvents(ownerPropertyIds: string[]): CalendarEvent[] {
  const reservations = getSeedReservations().filter(
    (r) => ownerPropertyIds.includes(r.property_id) && r.status === "confirmed",
  );
  const properties = getSeedProperties();

  const created = formatIcalDate(new Date().toISOString().split("T")[0]);

  return reservations.map((r) => {
    const prop = properties.find((p) => p.id === r.property_id);
    return {
      uid: `checkinbliss-${r.id}@checkinbliss.com`,
      summary: `Guest: ${prop?.name ?? "Stay"}`,
      description: `CheckinBliss booking — ${prop?.neighbourhood ?? ""}, ${prop?.city ?? ""}.\\n\\nBooking ref: ${r.id}.\\nCheck-in: ${r.check_in}\\nCheck-out: ${r.check_out}\\n\\nManaged via CheckinBliss dashboard.`,
      location: `${prop?.neighbourhood ?? ""}, ${prop?.city ?? ""}, Nigeria`,
      startDate: r.check_in,
      endDate: r.check_out,
      created,
    };
  });
}

export function getBookingCalendarEvent(bookingRef: string, propertyName: string, checkIn: string, checkOut: string, neighbourhood: string, city: string): CalendarEvent {
  const created = formatIcalDate(new Date().toISOString().split("T")[0]);
  return {
    uid: `checkinbliss-guest-${bookingRef}@checkinbliss.com`,
    summary: `CheckinBliss — ${propertyName}`,
    description: `Your stay at ${propertyName}, ${neighbourhood}, ${city}.\\n\\nBooking reference: ${bookingRef}\\nCheck-in: ${checkIn}\\nCheck-out: ${checkOut}\\n\\nVerified by CheckinBliss.`,
    location: `${neighbourhood}, ${city}, Nigeria`,
    startDate: checkIn,
    endDate: checkOut,
    created,
  };
}
