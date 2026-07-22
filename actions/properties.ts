"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ActionResponse } from "@/lib/types";
import { getSeedProperties } from "@/lib/seed-data";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";

export const CreatePropertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  city: z.string().min(1),
  neighbourhood: z.string().optional().default(""),
  address: z.string().optional().default(""),
  bedrooms: z.number().int().min(1).default(1),
  bathrooms: z.number().int().min(1).default(1),
  max_guests: z.number().int().min(1).default(2),
  nightly_rate_minor: z.number().int().min(0).default(0),
  description: z.string().optional().default(""),
  owner_name: z.string().min(1, "Owner name is required"),
  owner_email: z.string().email("Valid owner email required"),
  owner_phone: z.string().optional().default(""),
});

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

export async function createProperty(
  input: z.infer<typeof CreatePropertySchema>,
): Promise<ActionResponse & { property_id?: string }> {
  try {
    const parsed = CreatePropertySchema.parse(input);
    const session = await getSession();
    const actorRole = session?.role;

    if (!supabaseAdminConfigured) {
      const mockId = `PR${Date.now()}`;
      console.log(`[mock] Property created: ${mockId}`, parsed);
      return { ok: true, property_id: mockId };
    }

    const db = createAdmin();

    const slug = parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const owner = await db
      .from("profiles")
      .select("id")
      .eq("email", parsed.owner_email)
      .eq("role", "owner")
      .maybeSingle();

    let ownerId: string;
    if (owner?.data) {
      ownerId = (owner.data as Record<string, unknown>).id as string;
    } else {
      const { data: newOwner } = await db
        .from("profiles")
        .insert({
          full_name: parsed.owner_name,
          email: parsed.owner_email,
          phone: parsed.owner_phone,
          role: "owner",
        })
        .select("id")
        .single();
      ownerId = (newOwner as Record<string, unknown>).id as string;
    }

    const { data: prop, error } = await db
      .from("properties")
      .insert({
        name: parsed.name,
        slug,
        building_name: parsed.name,
        city: parsed.city,
        neighbourhood: parsed.neighbourhood || parsed.city,
        bedrooms: parsed.bedrooms,
        bathrooms: parsed.bathrooms,
        max_guests: parsed.max_guests,
        nightly_rate_minor: parsed.nightly_rate_minor,
        description: parsed.description,
        owner_id: ownerId,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !prop) {
      return { ok: false, code: "DB_ERROR", message: error?.message ?? "Failed to create property" };
    }

    const propId = (prop as Record<string, unknown>).id as string;

    await db.from("audit_log").insert({
      action: "property.created",
      target_id: propId,
      detail: `Operator sourced "${parsed.name}" in ${parsed.city}${actorRole ? ` by ${actorRole}` : ""} — owner: ${parsed.owner_email}`,
    });

    return { ok: true, property_id: propId };
  } catch (err) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: err instanceof Error ? err.message : "Unexpected error",
    };
  }
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
