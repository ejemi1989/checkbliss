import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminConfigured, createBrowser } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;

  if (!supabaseAdminConfigured) {
    return NextResponse.json({
      reference,
      booking_group_id: "mock-group-id",
      reservations: [
        {
          reservation_id: "mock-res-id",
          property_name: "Lagoon View Loft",
          check_in: "2026-09-15",
          check_out: "2026-09-19",
          total_minor: 96000,
          deposit_minor: 10000,
          checkout_time: "18:00",
          status: "confirmed",
        },
      ],
      charge_total_minor: 96000,
      deposit_hold_minor: 10000,
      currency: "GBP",
      deposit: {
        note: "Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout.",
      },
    });
  }

  const db = createBrowser();
  const { data: group } = await db
    .from("booking_groups")
    .select("*")
    .eq("reference", reference)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: reservations } = await db
    .from("reservations")
    .select("*")
    .eq("booking_group_id", group.id);

  return NextResponse.json({
    reference,
    booking_group_id: group.id,
    reservations: (reservations ?? []).map((r) => ({
      reservation_id: r.id,
      property_name: r.property_name,
      check_in: r.check_in,
      check_out: r.check_out,
      total_minor: r.total_minor,
      deposit_minor: r.deposit_hold_minor,
      checkout_time: r.confirmed_checkout_time,
      status: r.status,
    })),
    charge_total_minor: group.charge_total_minor,
    deposit_hold_minor: group.deposit_hold_total_minor,
    currency: group.currency,
    deposit: {
      note: "Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout.",
    },
  });
}
