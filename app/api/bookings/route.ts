import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseConfigured } from "@/lib/supabase";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { createBookingCharge, createDepositHold } from "@/lib/stripe";
import { sendWhatsApp, getTemplate } from "@/lib/whatsapp";
import { getSeedProperties, getSeedReservations, getSeedBlocks } from "@/lib/seed-data";
import { computeSplit, createOwnerPayoutRows } from "@/lib/payouts";
import { registerMockBookingGroup } from "@/lib/reconciliation";
import { advanceRuleViolation, ADVANCE_RULE_MESSAGE } from "@/lib/booking-rules";

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
  return advanceRuleViolation(checkIn);
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

/**
 * Compensating cancellation: release reserved dates after a failure so
 * inventory is never silently held. Mirrors the webhook's
 * `cancel_booking_group` action — reservations and the group flip to
 * `cancelled` only while still `pending_payment`.
 */
async function compensateFailedGroup(
  db: ReturnType<typeof createAdmin>,
  groupId: string,
): Promise<void> {
  await db
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("booking_group_id", groupId)
    .eq("status", "pending_payment");
  await db
    .from("booking_groups")
    .update({ status: "cancelled" })
    .eq("id", groupId)
    .eq("status", "pending_payment");
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
          { code: r1, message: ADVANCE_RULE_MESSAGE },
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

    // --- 1. ATOMIC RESERVE — the database owns non-overlap and the 14-day
    // rule. book_stays() inserts pending_payment reservations inside a single
    // transaction; the GiST EXCLUDE constraint rejects any overlap (23P01) and
    // the RPC raises ADVANCE_14_DAYS / PROPERTY_NOT_BOOKABLE / INVALID_RANGE.
    // Nothing has been charged yet — payment is created only after reserve.
    const { data: reserveResult, error: reserveError } = await db.rpc("book_stays", {
      p_group_id: groupId,
      p_items: items.map((i) => ({
        property_id: i.property_id,
        check_in: i.check_in,
        check_out: i.check_out,
        extended_checkout: i.extended_checkout ?? false,
      })),
      p_guest_name: guest.name,
      p_guest_email: guest.email,
      p_guest_phone: guest.phone,
      p_guest_count: guest.guests,
    });

    if (reserveError) {
      const msg = reserveError.message ?? "";
      const code = reserveError.code ?? "";
      if (msg.includes("ADVANCE_14_DAYS")) {
        return NextResponse.json(
          { code: "ADVANCE_14_DAYS", message: ADVANCE_RULE_MESSAGE },
          { status: 422 },
        );
      }
      if (msg.includes("PROPERTY_NOT_BOOKABLE")) {
        return NextResponse.json(
          { code: "PROPERTY_NOT_BOOKABLE", message: "A selected property is not currently bookable." },
          { status: 404 },
        );
      }
      if (code === "23P01" || msg.includes("conflicts with existing") || msg.includes("reservations_no_overlap")) {
        return NextResponse.json(
          { code: "DATES_UNAVAILABLE", message: "One or more stays are no longer available for those dates. Nothing was charged." },
          { status: 409 },
        );
      }
      console.error(`[bookings] book_stays failed for group ${groupId}: ${msg}`);
      throw new Error(`Failed to reserve stays: ${msg}`);
    }

    const reservedRows = (reserveResult ?? []) as Array<{
      reservation_id: string;
      reference: string;
      property_id: string;
      property_name: string;
      total_minor: number;
      deposit_minor: number;
      checkout_time: string;
    }>;
    if (reservedRows.length !== items.length) {
      throw new Error("book_stays returned an unexpected number of reservations");
    }

    const propertyIds = [...new Set(items.map((i) => i.property_id))];
    const { data: propsData } = await db
      .from("properties")
      .select("id, name, owner_id, nightly_rate_minor, deposit_minor, extended_checkout_offered, extended_checkout_price_minor, currency")
      .in("id", propertyIds);
    const propsById = new Map((propsData ?? []).map((p) => [p.id, p]));

    const reservations = [];
    let chargeTotalMinor = 0;
    let depositHoldTotalMinor = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const reserved = reservedRows[idx];
      const property = propsById.get(item.property_id);
      if (!property) throw new Error(`Property ${item.property_id} missing after reservation`);

      const nights = computeNights(item.check_in, item.check_out);
      const split = computeSplit(reserved.total_minor);

      reservations.push({
        id: reserved.reservation_id,
        booking_group_id: groupId,
        property_id: item.property_id,
        property_name: property.name,
        owner_id: property.owner_id,
        check_in: item.check_in,
        check_out: item.check_out,
        total_minor: reserved.total_minor,
        deposit_hold_minor: reserved.deposit_minor,
        commission_minor: split.commissionMinor,
        owner_share_minor: split.ownerShareMinor,
        currency: property.currency,
        checkout_time: reserved.checkout_time,
      });

      chargeTotalMinor += reserved.total_minor;
      depositHoldTotalMinor += reserved.deposit_minor;
    }

    const totalSplit = computeSplit(chargeTotalMinor);
    const connectAccountId = process.env.STRIPE_CONNECT_ACCOUNT_ID || undefined;

    // --- 2. PAYMENT CREATION — if this fails we compensate: the reserved
    // dates are released (group + reservations cancelled) and nothing is
    // charged, because nothing was charged yet.
    let charge: Awaited<ReturnType<typeof createBookingCharge>>;
    let hold: Awaited<ReturnType<typeof createDepositHold>>;
    try {
      charge = await createBookingCharge({
        amountMinor: chargeTotalMinor,
        currency: "gbp",
        bookingGroupId: groupId,
        guestEmail: guest.email,
        guestName: guest.name,
        description: `CheckinBliss: ${reservations.map((r) => r.property_name).join(", ")}`,
        connectAccountId,
        applicationFeeMinor: connectAccountId ? totalSplit.commissionMinor : undefined,
      });
      hold = await createDepositHold({
        amountMinor: depositHoldTotalMinor,
        currency: "gbp",
        bookingGroupId: groupId,
        guestEmail: guest.email,
        description: `Security deposit: ${reservations[0]?.property_name}`,
      });
    } catch (paymentError) {
      await compensateFailedGroup(db, groupId);
      console.error(`[bookings] Payment setup failed for group ${groupId}; dates released.`, paymentError);
      return NextResponse.json(
        {
          code: "PAYMENT_SETUP_FAILED",
          message: "We couldn't set up payment. Your dates were released and nothing was charged. Please try again.",
        },
        { status: 502 },
      );
    }

    try {
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
        const key = r.owner_id ?? r.property_id;
        const existing = ownerMap.get(key);
        if (existing) {
          existing.ownerShareMinor += r.owner_share_minor;
        } else {
          ownerMap.set(key, {
            ownerId: key,
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
        action: "booking.reserved",
        target_id: groupId,
        detail: `Group ${groupId} (${reference}) — ${items.length} stay(s), charge ${chargeTotalMinor}, commission ${totalSplit.commissionMinor}, owner share ${totalSplit.ownerShareMinor}, hold ${depositHoldTotalMinor}. Payment setup: ${charge.intentId}`,
      });
    } catch (writeError) {
      // Any post-payment persistence failure: release the dates so inventory
      // is never silently held; the customer can retry. Payment can be
      // reconciled later (see docs/payment-reconciliation.md).
      await compensateFailedGroup(db, groupId);
      console.error(`[bookings] Post-payment persistence failed for group ${groupId}; dates released.`, writeError);
      return NextResponse.json(
        {
          code: "BOOKING_PERSIST_FAILED",
          message: "We couldn't complete your booking. Your dates were released and you have not been charged.",
        },
        { status: 502 },
      );
    }

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
          checkout_time: r.checkout_time,
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

/** In-memory registry of held (pending_payment) date ranges in mock mode —
 *  mirrors the DB GiST EXCLUDE constraint so concurrent mock bookings can
 *  never double-book a property. */
const mockPendingRanges: Array<{ property_id: string; check_in: string; check_out: string }> = [];
let mockLock: Promise<unknown> = Promise.resolve();

async function withMockLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = mockLock.then(fn, fn);
  mockLock = run.then(() => undefined, () => undefined);
  return run;
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

  const conflict = await withMockLock(async () => {
    for (const item of items) {
      const prop = properties.find((p) => p.id === item.property_id);
      if (!prop || prop.status !== "approved") {
        return {
          code: "PROPERTY_NOT_BOOKABLE" as const,
          message: `${item.property_id} is not currently bookable.`,
          status: 404,
        };
      }

      const itemCheckIn = new Date(item.check_in);
      const itemCheckOut = new Date(item.check_out);
      const overlaps = (r: { check_in?: string; check_out?: string; starts?: string; ends?: string }) => {
        const rIn = new Date(r.check_in ?? r.starts ?? "");
        const rOut = new Date(r.check_out ?? r.ends ?? "");
        return itemCheckIn < rOut && itemCheckOut > rIn;
      };

      if (mockPendingRanges.some((p) => p.property_id === item.property_id && overlaps(p))) {
        return {
          code: "DATES_UNAVAILABLE" as const,
          message: `${prop.name} is booked for those dates. Nothing charged.`,
          status: 409,
        };
      }
      if (reservations.some((r) => r.property_id === item.property_id && r.status !== "cancelled" && overlaps(r))) {
        return {
          code: "DATES_UNAVAILABLE" as const,
          message: `${prop.name} is booked for those dates. Nothing charged.`,
          status: 409,
        };
      }
      if (blocks.some((b) => b.property_id === item.property_id && overlaps(b))) {
        return {
          code: "DATES_BLOCKED" as const,
          message: `${prop.name} is unavailable for those dates. Nothing charged.`,
          status: 409,
        };
      }
    }

    for (const item of items) {
      mockPendingRanges.push({
        property_id: item.property_id,
        check_in: item.check_in,
        check_out: item.check_out,
      });
    }
    return null;
  });

  if (conflict) {
    return NextResponse.json(
      { code: conflict.code, message: conflict.message },
      { status: conflict.status },
    );
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

  // Create the charge + hold intents through the same functions the real path
  // uses — in mock mode this registers them in the in-memory payment-intent
  // ledger so the reconciliation cron can demo "paid but webhook missed it".
  const charge = await createBookingCharge({
    amountMinor: chargeTotalMinor,
    currency: "gbp",
    bookingGroupId: groupId,
    guestEmail: guest.email,
    guestName: guest.name,
    description: `CheckinBliss: ${resultReservations.map((r) => r.property_name).join(", ")}`,
  });
  const hold = await createDepositHold({
    amountMinor: depositHoldTotalMinor,
    currency: "gbp",
    bookingGroupId: groupId,
    guestEmail: guest.email,
    description: `Security deposit: ${resultReservations[0]?.property_name}`,
  });
  registerMockBookingGroup(groupId, charge.intentId, "pending", "pending_payment");

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
      chargeClientSecret: charge.clientSecret,
      holdClientSecret: hold.clientSecret,
      deposit: {
        note: "Pre-authorisation hold — not a charge. Released within 7 days of a clean checkout.",
      },
    },
    { status: 201 },
  );
}
