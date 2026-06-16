"use server";

import { z } from "zod";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import { captureFromHold, releaseHold } from "@/lib/airwallex";
import type { ActionResponse, DamageClaim } from "@/lib/types";
import { getAdminClaims } from "@/lib/data";

const DecisionSchema = z.object({
  claimId: z.string().uuid().or(z.string().min(1)),
  decision: z.enum(["approve", "adjust", "reject"]),
  amountMinor: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

export async function decideClaim(
  input: z.infer<typeof DecisionSchema>,
): Promise<ActionResponse> {
  try {
    const { claimId, decision, amountMinor } = DecisionSchema.parse(input);

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Claim ${claimId} ${decision}${amountMinor ? ` (amount: ${amountMinor})` : ""}`);
      return { ok: true };
    }

    const db = createAdmin();
    const claim = await db
      .from("damage_claims")
      .select("*, deposit_holds (intent_id, amount_minor)")
      .eq("id", claimId)
      .single();

    if (!claim.data) {
      return { ok: false, code: "NOT_FOUND", message: "Claim not found." };
    }

    const holdIntentId = (claim.data as Record<string, unknown>).deposit_holds as Record<string, unknown> | undefined;
    const intentId = holdIntentId?.intent_id as string | undefined;

    if (decision === "reject") {
      if (intentId) await releaseHold(intentId);
    } else {
      const amount = decision === "approve"
        ? (claim.data as Record<string, unknown>).estimated_cost_minor as number
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
