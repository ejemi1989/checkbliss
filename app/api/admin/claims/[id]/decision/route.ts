import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { captureFromHold, releaseHold } from "@/lib/stripe";
import { checkAdminGate } from "@/lib/admin-gate";

const DecisionBody = z.object({
  decision: z.enum(["approve", "adjust", "reject"]),
  amountMinor: z.number().int().positive().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return NextResponse.json({ error: "Admin gate denied", reason: gate.reason }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = DecisionBody.parse(await request.json());

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Claim ${id} ${body.decision}`);
      return NextResponse.json({ ok: true });
    }

    const db = createAdmin();
    const { data: claim } = await db
      .from("damage_claims")
      .select("*, deposit_holds (intent_id, amount_minor)")
      .eq("id", id)
      .single();

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const hold = (claim as Record<string, unknown>).deposit_holds as Record<string, unknown> | undefined;
    const intentId = (hold?.intent_id as string) ?? null;

    if (body.decision === "reject") {
      if (intentId) await releaseHold(intentId);
    } else {
      const amount = body.decision === "approve"
        ? (claim as Record<string, unknown>).estimated_cost_minor as number
        : body.amountMinor;
      if (intentId && amount) await captureFromHold(intentId, amount);
    }

    const updateData: Record<string, unknown> = {
      admin_decision: body.decision,
      decided_at: new Date().toISOString(),
    };
    if (body.decision === "adjust" && body.amountMinor) {
      updateData.adjusted_amount_minor = body.amountMinor;
    }

    await db.from("damage_claims").update(updateData).eq("id", id);
    await db.from("audit_log").insert({
      action: "claim.decision",
      target_id: id,
      detail: `${body.decision} via HTTP${body.amountMinor ? ` (amount: ${body.amountMinor})` : ""}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof z.ZodError
          ? err.issues.map((e) => e.message).join(", ")
          : "Decision failed",
      },
      { status: 400 },
    );
  }
}
