"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ActionResponse } from "@/lib/types";
import { getSeedProperties } from "@/lib/seed-data";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";

const LogVerificationSchema = z.object({
  propertyId: z.string().min(1),
  notes: z.string().optional(),
  photos: z.number().int().min(0).default(0),
});

function findOwner(propertyId: string): string | undefined {
  return getSeedProperties().find((p) => p.id === propertyId)?.owner_id;
}

export async function logVerification(
  input: z.infer<typeof LogVerificationSchema>,
): Promise<ActionResponse> {
  try {
    const { propertyId, notes, photos } = LogVerificationSchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Verification logged for property ${propertyId}${notes ? ` (notes: ${notes})` : ""}`);
      const ownerId = findOwner(propertyId);
      notifyBoth(
        "owner", ownerId,
        "Verification logged",
        `Verification logged for property ${propertyId}${notes ? `: ${notes}` : ""}.`,
        "/dashboard/owner",
        "/admin?view=verification",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("verification_log").insert({
      property_id: propertyId,
      notes,
      photos,
      logged_at: new Date().toISOString(),
    });
    await db.from("audit_log").insert({
      action: "verification.log",
      target_id: propertyId,
      detail: notes,
    });

    const ownerId = findOwner(propertyId);
    notifyBoth(
      "owner", ownerId,
      "Verification logged",
      `Verification logged for property ${propertyId}${notes ? `: ${notes}` : ""}.`,
      "/dashboard/owner",
      "/admin?view=verification",
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
