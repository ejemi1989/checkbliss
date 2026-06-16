"use server";

import { z } from "zod";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import type { ActionResponse } from "@/lib/types";

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

export async function startInspection(
  input: z.infer<typeof StartInspectionSchema>,
): Promise<ActionResponse> {
  try {
    const { inspectionId } = StartInspectionSchema.parse(input);

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Inspection ${inspectionId} started`);
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("inspections").update({ status: "in_progress" }).eq("id", inspectionId);
    await db.from("audit_log").insert({
      action: "inspection.start",
      target_id: inspectionId,
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

export async function completeInspection(
  input: z.infer<typeof CompleteInspectionSchema>,
): Promise<ActionResponse> {
  try {
    const { inspectionId, notes } = CompleteInspectionSchema.parse(input);

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Inspection ${inspectionId} completed${notes ? ` (notes: ${notes})` : ""}`);
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

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Inspection ${inspectionId} escalated (reason: ${reason})`);
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("inspections").update({ status: "escalated" }).eq("id", inspectionId);
    await db.from("audit_log").insert({
      action: "inspection.escalate",
      target_id: inspectionId,
      detail: reason,
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
