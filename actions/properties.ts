"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ActionResponse } from "@/lib/types";
import { getSeedProperties } from "@/lib/seed-data";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";

const UpdatePropertySchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  nightly_rate_minor: z.number().int().positive().optional(),
  extended_checkout_offered: z.boolean().optional(),
  extended_checkout_price_minor: z.number().int().positive().optional(),
});

const VerifyPropertySchema = z.object({
  propertyId: z.string().min(1),
  operatorId: z.string().min(1),
  photos: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

const BlockDatesSchema = z.object({
  propertyId: z.string().min(1),
  starts: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function findOwner(propertyId: string): string | undefined {
  return getSeedProperties().find((p) => p.id === propertyId)?.owner_id;
}

export async function updateProperty(
  input: z.infer<typeof UpdatePropertySchema>,
): Promise<ActionResponse> {
  try {
    const parsed = UpdatePropertySchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Property ${parsed.propertyId} updated`, parsed);
      const ownerId = findOwner(parsed.propertyId);
      notifyBoth(
        "owner", ownerId,
        "Property updated",
        `Property ${parsed.propertyId} details were updated.`,
        "/dashboard/owner",
        "/admin?view=properties",
      );
      return { ok: true };
    }

    const db = createAdmin();
    const updateData: Record<string, unknown> = {};
    if (parsed.name) updateData.name = parsed.name;
    if (parsed.description) updateData.description = parsed.description;
    if (parsed.nightly_rate_minor) updateData.nightly_rate_minor = parsed.nightly_rate_minor;
    if (parsed.extended_checkout_offered !== undefined) updateData.extended_checkout_offered = parsed.extended_checkout_offered;
    if (parsed.extended_checkout_price_minor !== undefined) updateData.extended_checkout_price_minor = parsed.extended_checkout_price_minor;

    await db.from("properties").update(updateData).eq("id", parsed.propertyId);
    await db.from("audit_log").insert({
      action: "property.updated",
      target_id: parsed.propertyId,
      detail: Object.keys(updateData).join(", "),
    });

    const ownerId = findOwner(parsed.propertyId);
    notifyBoth(
      "owner", ownerId,
      "Property updated",
      `Property ${parsed.propertyId} details were updated.`,
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

export async function verifyProperty(
  input: z.infer<typeof VerifyPropertySchema>,
): Promise<ActionResponse> {
  try {
    const { propertyId, operatorId, photos, notes } = VerifyPropertySchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Property ${propertyId} verified by operator ${operatorId}`);
      const ownerId = findOwner(propertyId);
      notifyBoth(
        "owner", ownerId,
        "Property verified",
        `Property ${propertyId} was verified by operator ${operatorId}.`,
        "/dashboard/owner",
        "/admin?view=verification",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("verification_log").insert({
      property_id: propertyId,
      operator_id: operatorId,
      photos,
      notes,
      logged_at: new Date().toISOString(),
    });

    await db.from("properties").update({ status: "approved" }).eq("id", propertyId);
    await db.from("audit_log").insert({
      action: "property.verified",
      target_id: propertyId,
      detail: `Verified by operator ${operatorId}${notes ? `: ${notes}` : ""}`,
    });

    const ownerId = findOwner(propertyId);
    notifyBoth(
      "owner", ownerId,
      "Property verified",
      `Property ${propertyId} was verified by operator ${operatorId}.`,
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

export async function blockDates(
  input: z.infer<typeof BlockDatesSchema>,
): Promise<ActionResponse> {
  try {
    const { propertyId, starts, ends } = BlockDatesSchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (new Date(ends) <= new Date(starts)) {
      return { ok: false, code: "INVALID_RANGE", message: "End date must be after start date." };
    }

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Dates blocked for ${propertyId}: ${starts} to ${ends}`);
      const ownerId = findOwner(propertyId);
      notifyBoth(
        "owner", ownerId,
        "Dates blocked",
        `Dates ${starts} to ${ends} blocked for property ${propertyId}.`,
        "/dashboard/owner",
        "/admin?view=properties",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db.from("availability_blocks").insert({
      property_id: propertyId,
      starts,
      ends,
      source: "whatsapp",
    });

    await db.from("audit_log").insert({
      action: "availability.blocked",
      target_id: propertyId,
      detail: `${starts} to ${ends}`,
    });

    const ownerId = findOwner(propertyId);
    notifyBoth(
      "owner", ownerId,
      "Dates blocked",
      `Dates ${starts} to ${ends} blocked for property ${propertyId}.`,
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

export async function unblockDates(
  input: z.infer<typeof BlockDatesSchema>,
): Promise<ActionResponse> {
  try {
    const { propertyId, starts, ends } = BlockDatesSchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;
    const actorId = session?.id;

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Dates unblocked for ${propertyId}: ${starts} to ${ends}`);
      const ownerId = findOwner(propertyId);
      notifyBoth(
        "owner", ownerId,
        "Dates unblocked",
        `Dates ${starts} to ${ends} unblocked for property ${propertyId}.`,
        "/dashboard/owner",
        "/admin?view=properties",
      );
      return { ok: true };
    }

    const db = createAdmin();
    await db
      .from("availability_blocks")
      .delete()
      .eq("property_id", propertyId)
      .eq("starts", starts)
      .eq("ends", ends);

    await db.from("audit_log").insert({
      action: "availability.unblocked",
      target_id: propertyId,
      detail: `${starts} to ${ends}`,
    });

    const ownerId = findOwner(propertyId);
    notifyBoth(
      "owner", ownerId,
      "Dates unblocked",
      `Dates ${starts} to ${ends} unblocked for property ${propertyId}.`,
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
