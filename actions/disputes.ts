"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ActionResponse } from "@/lib/types";
import { getSeedProperties } from "@/lib/seed-data";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";

const DisputeSchema = z.object({
  claimId: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  reason: z.string().min(10),
});

function findOwner(propertyId: string): string | undefined {
  return getSeedProperties().find((p) => p.id === propertyId)?.owner_id;
}

export async function submitDispute(
  input: z.infer<typeof DisputeSchema>,
): Promise<ActionResponse> {
  try {
    const data = DisputeSchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Dispute submitted for claim ${data.claimId} by ${data.guestName}`);
      const ownerId = findOwner(data.claimId);
      notifyBoth(
        "owner", ownerId,
        "Claim disputed",
        `${data.guestName} disputed claim ${data.claimId}. Reason: ${data.reason}`,
        "/dashboard/owner",
        "/admin?view=claims",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("damage_claims").update({ dispute_status: "open" }).eq("id", data.claimId);
    await db.from("audit_log").insert({
      action: "claim.dispute",
      target_id: data.claimId,
      detail: `Dispute by ${data.guestName}: ${data.reason}`,
    });

    const ownerId = findOwner(data.claimId);
    notifyBoth(
      "owner", ownerId,
      "Claim disputed",
      `${data.guestName} disputed claim ${data.claimId}. Reason: ${data.reason}`,
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
