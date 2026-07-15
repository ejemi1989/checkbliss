"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ActionResponse } from "@/lib/types";
import { getSeedProperties } from "@/lib/seed-data";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";

const CurationActionSchema = z.object({
  propertyId: z.string().min(1),
  action: z.enum(["approve", "reject", "request_changes"]),
  reason: z.string().optional(),
});

function findOwnerForProperty(propertyId: string): string | undefined {
  return getSeedProperties().find((p) => p.id === propertyId)?.owner_id;
}

export async function decideCuration(
  input: z.infer<typeof CurationActionSchema>,
): Promise<ActionResponse> {
  try {
    const { propertyId, action, reason } = CurationActionSchema.parse(input);

    const actionLabels: Record<string, string> = {
      approve: "approved",
      reject: "rejected",
      request_changes: "changes requested",
    };
    const label = actionLabels[action];
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Property ${propertyId} ${action}${reason ? ` (reason: ${reason})` : ""}`);
      const ownerId = findOwnerForProperty(propertyId);
      notifyBoth(
        "owner", ownerId,
        `Property ${label}`,
        `Property ${propertyId} — ${label}${reason ? ` (${reason})` : ""}.`,
        "/dashboard/owner",
        "/admin?view=curation",
        actorRole,
        actorId,
      );
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

    // Notify admin and property owner
    const ownerId = findOwnerForProperty(propertyId);
    notifyBoth(
      "owner", ownerId,
      `Property ${label}`,
      `Property ${propertyId} — ${label}${reason ? ` (${reason})` : ""}.`,
      "/dashboard/owner",
      "/admin?view=curation",
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
