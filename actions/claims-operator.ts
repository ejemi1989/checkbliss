"use server";

import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { checkOperatorGate } from "@/lib/operator-gate";
import { notifyBoth } from "@/lib/notifications";
import { getSession } from "@/actions/auth";
import { getOperatorClaims, getAdminProperties } from "@/lib/data";
import { getSeedProperties } from "@/lib/seed-data";
import type { ActionResponse, DamageClaim } from "@/lib/types";

const SubmitClaimSchema = z.object({
  propertyId: z.string().min(1),
  reservationId: z.string().optional(),
  guestName: z.string().min(1),
  bookingRef: z.string().optional(),
  stayDates: z.string().optional(),
  description: z.string().min(1),
  estimatedCostMinor: z.number().int().nonnegative(),
  photoCount: z.number().int().nonnegative().default(0),
  operatorNotes: z.string().optional(),
});

export type SubmitClaimInput = z.infer<typeof SubmitClaimSchema>;

/**
 * Operator submits a damage claim.
 *
 * Per structure.md, this is the operator's primary handoff to admin:
 * the operator physically inspects, documents, and submits; the admin
 * reviews/adjusts/rejects. The operator is then informed of the decision.
 *
 * City scoping: the operator must be assigned to the city of the property.
 */
export async function submitDamageClaim(
  input: SubmitClaimInput,
): Promise<ActionResponse<DamageClaim>> {
  const gate = await checkOperatorGate();
  if (!gate.ok) {
    return { ok: false, code: "OPERATOR_GATE", message: `Operator gate denied: ${gate.reason}` };
  }
  try {
    const data = SubmitClaimSchema.parse(input);
    const session = await getSession();
    const operatorId = session?.id;
    const assignedCities = session?.assignedCities ?? [];

    /* City scoping check — operator can only submit for properties in their cities. */
    const property = getAdminProperties().find((p) => p.id === data.propertyId)
      ?? getSeedProperties().find((p) => p.id === data.propertyId);
    if (!property) {
      return { ok: false, code: "NOT_FOUND", message: "Property not found." };
    }
    const propertyCity = (property as { city?: string }).city;
    if (propertyCity && !assignedCities.includes(propertyCity)) {
      return {
        ok: false,
        code: "CITY_SCOPE",
        message: `You are not assigned to ${propertyCity}. Claims can only be submitted for properties in your assigned cities.`,
      };
    }

    const now = new Date().toISOString();
    if (!supabaseAdminConfigured) {
      const claim: DamageClaim = {
        id: `C${Date.now()}`,
        reservation_id: data.reservationId ?? "N/A",
        property_id: data.propertyId,
        property_name: property ? (property as { name?: string }).name ?? data.propertyId : data.propertyId,
        guest_name: data.guestName,
        guest_email: "",
        booking_ref: data.bookingRef ?? "N/A",
        stay_dates: data.stayDates ?? "N/A",
        description: data.description,
        estimated_cost_minor: data.estimatedCostMinor,
        operator_notes: data.operatorNotes ?? "",
        photo_count: data.photoCount,
        admin_decision: "pending",
        adjusted_amount_minor: null,
        dispute_status: "none",
        submitted_at: now,
        decided_at: null,
        decided_by: null,
      };
      console.log(`[mock] Operator ${operatorId} submitted claim ${claim.id} for ${data.propertyId}`);
      // Notify admin + operator
      notifyBoth(
        "admin", undefined,
        "Damage claim submitted",
        `Operator ${session?.name ?? ""} submitted a claim for ${claim.property_name} — ${claim.description.slice(0, 80)}`,
        "/dashboard/operator",
        "/admin?view=claims",
        session?.role,
        operatorId,
      );
      return { ok: true, data: claim };
    }

    const db = createAdmin();
    const { data: inserted, error } = await db
      .from("damage_claims")
      .insert({
        property_id: data.propertyId,
        reservation_id: data.reservationId ?? null,
        guest_name: data.guestName,
        booking_ref: data.bookingRef ?? null,
        stay_dates: data.stayDates ?? null,
        description: data.description,
        estimated_cost_minor: data.estimatedCostMinor,
        operator_notes: data.operatorNotes ?? null,
        photo_count: data.photoCount,
        operator_id: operatorId,
        city: propertyCity,
        admin_decision: "pending",
        submitted_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    await db.from("audit_log").insert({
      action: "claim.submitted",
      target_id: inserted.id,
      actor_id: operatorId,
      detail: `Operator submitted claim for ${data.propertyId} — £${data.estimatedCostMinor / 100}`,
    });

    notifyBoth(
      "admin", undefined,
      "Damage claim submitted",
      `Operator ${session?.name ?? ""} submitted a claim — admin review required.`,
      "/dashboard/operator",
      "/admin?view=claims",
      session?.role,
      operatorId,
    );

    return { ok: true, data: inserted as DamageClaim };
  } catch (err) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: err instanceof Error ? err.message : "Unexpected error",
    };
  }
}

/** Operator fetches their city-scoped claims. */
export async function getOperatorClaimsAction(): Promise<ActionResponse<DamageClaim[]>> {
  const gate = await checkOperatorGate();
  if (!gate.ok) {
    return { ok: false, code: "OPERATOR_GATE", message: `Operator gate denied: ${gate.reason}` };
  }
  const session = await getSession();
  const cities = session?.assignedCities ?? [];
  return { ok: true, data: getOperatorClaims(cities) };
}
