"use server";

import { z } from "zod";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import type { ActionResponse } from "@/lib/types";

const LogVerificationSchema = z.object({
  propertyId: z.string().min(1),
  notes: z.string().optional(),
  photos: z.number().int().min(0).default(0),
});

export async function logVerification(
  input: z.infer<typeof LogVerificationSchema>,
): Promise<ActionResponse> {
  try {
    const { propertyId, notes, photos } = LogVerificationSchema.parse(input);

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Verification logged for property ${propertyId}${notes ? ` (notes: ${notes})` : ""}`);
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

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: err instanceof Error ? err.message : "Unexpected error",
    };
  }
}
