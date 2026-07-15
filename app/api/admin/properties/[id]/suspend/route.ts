import { NextRequest, NextResponse } from "next/server";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { checkAdminGate } from "@/lib/admin-gate";

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
    const body: { reason?: string } = await request.json().catch(() => ({}));

    if (!supabaseAdminConfigured) {
      console.log(`[mock] Property ${id} suspended`);
      return NextResponse.json({ ok: true });
    }

    const db = createAdmin();
    await db.from("properties").update({ status: "suspended" }).eq("id", id);
    await db.from("audit_log").insert({
      action: "property.suspended",
      target_id: id,
      detail: body.reason ?? "Suspended by admin via HTTP",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to suspend property" }, { status: 500 });
  }
}
