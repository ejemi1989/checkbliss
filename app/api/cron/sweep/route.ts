import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import { checkAndProcess } from "@/lib/idempotency";
import { heartbeat, heartbeatError, log } from "@/lib/observability";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(request: NextRequest) {
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const runId = `sweep-${new Date().toISOString().slice(0, 13)}`;
  const idem = await checkAndProcess("cron", runId);
  if (idem === "skip") return NextResponse.json({ ok: true, idempotent: true });

  try {
    if (!supabaseAdminConfigured) {
      log("cron.sweep", "info", "No Supabase configured — skipping sweep");
      heartbeat("sweep");
      return NextResponse.json({ ok: true, note: "mock — no sweep run" });
    }

    const db = createAdmin();
    const deadline = new Date();
    deadline.setHours(deadline.getHours() - 1);

    const { data: abandoned } = await db
      .from("reservations")
      .select("id, booking_group_id")
      .eq("status", "pending_payment")
      .lt("created_at", deadline.toISOString());

    if (abandoned) {
      for (const r of abandoned) {
        await db.from("reservations").update({ status: "cancelled" }).eq("id", r.id);
      }
    }

    heartbeat("sweep");
    return NextResponse.json({ ok: true, cancelled: (abandoned ?? []).length });
  } catch (err) {
    heartbeatError("sweep", String(err));
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}
