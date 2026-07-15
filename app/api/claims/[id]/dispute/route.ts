import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";

const DisputeSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = DisputeSchema.parse(await request.json());

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Dispute submitted for claim ${id}: ${body.reason}`);
      return NextResponse.json({
        ok: true,
        dispute_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const db = createAdmin();
    const { data: claim } = await db
      .from("damage_claims")
      .select("id, dispute_status")
      .eq("id", id)
      .single();

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (claim.dispute_status !== "none") {
      return NextResponse.json({ error: "A dispute has already been filed for this claim." }, { status: 409 });
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    await db.from("damage_claims").update({
      guest_dispute_status: "open",
      dispute_deadline: deadline.toISOString(),
    }).eq("id", id);

    await db.from("audit_log").insert({
      action: "claim.dispute",
      target_id: id,
      detail: `Dispute filed: ${body.reason}. Deadline: ${deadline.toISOString()}`,
    });

    return NextResponse.json({ ok: true, dispute_deadline: deadline.toISOString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues.map((e) => e.message).join(", ") },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Dispute failed" }, { status: 400 });
  }
}
