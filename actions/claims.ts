"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { captureFromHold, releaseHold } from "@/lib/stripe";
import type { ActionResponse, DamageClaim } from "@/lib/types";
import { getAdminClaims } from "@/lib/data";
import { getSeedProperties } from "@/lib/seed-data";
import { checkAdminGate } from "@/lib/admin-gate";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";

const DecisionSchema = z.object({
  claimId: z.string().uuid().or(z.string().min(1)),
  decision: z.enum(["approve", "adjust", "reject"]),
  amountMinor: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

function findOwnerForProperty(propertyId: string): string | undefined {
  return getSeedProperties().find((p) => p.id === propertyId)?.owner_id;
}

export async function decideClaim(
  input: z.infer<typeof DecisionSchema>,
): Promise<ActionResponse> {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return { ok: false, code: "ADMIN_GATE", message: `Admin gate denied: ${gate.reason}` };
  }
  try {
    const { claimId, decision, amountMinor } = DecisionSchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Claim ${claimId} ${decision}${amountMinor ? ` (amount: ${amountMinor})` : ""}`);
      const ownerId = findOwnerForProperty(claimId);
      notifyBoth(
        "owner", ownerId,
        `Claim ${decision}d`,
        `Claim ${claimId} was ${decision}d${amountMinor ? ` for £${amountMinor / 100}` : ""}.`,
        "/dashboard/owner",
        "/admin?view=claims",
        actorRole,
        actorId,
      );
      return { ok: true };
    }

    const db = createAdmin();
    const { data: claimRecord, error: claimError } = await db
      .from("damage_claims")
      .select("*, reservation:reservations(property_id, guest_id, guest_name, guest_email)")
      .eq("id", claimId)
      .maybeSingle();

    // Fall back to mock when Supabase is empty
    if (!claimRecord || claimError) {
      console.log(`[mock] Claim ${claimId} ${decision}${amountMinor ? ` (amount: ${amountMinor})` : ""}`);
      const ownerId = findOwnerForProperty(claimId);
      notifyBoth(
        "owner", ownerId,
        `Claim ${decision}d`,
        `Claim ${claimId} was ${decision}d${amountMinor ? ` for £${amountMinor / 100}` : ""}.`,
        "/dashboard/owner",
        "/admin?view=claims",
      );
      return { ok: true };
    }

    const holdIntentId = claimRecord.deposit_holds as Record<string, unknown> | undefined;
    const intentId = holdIntentId?.intent_id as string | undefined;

    if (decision === "reject") {
      if (intentId) await releaseHold(intentId);
    } else {
      const amount = decision === "approve"
        ? claimRecord.estimated_cost_minor as number
        : amountMinor;
      if (intentId && amount) await captureFromHold(intentId, amount);
    }

    const updateData: Record<string, unknown> = {
      admin_decision: decision,
      decided_at: new Date().toISOString(),
    };
    if (decision === "adjust" && amountMinor) {
      updateData.adjusted_amount_minor = amountMinor;
    }

    await db.from("damage_claims").update(updateData).eq("id", claimId);
    await db.from("audit_log").insert({
      action: "claim.decision",
      target_id: claimId,
      detail: `Claim ${decision}${amountMinor ? ` (amount: ${amountMinor})` : ""}`,
    });

    // Notify admin and property owner
    const reservation = claimRecord.reservation as Record<string, unknown> | undefined;
    const propertyId = reservation?.property_id as string | undefined;
    const ownerId = propertyId ? findOwnerForProperty(propertyId) : undefined;

    notifyBoth(
      "owner", ownerId,
      `Claim ${decision}d`,
      `Claim ${claimId} was ${decision}d${amountMinor ? ` for £${amountMinor / 100}` : ""}.`,
      "/dashboard/owner",
      "/admin?view=claims",
      actorRole,
      actorId,
    );

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: err instanceof Error ? err.message : "Unexpected error",
    };
  }
}

export async function getClaims(): Promise<ActionResponse<DamageClaim[]>> {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return { ok: false, code: "ADMIN_GATE", message: `Admin gate denied: ${gate.reason}` };
  }
  if (!supabaseAdminConfigured) {
    return { ok: true, data: getAdminClaims() };
  }
  try {
    const db = createAdmin();
    const { data } = await db
      .from("damage_claims")
      .select("*")
      .order("submitted_at", { ascending: false });
    return { ok: true, data: (data ?? []) as DamageClaim[] };
  } catch (err) {
    return {
      ok: false,
      code: "DB_ERROR",
      message: err instanceof Error ? err.message : "Failed to fetch claims",
    };
  }
}
