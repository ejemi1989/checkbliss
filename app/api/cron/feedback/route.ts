import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import { checkAndProcess } from "@/lib/idempotency";
import { heartbeat, heartbeatError, log } from "@/lib/observability";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(request: NextRequest) {
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const runId = `feedback-${new Date().toISOString().slice(0, 13)}`;
  const idem = await checkAndProcess("cron", runId);
  if (idem === "skip") return NextResponse.json({ ok: true, idempotent: true });

  try {
    const now = new Date();

    if (!supabaseAdminConfigured) {
      log("cron.feedback", "info", "Tick (mock)", { time: now.toISOString() });
      heartbeat("feedback");
      return NextResponse.json({ ok: true });
    }

    const db = createAdmin();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayStart = new Date(yesterday);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: completedReservations } = await db
      .from("reservations")
      .select("id, guest_name, guest_phone, property_name, total_minor, currency")
      .eq("status", "completed")
      .gte("updated_at", dayStart.toISOString())
      .lte("updated_at", dayEnd.toISOString());

    if (!completedReservations) {
      heartbeat("feedback");
      return NextResponse.json({ ok: true });
    }

    heartbeat("feedback");
    return NextResponse.json({ ok: true, processed: completedReservations.length });
  } catch (err) {
    heartbeatError("feedback", String(err));
    return NextResponse.json({ error: "Feedback cron failed" }, { status: 500 });
  }
}
