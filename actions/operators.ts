"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ActionResponse, Operator } from "@/lib/types";
import { getAdminOperators } from "@/lib/data";
import { getSeedProperties } from "@/lib/seed-data";
import { checkAdminGate } from "@/lib/admin-gate";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";

const CreateOperatorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  assignedCities: z.array(z.string()).min(1),
});

const SuspendOperatorSchema = z.object({
  operatorId: z.string().min(1),
});

const SuspendPropertySchema = z.object({
  propertyId: z.string().min(1),
  reason: z.string().optional(),
});

export async function createOperator(
  input: z.infer<typeof CreateOperatorSchema>,
): Promise<ActionResponse<Operator>> {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return { ok: false, code: "ADMIN_GATE", message: `Admin gate denied: ${gate.reason}` };
  }
  try {
    const data = CreateOperatorSchema.parse(input);

    if (!supabaseAdminConfigured) {
      const op: Operator = {
        id: `OP${Date.now()}`,
        name: data.name,
        email: data.email,
        city: data.assignedCities[0],
        assigned_cities: data.assignedCities,
        properties_count: 0,
        verified_count: 0,
        status: "onboarding",
        quality_score: 0,
        inspections_done: 0,
        created_at: new Date().toISOString().split("T")[0],
      };
      console.log(`[mock] Created operator: ${op.name} (${op.city})`);
      notifyBoth(
        "operator", op.id,
        "New operator onboarded",
        `${op.name} assigned to ${data.assignedCities.join(", ")} — onboarding in progress.`,
        "/dashboard/operator",
        "/admin?view=operators",
      );
      return { ok: true, data: op };
    }

    const db = createAdmin();
    const { data: inserted, error } = await db
      .from("operators")
      .insert({
        name: data.name,
        email: data.email,
        assigned_cities: data.assignedCities,
        city: data.assignedCities[0],
        status: "onboarding",
      })
      .select()
      .single();

    if (error) throw error;

    await db.from("audit_log").insert({
      action: "operator.created",
      target_id: inserted.id,
      detail: `Operator ${inserted.name} created, assigned to ${data.assignedCities.join(", ")}`,
    });

    notifyBoth(
      "operator", inserted.id,
      "New operator onboarded",
      `${inserted.name} assigned to ${data.assignedCities.join(", ")} — onboarding in progress.`,
      "/dashboard/operator",
      "/admin?view=operators",
    );

    return { ok: true, data: inserted as Operator };
  } catch (err) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: err instanceof Error ? err.message : "Unexpected error",
    };
  }
}

export async function suspendProperty(
  input: z.infer<typeof SuspendPropertySchema>,
): Promise<ActionResponse> {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return { ok: false, code: "ADMIN_GATE", message: `Admin gate denied: ${gate.reason}` };
  }
  try {
    const { propertyId, reason } = SuspendPropertySchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Property ${propertyId} suspended${reason ? ` (reason: ${reason})` : ""}`);
      const ownerId = getPropertyOwner(propertyId);
      notifyBoth(
        "owner", ownerId,
        "Property suspended",
        `Property ${propertyId} suspended${reason ? ` — ${reason}` : ""}.`,
        "/dashboard/owner",
        "/admin?view=properties",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("properties").update({ status: "suspended" }).eq("id", propertyId);
    await db.from("audit_log").insert({
      action: "property.suspended",
      target_id: propertyId,
      detail: reason || "Suspended by admin",
    });

    const ownerId = getPropertyOwner(propertyId);
    notifyBoth(
      "owner", ownerId,
      "Property suspended",
      `Property ${propertyId} suspended${reason ? ` — ${reason}` : ""}.`,
      "/dashboard/owner",
      "/admin?view=properties",
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

const UpdateOperatorSchema = z.object({
  operatorId: z.string().min(1),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  assignedCities: z.array(z.string()).min(1).optional(),
});

export async function updateOperator(
  input: z.infer<typeof UpdateOperatorSchema>,
): Promise<ActionResponse<Operator>> {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return { ok: false, code: "ADMIN_GATE", message: `Admin gate denied: ${gate.reason}` };
  }
  try {
    const data = UpdateOperatorSchema.parse(input);

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Operator ${data.operatorId} updated`, data);
      notifyBoth(
        "operator", data.operatorId,
        "Operator updated",
        `Your profile was updated by admin.`,
        "/dashboard/operator",
        "/admin?view=operators",
      );
      return { ok: true };
    }

    const db = createAdmin();
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.assignedCities) {
      updateData.assigned_cities = data.assignedCities;
      updateData.city = data.assignedCities[0];
    }

    await db.from("operators").update(updateData).eq("id", data.operatorId);
    await db.from("audit_log").insert({
      action: "operator.updated",
      target_id: data.operatorId,
      detail: Object.keys(updateData).join(", "),
    });

    notifyBoth(
      "operator", data.operatorId,
      "Operator updated",
      `Your profile was updated by admin.`,
      "/dashboard/operator",
      "/admin?view=operators",
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

export async function suspendOperator(
  input: z.infer<typeof SuspendOperatorSchema>,
): Promise<ActionResponse> {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return { ok: false, code: "ADMIN_GATE", message: `Admin gate denied: ${gate.reason}` };
  }
  try {
    const { operatorId } = SuspendOperatorSchema.parse(input);

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Operator ${operatorId} suspended`);
      notifyBoth(
        "operator", operatorId,
        "Account suspended",
        "Your operator account has been suspended. Contact admin for details.",
        "/dashboard/operator",
        "/admin?view=operators",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("operators").update({ status: "suspended" }).eq("id", operatorId);
    await db.from("audit_log").insert({
      action: "operator.suspended",
      target_id: operatorId,
    });

    notifyBoth(
      "operator", operatorId,
      "Account suspended",
      "Your operator account has been suspended. Contact admin for details.",
      "/dashboard/operator",
      "/admin?view=operators",
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

export async function getOperators(): Promise<ActionResponse<Operator[]>> {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return { ok: false, code: "ADMIN_GATE", message: `Admin gate denied: ${gate.reason}` };
  }
  if (!supabaseAdminConfigured) {
    return { ok: true, data: getAdminOperators() };
  }
  try {
    const db = createAdmin();
    const { data } = await db.from("operators").select("*").order("created_at", { ascending: false });
    return { ok: true, data: (data ?? []) as Operator[] };
  } catch (err) {
    return {
      ok: false,
      code: "DB_ERROR",
      message: err instanceof Error ? err.message : "Failed to fetch operators",
    };
  }
}

function getPropertyOwner(propertyId: string): string | undefined {
  return getSeedProperties().find((p) => p.id === propertyId)?.owner_id;
}
