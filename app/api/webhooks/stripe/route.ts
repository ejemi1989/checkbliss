import { NextRequest, NextResponse } from "next/server";
import { stripeConfigured } from "@/lib/stripe";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { checkAndProcess } from "@/lib/idempotency";
import { enqueue } from "@/lib/outbox";
import { log } from "@/lib/observability";
import { routeStripeEvent } from "@/lib/stripe-events";
import { sendWhatsApp } from "@/lib/whatsapp";
import Stripe from "stripe";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-07-29.dahlia",
    });
  }
  return _stripe;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeConfigured || !webhookSecret) {
    try {
      const parsed = JSON.parse(rawBody);
      console.log(`[mock stripe webhook] ${parsed.type ?? "unknown event"} — ${parsed.id ?? parsed.data?.object?.id ?? "no id"}`);
    } catch {
      console.log("[mock stripe webhook] Received raw payload");
    }
    return NextResponse.json({ ok: true });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (!supabaseAdminConfigured) {
    return NextResponse.json({ ok: true });
  }

  const decision = await checkAndProcess("stripe", event.id);
  if (decision === "skip") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  log("stripe-webhook", "info", `Processing ${event.type}`, { eventId: event.id });

  const db = createAdmin();
  const actions = routeStripeEvent(event as unknown as Parameters<typeof routeStripeEvent>[0]);

  for (const action of actions) {
    if (action.kind === "noop") continue;

    if (action.kind === "ignore") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (action.kind === "update_booking_group_charge") {
      await db
        .from("booking_groups")
        .update({ charge_status: action.chargeStatus, status: action.chargeStatus === "succeeded" ? "confirmed" : "failed" })
        .eq("charge_intent_id", action.intentId);
      if (action.chargeStatus === "failed") {
        enqueue("email", "guest@placeholder", `Payment failed for intent ${action.intentId}`, "Payment Failed");
      }
      continue;
    }

    if (action.kind === "update_deposit_hold_status") {
      const update: Record<string, unknown> = { status: action.holdStatus };
      if (action.releasedAt) update.released_at = action.releasedAt;
      await db
        .from("deposit_holds")
        .update(update)
        .eq("payment_intent_id", action.intentId);
      continue;
    }

    if (action.kind === "cancel_booking_group") {
      await db
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("booking_group_id", action.groupId)
        .eq("status", "pending_payment");
      await db
        .from("booking_groups")
        .update({ status: "cancelled" })
        .eq("id", action.groupId)
        .eq("status", "pending_payment");
      log("stripe-webhook", "info", `Cancelled booking group ${action.groupId}`);
      continue;
    }

    if (action.kind === "log_dispute") {
      await db.from("audit_log").insert({
        action: "stripe.dispute.created",
        target_id: action.disputeId,
        detail: `Dispute for charge ${action.chargeId}`,
      });
      enqueue("email", "admin@placeholder", `Dispute ${action.disputeId} on charge ${action.chargeId}`, "Dispute Alert");
      continue;
    }

    if (action.kind === "record_refund") {
      await db.from("booking_groups")
        .update({
          refunded_minor: action.refundAmount,
          platform_payout_status: "failed",
          owner_payout_status: "refunded",
        })
        .eq("charge_intent_id", action.chargeId)
        .or(`id.eq.${action.bookingGroupId}`);

      await db.from("owner_payouts")
        .update({ status: "refunded" })
        .eq("booking_group_id", action.bookingGroupId);

      log("stripe-webhook", "info", `Refund recorded: ${action.refundAmount} on charge ${action.chargeId}`);
      continue;
    }

    if (action.kind === "complete_one_time_payment") {
      await db
        .from("one_time_payments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("checkout_session_id", action.sessionId);
      log("stripe-webhook", "info", `One-time payment completed for checkout session ${action.sessionId}`);
      continue;
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intentId = (event.data.object as { id?: string }).id ?? null;
    const metadata = (event.data.object as { metadata?: Record<string, string> }).metadata ?? {};
    const groupId = metadata.booking_group_id ?? null;
    const purpose = metadata.type ?? metadata.purpose ?? null;

    if (purpose === "booking_charge" && groupId && intentId) {
      const latestCharge = (event.data.object as { latest_charge?: string | null }).latest_charge ?? null;

      await db
        .from("reservations")
        .update({ status: "confirmed", payment_intent_id: intentId })
        .eq("booking_group_id", groupId)
        .eq("status", "pending_payment");

      if (latestCharge) {
        await db
          .from("booking_groups")
          .update({ stripe_charge_id: latestCharge, charge_status: "succeeded", status: "confirmed" })
          .eq("id", groupId);
      }

      const { data: reservations } = await db
        .from("reservations")
        .select("id, check_out, confirmed_checkout_time, property_id")
        .eq("booking_group_id", groupId)
        .eq("status", "confirmed");

      for (const res of reservations ?? []) {
        const checkoutDate = res.check_out;
        const checkoutTime = res.confirmed_checkout_time ?? "11:00:00";
        const checkoutAt = `${checkoutDate}T${checkoutTime}+01:00`;
        await db
          .from("inspection_schedule")
          .upsert(
            { reservation_id: res.id, checkout_at: new Date(checkoutAt).toISOString() },
            { onConflict: "reservation_id", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();
      }

      const { data: ownerRow } = await db
        .from("reservations")
        .select("guest_name, check_in, check_out, properties!inner(name, owner_id)")
        .eq("booking_group_id", groupId)
        .limit(1)
        .maybeSingle();

      if (ownerRow) {
        const prop = ownerRow.properties as unknown as { name: string; owner_id: string };
        const { data: ownerProfile } = await db
          .from("profiles")
          .select("whatsapp_e164")
          .eq("id", prop.owner_id)
          .maybeSingle();
        if (ownerProfile?.whatsapp_e164) {
          const guestName = ownerRow.guest_name ?? "a guest";
          const propertyName = prop.name;
          const checkIn = ownerRow.check_in;
          const checkOut = ownerRow.check_out;
          const totalMinor = (await db
            .from("booking_groups")
            .select("charge_total_minor")
            .eq("id", groupId)
            .maybeSingle())?.data?.charge_total_minor ?? 0;
          const amountStr = `£${(totalMinor / 100).toFixed(2)}`;
          const msg = `New booking confirmed!\n\n${propertyName}\n${guestName}\n${checkIn} – ${checkOut}\nTotal: ${amountStr}`;
          await sendWhatsApp(ownerProfile.whatsapp_e164, msg).catch((err: unknown) => {
            log("stripe-webhook", "warn", `Owner WhatsApp notify failed: ${err instanceof Error ? err.message : err}`);
          });
        }
      }

      log("stripe-webhook", "info", `Confirmed group ${groupId} — reservations + inspection_schedule + owner notified`);
    }

    if (purpose === "deposit_hold" && intentId) {
      await db
        .from("deposit_holds")
        .update({ status: "held" })
        .eq("payment_intent_id", intentId);
    }
  }

  await db.from("audit_log").insert({
    action: `stripe.${event.type}`,
    target_id: event.id,
    detail: `Event ${event.type} (${(event.data.object as { id?: string }).id ?? "n/a"})`,
  });

  return NextResponse.json({ ok: true });
}
