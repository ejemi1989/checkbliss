"use server";

import { z } from "zod";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import type { ActionResponse } from "@/lib/types";

const DisputeSchema = z.object({
  claimId: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  reason: z.string().min(10),
});

export async function submitDispute(
  input: z.infer<typeof DisputeSchema>,
): Promise<ActionResponse> {
  try {
    const data = DisputeSchema.parse(input);

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Dispute submitted for claim ${data.claimId} by ${data.guestName}`);
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("damage_claims").update({ dispute_status: "open" }).eq("id", data.claimId);
    await db.from("audit_log").insert({
      action: "claim.dispute",
      target_id: data.claimId,
      detail: `Dispute by ${data.guestName}: ${data.reason}`,
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
