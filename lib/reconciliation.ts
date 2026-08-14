/**
 * Payment reconciliation — answers "if payment succeeds but booking creation
 * fails, how do we know the customer paid and recover/reconcile the booking?"
 *
 * Policy (documented in docs/payment-reconciliation.md):
 *   For every booking-charge PaymentIntent that Stripe reports as succeeded:
 *     - group exists and already confirmed            → nothing to do ("ok")
 *     - group exists but charge_status != succeeded   → webhook missed it;
 *       RECOVER: confirm reservations + group, create the inspection schedule,
 *       notify the owner (mirror of the webhook's payment_intent.succeeded path)
 *     - no group at all                               → orphaned payment;
 *       REFUND the charge (customer paid for nothing; dates were never held)
 *
 * Runs in both modes:
 *   - Mock mode: reads the in-memory intent ledger (lib/stripe.ts) and the
 *     mock booking-group registry (registered by the mock booking handler),
 *     so the "paid but webhook missed it" story is demonstrable with no creds.
 *   - Real mode: lists PaymentIntents from Stripe and joins against
 *     booking_groups via charge_intent_id; writes recovery + refunds.
 */
import "server-only";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase/admin";
import {
  getStripe,
  stripeConfigured,
  listMockPaymentIntents,
  mockRefundPaymentIntent,
  refundBookingCharge,
} from "@/lib/stripe";
import { log } from "@/lib/observability";
import { sendWhatsApp } from "@/lib/whatsapp";

/** How far back reconciliation looks for settled-but-unconfirmed intents. */
export const RECONCILE_LOOKBACK_DAYS = 7;

/* ------------------------------------------------------------------ */
/*  Mock booking-group registry (mirror of booking_groups)            */
/* ------------------------------------------------------------------ */

export interface MockBookingGroup {
  groupId: string;
  chargeIntentId: string;
  chargeStatus: string;
  status: string;
}

const mockGroups: MockBookingGroup[] = [];

export function registerMockBookingGroup(
  groupId: string,
  chargeIntentId: string,
  chargeStatus = "pending",
  status = "pending_payment",
): void {
  mockGroups.push({ groupId, chargeIntentId, chargeStatus, status });
}

export function getMockBookingGroups(): MockBookingGroup[] {
  return [...mockGroups];
}

export function resetMockBookingGroups(): void {
  mockGroups.length = 0;
}

export function confirmMockBookingGroup(groupId: string): void {
  const group = mockGroups.find((g) => g.groupId === groupId);
  if (group) {
    group.chargeStatus = "succeeded";
    group.status = "confirmed";
  }
}

/* ------------------------------------------------------------------ */
/*  Pure classification                                                */
/* ------------------------------------------------------------------ */

export type PaymentIntentLike = {
  id: string;
  status: string;
  metadata: Record<string, string> | null | undefined;
};

export type GroupLookup = { charge_status: string | null } | null;

export type IntentDisposition = "ok" | "recover" | "refund" | "skip";

/**
 * Decide what reconciliation should do with a payment intent, given whether a
 * booking group exists for it. Pure — unit-testable without Stripe/DB.
 */
export function classifyPaymentIntent(
  intent: PaymentIntentLike,
  group: GroupLookup,
): IntentDisposition {
  if (intent.status !== "succeeded") return "skip";
  if (intent.metadata?.type !== "booking_charge") return "skip";
  if (!group) return "refund";
  if (group.charge_status === "succeeded") return "ok";
  return "recover";
}

/* ------------------------------------------------------------------ */
/*  Orchestrator                                                       */
/* ------------------------------------------------------------------ */

export interface ReconciliationOutcome {
  intentId: string;
  groupId: string | null;
  disposition: Exclude<IntentDisposition, "skip">;
  detail: string;
}

export async function reconcilePaymentIntents(): Promise<ReconciliationOutcome[]> {
  if (supabaseAdminConfigured && stripeConfigured) {
    return reconcileReal();
  }
  return reconcileMock();
}

async function reconcileMock(): Promise<ReconciliationOutcome[]> {
  const outcomes: ReconciliationOutcome[] = [];
  const intents = listMockPaymentIntents().filter(
    (i) => i.metadata?.type === "booking_charge",
  );

  for (const intent of intents) {
    const group = mockGroups.find((g) => g.chargeIntentId === intent.id);
    const disposition = classifyPaymentIntent(
      { id: intent.id, status: intent.status, metadata: intent.metadata },
      group ? { charge_status: group.chargeStatus } : null,
    );

    if (disposition === "skip") continue;

    if (disposition === "ok") {
      outcomes.push({
        intentId: intent.id,
        groupId: group?.groupId ?? null,
        disposition,
        detail: "Already confirmed — nothing to do.",
      });
      continue;
    }

    if (disposition === "recover" && group) {
      confirmMockBookingGroup(group.groupId);
      outcomes.push({
        intentId: intent.id,
        groupId: group.groupId,
        disposition,
        detail: "Payment succeeded but booking not confirmed — booking recovered.",
      });
      continue;
    }

    // Orphaned payment: customer paid, no booking group exists.
    mockRefundPaymentIntent(intent.id);
    outcomes.push({
      intentId: intent.id,
      groupId: null,
      disposition: "refund",
      detail: "Orphaned payment (no booking group) — refunded to customer.",
    });
  }

  if (outcomes.length > 0) {
    log("reconcile", "info", `Mock reconciliation — ${outcomes.length} intent(s) evaluated`);
  }
  return outcomes;
}

