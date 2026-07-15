import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/supabase";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { createBookingCharge, createDepositHold } from "@/lib/stripe";
import { sendWhatsApp, getTemplate } from "@/lib/whatsapp";
import { getSeedProperties, getSeedReservations, getSeedBlocks } from "@/lib/seed-data";

const BookingGuestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  guests: z.number().int().min(1).max(10),
});

const BookingItemSchema = z.object({
  property_id: z.string().min(1),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extended_checkout: z.boolean().optional().default(false),
});

const BookingRequestSchema = z.object({
  guest: BookingGuestSchema,
  items: z.array(BookingItemSchema).min(1).max(5),
});

function validate14Days(checkIn: string): string | null {
  const checkInDate = new Date(checkIn);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 14) return "ADVANCE_14_DAYS";
  return null;
}

function validateRange(checkIn: string, checkOut: string): string | null {
  if (new Date(checkOut) <= new Date(checkIn)) return "INVALID_RANGE";
  return null;
}

function computeNights(checkIn: string, checkOut: string): number {
  return Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BookingRequestSchema.parse(body);
    const { guest, items } = parsed;

    for (const item of items) {
      const r1 = validate14Days(item.check_in);
      if (r1) {
        return NextResponse.json(
          { code: r1, message: "Bookings open 14+ days ahead." },
          { status: 422 },
        );
      }
      const r2 = validateRange(item.check_in, item.check_out);
      if (r2) {
        return NextResponse.json(
          { code: r2, message: "Check-out must be after check-in." },
          { status: 422 },
        );
      }
    }

    if (!supabaseAdminConfigured) {
      return handleMockBooking(guest, items);
    }

    const db = createAdmin();
    const groupId = crypto.randomUUID();
    const reference = generateReference();
    const currency = "GBP";

    const reservations = [];
    let chargeTotalMinor = 0;
    let depositHoldTotalMinor = 0;

    for (const item of items) {
      const { data: property } = await db
        .from("properties")
        .select("id, nightly_rate_minor, deposit_minor, extended_checkout_offered, extended_checkout_price_minor, name, owner_id, currency")
        .eq("id", item.property_id)
        .eq("status", "approved")
        .single();

      if (!property) {
        return NextResponse.json(
          { code: "PROPERTY_NOT_BOOKABLE", message: `${item.property_id} is not currently bookable.` },
          { status: 404 },
        );
      }

      const nights = computeNights(item.check_in, item.check_out);
      const accommodationMinor = property.nightly_rate_minor * nights;
      let lateCheckoutFeeMinor: number | null = null;
      let confirmedCheckoutTime = "11:00";

      if (item.extended_checkout && property.extended_checkout_offered) {
        lateCheckoutFeeMinor = property.extended_checkout_price_minor ?? Math.round(property.nightly_rate_minor * 0.4);
        confirmedCheckoutTime = "18:00";
      }

      const totalMinor = accommodationMinor + (lateCheckoutFeeMinor ?? 0);
      const depositMinor = property.deposit_minor ?? 10000;

      reservations.push({
        id: crypto.randomUUID(),
        booking_group_id: groupId,
        property_id: item.property_id,
        property_name: property.name,
        guest_name: guest.name,
        guest_email: guest.email,
        guest_phone: guest.phone,
        guest_count: guest.guests,
        check_in: item.check_in,
        check_out: item.check_out,
        confirmed_checkout_time: confirmedCheckoutTime,
        late_checkout_fee_minor: lateCheckoutFeeMinor,
        total_minor: totalMinor,
        deposit_hold_minor: depositMinor,
        status: "confirmed",
        nights,
        created_at: new Date().toISOString(),
        currency,
      });

      chargeTotalMinor += totalMinor;
      depositHoldTotalMinor += depositMinor;
    }

    const charge = await createBookingCharge(chargeTotalMinor, `charge-${groupId}`);
    const hold = await createDepositHold(depositHoldTotalMinor, `hold-${groupId}`);

    const { error: groupError } = await db.from("booking_groups").insert({
      id: groupId,
      charge_intent_id: charge.intentId,
      charge_status: charge.status,
      currency,
      charge_total_minor: chargeTotalMinor,
      deposit_hold_total_minor: depositHoldTotalMinor,
      status: "confirmed",
    });
    if (groupError) throw new Error(`Failed to create group: ${groupError.message}`);

    for (const r of reservations) {
      const { error: resError } = await db.from("reservations").insert({
        ...r,
        payment_intent_id: charge.intentId,
      });
      if (resError) throw new Error(`Failed to create reservation: ${resError.message}`);

      const { error: inspError } = await db.from("inspections").insert({
        reservation_id: r.id,
        created_at: new Date().toISOString(),
      });
      if (inspError) {
        console.warn(`Failed to create inspection for reservation ${r.id}: ${inspError.message}`);
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    for (const r of reservations) {
      await db.from("deposit_holds").insert({
        reservation_id: r.id,
        payment_intent_id: hold.intentId,
        hold_amount_minor: r.deposit_hold_minor,
        currency,
        status: "held",
        expires_at: expiresAt.toISOString(),
      });
    }

    const uniqueOwners = new Set(reservations.map((r) => r.property_name));
    for (const propertyName of uniqueOwners) {
      const msg = getTemplate("newBooking", propertyName, guest.name, items[0].check_in, items[items.length - 1].check_out, `£${(chargeTotalMinor / 100).toFixed(2)}`);
      await sendWhatsApp("+2348000000000", msg);
    }

    await db.from("audit_log").insert({
      action: "booking.confirmed",
      target_id: groupId,
      detail: `Group ${groupId} — ${items.length} stay(s), charge ${chargeTotalMinor}, hold ${depositHoldTotalMinor}`,
    });

    return NextResponse.json(
      {
        booking_group_id: groupId,
        reference,
        reservations: reservations.map((r) => ({
          reservation_id: r.id,
          property_name: r.property_name,
          check_in: r.check_in,
          check_out: r.check_out,
          total_minor: r.total_minor,
          deposit_minor: r.deposit_hold_minor,
          checkout_time: r.confirmed_checkout_time,
        })),
        charge_total_minor: chargeTotalMinor,
        deposit_hold_minor: depositHoldTotalMinor,
        currency,
        deposit: {
          note: "Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout.",
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: err.issues.map((e) => e.message).join(", ") },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Booking failed" },
      { status: 502 },
    );
  }
}

async function handleMockBooking(
  guest: z.infer<typeof BookingGuestSchema>,
  items: z.infer<typeof BookingItemSchema>[],
) {
  const properties = getSeedProperties();
  const reservations = getSeedReservations();
  const blocks = getSeedBlocks();
  const groupId = crypto.randomUUID();
  const reference = generateReference();
  const currency = "GBP";

  const checkedProperties = new Map<string, boolean>();
  for (const item of items) {
    const prop = properties.find((p) => p.id === item.property_id);
    if (!prop || prop.status !== "approved") {
      return NextResponse.json(
        { code: "PROPERTY_NOT_BOOKABLE", message: `${item.property_id} is not currently bookable.` },
        { status: 404 },
      );
    }

    const itemReservations = reservations.filter(
      (r) => r.property_id === item.property_id && r.status !== "cancelled",
    );
    const itemBlocks = blocks.filter((b) => b.property_id === item.property_id);

    const itemCheckIn = new Date(item.check_in);
    const itemCheckOut = new Date(item.check_out);

    for (const r of itemReservations) {
      const rIn = new Date(r.check_in);
      const rOut = new Date(r.check_out);
      if (itemCheckIn < rOut && itemCheckOut > rIn) {
        return NextResponse.json(
          { code: "DATES_UNAVAILABLE", message: `${prop.name} is booked for those dates. Nothing charged.` },
          { status: 409 },
        );
      }
    }

    for (const b of itemBlocks) {
      const bIn = new Date(b.starts);
      const bOut = new Date(b.ends);
      if (itemCheckIn < bOut && itemCheckOut > bIn) {
        return NextResponse.json(
          { code: "DATES_BLOCKED", message: `${prop.name} is unavailable for those dates. Nothing charged.` },
          { status: 409 },
        );
      }
    }

    checkedProperties.set(item.property_id, true);
  }

  let chargeTotalMinor = 0;
  let depositHoldTotalMinor = 0;
  const resultReservations = [];

  for (const item of items) {
    const prop = properties.find((p) => p.id === item.property_id)!;
    const nights = computeNights(item.check_in, item.check_out);
    const accommodationMinor = prop.nightly_rate_minor * nights;
    let lateCheckoutFeeMinor: number | null = null;
    let confirmedCheckoutTime = "11:00";

    if (item.extended_checkout && prop.extended_checkout_offered) {
      lateCheckoutFeeMinor = prop.extended_checkout_price_minor ?? Math.round(prop.nightly_rate_minor * 0.4);
      confirmedCheckoutTime = "18:00";
    }

    const totalMinor = accommodationMinor + (lateCheckoutFeeMinor ?? 0);
    const depositMinor = prop.deposit_minor ?? 10000;
    const resId = crypto.randomUUID();

    chargeTotalMinor += totalMinor;
    depositHoldTotalMinor += depositMinor;

    resultReservations.push({
      reservation_id: resId,
      property_name: prop.name,
      check_in: item.check_in,
      check_out: item.check_out,
      total_minor: totalMinor,
      deposit_minor: depositMinor,
      checkout_time: confirmedCheckoutTime,
    });
  }

  console.log(`[mock bookings] Group ${groupId} (${reference}) created — ${items.length} stay(s), charge ${chargeTotalMinor}, hold ${depositHoldTotalMinor}`);

  const uniqueOwners = [...new Set(resultReservations.map((r) => r.property_name))];
  for (const propertyName of uniqueOwners) {
    const msg = getTemplate("newBooking", propertyName, guest.name, items[0].check_in, items[items.length - 1].check_out, `£${(chargeTotalMinor / 100).toFixed(2)}`);
    await sendWhatsApp("+2348000000000", msg);
  }

  return NextResponse.json(
    {
      booking_group_id: groupId,
      reference,
      reservations: resultReservations,
      charge_total_minor: chargeTotalMinor,
      deposit_hold_minor: depositHoldTotalMinor,
      currency,
      deposit: {
        note: "Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout.",
      },
    },
    { status: 201 },
  );
}
