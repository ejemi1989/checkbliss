import { NextRequest, NextResponse } from "next/server";
import { stripeConfigured } from "@/lib/stripe";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { checkAndProcess } from "@/lib/idempotency";
import { enqueue } from "@/lib/outbox";
import { log } from "@/lib/observability";
import { routeStripeEvent } from "@/lib/stripe-events";
import Stripe from "stripe";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-06-24.dahlia",
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
        .update({ charge_status: action.chargeStatus })
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

    if (action.kind === "log_dispute") {
      await db.from("audit_log").insert({
        action: "stripe.dispute.created",
        target_id: action.disputeId,
        detail: `Dispute for charge ${action.chargeId}`,
      });
      enqueue("email", "admin@placeholder", `Dispute ${action.disputeId} on charge ${action.chargeId}`, "Dispute Alert");
      continue;
    }
  }

  await db.from("audit_log").insert({
    action: `stripe.${event.type}`,
    target_id: event.id,
    detail: `Event ${event.type} (${(event.data.object as { id?: string }).id ?? "n/a"})`,
  });

  return NextResponse.json({ ok: true });
}