async function reconcileReal(): Promise<ReconciliationOutcome[]> {
  const db = createAdmin();
  const outcomes: ReconciliationOutcome[] = [];

  const since = new Date();
  since.setDate(since.getDate() - RECONCILE_LOOKBACK_DAYS);

  const res = await getStripe().paymentIntents.list({
    limit: 100,
    created: { gte: Math.floor(since.getTime() / 1000) },
  });
  const intents = res.data;

  const bookingIntents = intents.filter((i) => i.metadata?.type === "booking_charge");
  if (bookingIntents.length === 0) return outcomes;

  const intentIds = bookingIntents.map((i) => i.id);
  const { data: groups } = await db
    .from("booking_groups")
    .select("id, charge_intent_id, charge_status")
    .in("charge_intent_id", intentIds);
  const groupByIntent = new Map(
    (groups ?? []).map((g) => [g.charge_intent_id as string, g]),
  );

  for (const intent of bookingIntents) {
    const group = groupByIntent.get(intent.id) ?? null;
    const disposition = classifyPaymentIntent(
      { id: intent.id, status: intent.status, metadata: intent.metadata ?? undefined },
      group ? { charge_status: group.charge_status } : null,
    );

    if (disposition === "skip") continue;

    if (disposition === "ok") {
      outcomes.push({
        intentId: intent.id,
        groupId: group?.id ?? null,
        disposition,
        detail: "Already confirmed — nothing to do.",
      });
      continue;
    }

    if (disposition === "recover" && group) {
      await confirmGroupFromReconciliation(db, group.id, {
        id: intent.id,
        latest_charge:
          typeof intent.latest_charge === "string" ? intent.latest_charge : null,
      });
      outcomes.push({
        intentId: intent.id,
        groupId: group.id,
        disposition,
        detail: "Payment succeeded but webhook did not confirm — booking recovered.",
      });
      continue;
    }

    // Orphaned payment — no booking group ever persisted. Refund the customer.
    const chargeId =
      (intent as { latest_charge?: string | null }).latest_charge ?? null;
    if (chargeId) {
      try {
        await refundBookingCharge({
          chargeId,
          bookingGroupId: intent.metadata?.booking_group_id ?? intent.id,
          reason: "duplicate",
        });
      } catch (err) {
        log("reconcile", "error", `Refund of orphaned intent ${intent.id} failed`, {
          error: String(err),
        });
      }
    }
    await db.from("reconciliation_log").insert({
      run_id: `reconcile-${new Date().toISOString().slice(0, 13)}`,
      intent_id: intent.id,
      group_id: null,
      disposition: "refunded",
      detail: "Orphaned payment — no booking group found. Refunded.",
    });
    outcomes.push({
      intentId: intent.id,
      groupId: null,
      disposition: "refund",
      detail: "Orphaned payment — refunded.",
    });
  }

  return outcomes;
}

/** Mirror of the webhook's payment_intent.succeeded handling. */
async function confirmGroupFromReconciliation(
  db: ReturnType<typeof createAdmin>,
  groupId: string,
  intent: { id: string; latest_charge?: string | null },
): Promise<void> {  await db
    .from("reservations")
    .update({ status: "confirmed", payment_intent_id: intent.id })
    .eq("booking_group_id", groupId)
    .eq("status", "pending_payment");

  const groupUpdate: Record<string, unknown> = { charge_status: "succeeded", status: "confirmed" };
  if (intent.latest_charge) groupUpdate.stripe_charge_id = intent.latest_charge;
  await db.from("booking_groups").update(groupUpdate).eq("id", groupId);

  const { data: reservations } = await db
    .from("reservations")
    .select("id, check_out, confirmed_checkout_time")
    .eq("booking_group_id", groupId)
    .eq("status", "confirmed");

  for (const res of reservations ?? []) {
    const checkoutTime = res.confirmed_checkout_time ?? "11:00:00";
    const checkoutAt = `${res.check_out}T${checkoutTime}+01:00`;
    await db
      .from("inspection_schedule")
      .upsert(
        { reservation_id: res.id, checkout_at: new Date(checkoutAt).toISOString() },
        { onConflict: "reservation_id", ignoreDuplicates: true },
      );
  }

  // Owner notification — same content as the webhook path.
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
      const checkIn = ownerRow.check_in;
      const checkOut = ownerRow.check_out;
      const totalMinor =
        (await db
          .from("booking_groups")
          .select("charge_total_minor")
          .eq("id", groupId)
          .maybeSingle())?.data?.charge_total_minor ?? 0;
      const msg = `New booking confirmed!\n\n${prop.name}\n${guestName}\n${checkIn} – ${checkOut}\nTotal: £${(totalMinor / 100).toFixed(2)}`;
      await sendWhatsApp(ownerProfile.whatsapp_e164, msg).catch((err: unknown) => {
        log("reconcile", "warn", `Owner WhatsApp notify failed: ${err instanceof Error ? err.message : err}`);
      });
    }
  }

  await db.from("reconciliation_log").insert({
    run_id: `reconcile-${new Date().toISOString().slice(0, 13)}`,
    intent_id: intent.id,
    group_id: groupId,
    disposition: "recovered",
    detail: "Payment succeeded but webhook did not confirm — booking recovered by reconciliation.",
  });

  log("reconcile", "info", `Recovered group ${groupId} from intent ${intent.id}`);
}
