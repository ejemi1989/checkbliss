"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ActionResponse } from "@/lib/types";
import { getSeedProperties } from "@/lib/seed-data";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";

const StartInspectionSchema = z.object({
  inspectionId: z.string().min(1),
});

const CompleteInspectionSchema = z.object({
  inspectionId: z.string().min(1),
  notes: z.string().optional(),
});

const EscalateInspectionSchema = z.object({
  inspectionId: z.string().min(1),
  reason: z.string().min(1),
});

function findOwner(propertyId: string): string | undefined {
  return getSeedProperties().find((p) => p.id === propertyId)?.owner_id;
}

export async function startInspection(
  input: z.infer<typeof StartInspectionSchema>,
): Promise<ActionResponse> {
  try {
    const { inspectionId } = StartInspectionSchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Inspection ${inspectionId} started`);
      const ownerId = findOwner(inspectionId);
      notifyBoth(
        "owner", ownerId,
        "Inspection started",
        `Inspection ${inspectionId} has started.`,
        "/dashboard/owner",
        "/admin?view=inspections",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("inspections").update({ status: "in_progress" }).eq("id", inspectionId);
    await db.from("audit_log").insert({
      action: "inspection.start",
      target_id: inspectionId,
    });

    const ownerId = findOwner(inspectionId);
    notifyBoth(
      "owner", ownerId,
      "Inspection started",
      `Inspection ${inspectionId} has started.`,
      "/dashboard/owner",
      "/admin?view=inspections",
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

export async function completeInspection(
  input: z.infer<typeof CompleteInspectionSchema>,
): Promise<ActionResponse> {
  try {
    const { inspectionId, notes } = CompleteInspectionSchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Inspection ${inspectionId} completed${notes ? ` (notes: ${notes})` : ""}`);
      const ownerId = findOwner(inspectionId);
      notifyBoth(
        "owner", ownerId,
        "Inspection completed",
        `Inspection ${inspectionId} completed${notes ? `: ${notes}` : ""}.`,
        "/dashboard/owner",
        "/admin?view=inspections",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("inspections").update({
      status: "completed",
      notes,
      completed_at: new Date().toISOString(),
    }).eq("id", inspectionId);
    await db.from("audit_log").insert({
      action: "inspection.complete",
      target_id: inspectionId,
      detail: notes,
    });

    const ownerId = findOwner(inspectionId);
    notifyBoth(
      "owner", ownerId,
      "Inspection completed",
      `Inspection ${inspectionId} completed${notes ? `: ${notes}` : ""}.`,
      "/dashboard/owner",
      "/admin?view=inspections",
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

export async function escalateInspection(
  input: z.infer<typeof EscalateInspectionSchema>,
): Promise<ActionResponse> {
  try {
    const { inspectionId, reason } = EscalateInspectionSchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Inspection ${inspectionId} escalated (reason: ${reason})`);
      const ownerId = findOwner(inspectionId);
      notifyBoth(
        "owner", ownerId,
        "Inspection escalated",
        `Inspection ${inspectionId} escalated: ${reason}.`,
        "/dashboard/owner",
        "/admin?view=inspections",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("inspections").update({ status: "escalated" }).eq("id", inspectionId);
    await db.from("audit_log").insert({
      action: "inspection.escalate",
      target_id: inspectionId,
      detail: reason,
    });

    const ownerId = findOwner(inspectionId);
    notifyBoth(
      "owner", ownerId,
      "Inspection escalated",
      `Inspection ${inspectionId} escalated: ${reason}.`,
      "/dashboard/owner",
      "/admin?view=inspections",
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
