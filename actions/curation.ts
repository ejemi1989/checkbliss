"use server";

import { z } from "zod";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import type { ActionResponse } from "@/lib/types";

const CurationActionSchema = z.object({
  propertyId: z.string().min(1),
  action: z.enum(["approve", "reject", "request_changes"]),
  reason: z.string().optional(),
});

export async function decideCuration(
  input: z.infer<typeof CurationActionSchema>,
): Promise<ActionResponse> {
  try {
    const { propertyId, action, reason } = CurationActionSchema.parse(input);

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Property ${propertyId} ${action}${reason ? ` (reason: ${reason})` : ""}`);
      return { ok: true };
    }

    const db = createAdmin();
    const statusMap: Record<string, string> = {
      approve: "approved",
      reject: "suspended",
      request_changes: "draft",
    };

    await db.from("properties").update({ status: statusMap[action] }).eq("id", propertyId);

    if (reason) {
      await db.from("audit_log").insert({
        action: `curation.${action}`,
        target_id: propertyId,
        detail: reason,
      });
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: err instanceof Error ? err.message : "Unexpected error",
    };
  }
}
