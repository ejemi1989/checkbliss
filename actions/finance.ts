"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { refundBookingCharge } from "@/lib/stripe";
import { computeSplit } from "@/lib/payouts";
import { log } from "@/lib/observability";

/* ---------- Refund booking charge ---------- */

const RefundSchema = z.object({
  bookingGroupId: z.string().min(1),
  amountMinor: z.number().int().min(1).optional(),
  refundApplicationFee: z.boolean().optional().default(false),
  reason: z.enum(["requested_by_customer", "duplicate", "fraudulent"]).optional().default("requested_by_customer"),
});

export async function refundBooking(groupId: string, amountMinor?: number, reason?: string) {
  if (!supabaseAdminConfigured) {
    console.log(`[mock:refund] Refund for group ${groupId}, amount ${amountMinor ?? "full"}, reason: ${reason ?? "requested_by_customer"}`);
    return { ok: true };
  }

  try {
    const db = createAdmin();
    const { data: group, error } = await db
      .from("booking_groups")
      .select("id, stripe_charge_id, charge_total_minor, commission_minor, owner_share_minor, charge_status")
      .eq("id", groupId)
      .maybeSingle();

    if (error || !group) return { ok: false, code: "NOT_FOUND", message: "Booking group not found" };
    if (!group.stripe_charge_id) return { ok: false, code: "NO_CHARGE", message: "No Stripe charge to refund" };

    const refundReason = (reason as "requested_by_customer" | "duplicate" | "fraudulent") ?? "requested_by_customer";
    const isFullRefund = !amountMinor || amountMinor >= group.charge_total_minor;

    const { refundId } = await refundBookingCharge({
      chargeId: group.stripe_charge_id,
      amountMinor: isFullRefund ? undefined : amountMinor,
      refundApplicationFee: isFullRefund,
      reason: refundReason,
      bookingGroupId: groupId,
    });

    const refundAmount = isFullRefund ? group.charge_total_minor : amountMinor;

    await db.from("booking_groups")
      .update({
        refunded_minor: refundAmount,
        charge_status: isFullRefund ? "refunded" : "partially_refunded",
        platform_payout_status: isFullRefund ? "failed" : "pending",
        owner_payout_status: isFullRefund ? "refunded" : "pending",
      })
      .eq("id", groupId);

    if (isFullRefund) {
      await db.from("owner_payouts")
        .update({ status: "refunded" })
        .eq("booking_group_id", groupId);
    }

    await db.from("audit_log").insert({
      action: "booking.refunded",
      target_id: groupId,
      detail: `Group ${groupId} — refunded ${refundAmount} (${isFullRefund ? "full" : "partial"}), reason: ${refundReason}, refund id: ${refundId}`,
    });

    log("finance", "info", `Refunded ${refundAmount} on group ${groupId}`);
    revalidatePath("/admin");
    revalidatePath("/admin/finance");
    return { ok: true, refundId };
  } catch (err) {
    log("finance", "error", `Refund failed for group ${groupId}: ${String(err)}`);
    return { ok: false, code: "REFUND_FAILED", message: String(err) };
  }
}

/* ---------- Payout actions ---------- */

export async function approvePayout(payoutId: string) {
  if (!supabaseAdminConfigured) {
    console.log(`[mock] Payout ${payoutId} approved`);
    revalidatePath("/admin/finance");
    return { ok: true };
  }

  try {
    const db = createAdmin();
    await db.from("owner_payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payoutId);

    await db.from("audit_log").insert({
      action: "payout.approved",
      target_id: payoutId,
      detail: `Payout ${payoutId} approved`,
    });

    revalidatePath("/admin/finance");
    return { ok: true };
  } catch (err) {
    return { ok: false, code: "APPROVE_FAILED", message: String(err) };
  }
}

export async function rejectPayout(payoutId: string, reason: string) {
  if (!supabaseAdminConfigured) {
    console.log(`[mock] Payout ${payoutId} rejected: ${reason}`);
    revalidatePath("/admin/finance");
    return { ok: true };
  }

  try {
    const db = createAdmin();
    await db.from("owner_payouts")
      .update({ status: "failed", last_error: reason })
      .eq("id", payoutId);

    await db.from("audit_log").insert({
      action: "payout.rejected",
      target_id: payoutId,
      detail: `Payout ${payoutId} rejected: ${reason}`,
    });

    revalidatePath("/admin/finance");
    return { ok: true };
  } catch (err) {
    return { ok: false, code: "REJECT_FAILED", message: String(err) };
  }
}

export async function flagDiscrepancy(recordId: string) {
  if (!supabaseAdminConfigured) {
    console.log(`[mock] Discrepancy flagged for ${recordId}`);
    revalidatePath("/admin/finance");
    return { ok: true };
  }

  await log("finance", "warn", `Discrepancy flagged: ${recordId}`);
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function resolveAlert(alertId: string) {
  if (!supabaseAdminConfigured) {
    console.log(`[mock] Alert ${alertId} resolved`);
    revalidatePath("/admin/finance");
    return { ok: true };
  }

  try {
    const db = createAdmin();
    await db.from("payout_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    revalidatePath("/admin/finance");
    return { ok: true };
  } catch (err) {
    return { ok: false, code: "RESOLVE_FAILED", message: String(err) };
  }
}
