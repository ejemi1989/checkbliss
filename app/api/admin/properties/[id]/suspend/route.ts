import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
