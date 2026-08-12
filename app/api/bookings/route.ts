import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/supabase";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { createBookingCharge, createDepositHold } from "@/lib/stripe";
import { sendWhatsApp, getTemplate } from "@/lib/whatsapp";
import { getSeedProperties, getSeedReservations, getSeedBlocks } from "@/lib/seed-data";
import { computeSplit, createOwnerPayoutRows } from "@/lib/payouts";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

async function verifyTurnstile(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

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
  turnstile_token: z.string().min(1, "CAPTCHA verification required"),
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
    const { guest, items, turnstile_token } = parsed;

    const captchaOk = await verifyTurnstile(turnstile_token);
    if (!captchaOk) {
      return NextResponse.json(
        { code: "CAPTCHA_FAILED", message: "CAPTCHA verification failed. Please try again." },
        { status: 403 },
      );
    }

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
      const split = computeSplit(totalMinor);

      reservations.push({
        id: crypto.randomUUID(),
        booking_group_id: groupId,
        property_id: item.property_id,
        property_name: property.name,
        owner_id: property.owner_id,
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
        commission_minor: split.commissionMinor,
        owner_share_minor: split.ownerShareMinor,
        status: "pending_payment",
        nights,
        created_at: new Date().toISOString(),
        currency,
      });

      chargeTotalMinor += totalMinor;
      depositHoldTotalMinor += depositMinor;
    }

    const totalSplit = computeSplit(chargeTotalMinor);
    const connectAccountId = process.env.STRIPE_CONNECT_ACCOUNT_ID || undefined;

    const charge = await createBookingCharge({
      amountMinor: chargeTotalMinor,
      currency: "gbp",
      bookingGroupId: groupId,
      guestEmail: guest.email,
      guestName: guest.name,
      description: `CheckinBliss: ${reservations.map((r) => r.property_name).join(", ")}`,
      connectAccountId,
      applicationFeeMinor: connectAccountId ? totalSplit.commissionMinor : undefined,
    });
    const hold = await createDepositHold({
      amountMinor: depositHoldTotalMinor,
      currency: "gbp",
      bookingGroupId: groupId,
      guestEmail: guest.email,
      description: `Security deposit: ${reservations[0]?.property_name}`,
    });

    const { error: groupError } = await db.from("booking_groups").insert({
      id: groupId,
      charge_intent_id: charge.intentId,
      charge_status: "pending",
      currency,
      charge_total_minor: chargeTotalMinor,
      deposit_hold_total_minor: depositHoldTotalMinor,
      commission_minor: totalSplit.commissionMinor,
      owner_share_minor: totalSplit.ownerShareMinor,
      status: "pending_payment",
    });
    if (groupError) throw new Error(`Failed to create group: ${groupError.message}`);

    for (const r of reservations) {
      const { error: resError } = await db.from("reservations").insert({
        id: r.id,
        booking_group_id: r.booking_group_id,
        property_id: r.property_id,
        guest_name: r.guest_name,
        guest_email: r.guest_email,
        guest_phone: r.guest_phone,
        guest_count: r.guest_count,
        check_in: r.check_in,
        check_out: r.check_out,
        status: r.status,
        confirmed_checkout_time: r.confirmed_checkout_time,
        late_checkout_fee_minor: r.late_checkout_fee_minor,
        accommodation_minor: r.total_minor - (r.late_checkout_fee_minor ?? 0),
        total_minor: r.total_minor,
        deposit_hold_minor: r.deposit_hold_minor,
        commission_minor: r.commission_minor,
        owner_share_minor: r.owner_share_minor,
        currency: r.currency,
        payment_intent_id: charge.intentId,
        reference: generateReference(),
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

    const ownerMap = new Map<string, { ownerId: string; reservationId: string; propertyId: string; ownerShareMinor: number }>();
    for (const r of reservations) {
      const existing = ownerMap.get(r.owner_id ?? r.property_id);
      if (existing) {
        existing.ownerShareMinor += r.owner_share_minor;
      } else {
        ownerMap.set(r.owner_id ?? r.property_id, {
          ownerId: r.owner_id ?? r.property_id,
          reservationId: r.id,
          propertyId: r.property_id,
          ownerShareMinor: r.owner_share_minor,
        });
      }
    }
    const payoutEntries = [...ownerMap.values()];
    await createOwnerPayoutRows(groupId, payoutEntries);

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
      detail: `Group ${groupId} — ${items.length} stay(s), charge ${chargeTotalMinor}, commission ${totalSplit.commissionMinor}, owner share ${totalSplit.ownerShareMinor}, hold ${depositHoldTotalMinor}`,
    });

    return NextResponse.json(
      {
        ok: true,
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
        chargeClientSecret: charge.clientSecret,
        holdClientSecret: hold.clientSecret,
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
    const split = computeSplit(totalMinor);
    const resId = crypto.randomUUID();

    chargeTotalMinor += totalMinor;
    depositHoldTotalMinor += depositMinor;

    resultReservations.push({
      reservation_id: resId,
      property_name: prop.name,
      property_id: prop.id,
      owner_id: prop.owner_id ?? prop.id,
      check_in: item.check_in,
      check_out: item.check_out,
      total_minor: totalMinor,
      deposit_minor: depositMinor,
      commission_minor: split.commissionMinor,
      owner_share_minor: split.ownerShareMinor,
      checkout_time: confirmedCheckoutTime,
    });
  }

  const totalSplit = computeSplit(chargeTotalMinor);
  const payoutEntries: Array<{ ownerId: string; reservationId: string; propertyId: string; ownerShareMinor: number }> = [];
  const ownerMap = new Map<string, typeof payoutEntries[0]>();
  for (const r of resultReservations) {
    const ownerId = r.owner_id as string;
    const existing = ownerMap.get(ownerId);
    if (existing) {
      existing.ownerShareMinor += (r.owner_share_minor as number);
    } else {
      const propForPayout = properties.find((p) => p.id === (r.property_id as string));
      const entry = {
        ownerId,
        reservationId: r.reservation_id as string,
        propertyId: propForPayout?.id ?? ownerId,
        ownerShareMinor: r.owner_share_minor as number,
      };
      ownerMap.set(ownerId, entry);
      payoutEntries.push(entry);
    }
  }
  await createOwnerPayoutRows(groupId, payoutEntries);

  console.log(`[mock bookings] Group ${groupId} (${reference}) created — ${items.length} stay(s), charge ${chargeTotalMinor}, hold ${depositHoldTotalMinor}`);

  const uniqueOwners = [...new Set(resultReservations.map((r) => r.property_name))];
  for (const propertyName of uniqueOwners) {
    const msg = getTemplate("newBooking", propertyName, guest.name, items[0].check_in, items[items.length - 1].check_out, `£${(chargeTotalMinor / 100).toFixed(2)}`);
    await sendWhatsApp("+2348000000000", msg);
  }

  return NextResponse.json(
    {
      ok: true,
      booking_group_id: groupId,
      reference,
      reservations: resultReservations,
      charge_total_minor: chargeTotalMinor,
      deposit_hold_minor: depositHoldTotalMinor,
      currency,
      chargeClientSecret: `mock_charge_${groupId}_secret`,
      holdClientSecret: `mock_hold_${groupId}_secret`,
      deposit: {
        note: "Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout.",
      },
    },
    { status: 201 },
  );
}
