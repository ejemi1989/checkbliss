import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import { releaseHold } from "@/lib/airwallex";
import { checkAndProcess } from "@/lib/idempotency";
import { heartbeat, log } from "@/lib/observability";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(request: NextRequest) {
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const runId = `inspections-${now.toISOString().slice(0, 16)}`;

  const idem = await checkAndProcess("cron", runId);
  if (idem === "skip") return NextResponse.json({ ok: true, idempotent: true });

  if (!supabaseAdminConfigured) {
    log("cron.inspections", "info", "Tick (mock)", { time: nowIso });
    heartbeat("inspections");
    return NextResponse.json({ ok: true, ticked: "mock" });
  }

  const db = createAdmin();

  const dueReservations = await db
    .from("reservations")
    .select("id, property_id, check_out, confirmed_checkout_time, status")
    .eq("status", "confirmed");

  if (!dueReservations.data) {
    return NextResponse.json({ ok: true });
  }

  for (const reservation of dueReservations.data) {
    const checkoutTime = (reservation.confirmed_checkout_time as string) || "11:00";
    const checkoutDate = new Date(`${reservation.check_out}T${checkoutTime}:00`);
    const hoursDiff = (now.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60);

    const { data: existing } = await db
      .from("inspections")
      .select("id, pre_notice_sent_at, prompt_sent_at, reminder_sent_at, escalated_at")
      .eq("reservation_id", reservation.id)
      .single();

    if (!existing) {
      await db.from("inspections").insert({
        reservation_id: reservation.id,
        created_at: nowIso,
      });
      continue;
    }

    if (hoursDiff >= -24 && hoursDiff < 0 && !existing.pre_notice_sent_at) {
      await db.from("inspections").update({ pre_notice_sent_at: nowIso }).eq("id", existing.id);
    }

    if (hoursDiff >= 0 && hoursDiff < 0.5 && !existing.prompt_sent_at) {
      await db.from("inspections").update({ prompt_sent_at: nowIso }).eq("id", existing.id);
    }

    if (hoursDiff >= 4 && !existing.reminder_sent_at) {
      await db.from("inspections").update({ reminder_sent_at: nowIso }).eq("id", existing.id);
    }

    if (hoursDiff >= 48 && !existing.escalated_at) {
      await db.from("inspections").update({ escalated_at: nowIso }).eq("id", existing.id);
      await db.from("audit_log").insert({
        action: "inspection.escalated",
        target_id: reservation.id,
        detail: "Auto-escalated — no inspection result after 48 hours",
      });
    }

    if (hoursDiff >= 168) {
      const { data: holds } = await db
        .from("deposit_holds")
        .select("id, airwallex_authorisation_id, status")
        .eq("reservation_id", reservation.id)
        .eq("status", "held");

      for (const hold of holds ?? []) {
        await releaseHold(hold.airwallex_authorisation_id as string);
        await db.from("deposit_holds").update({ status: "expired", released_at: nowIso }).eq("id", hold.id);
        await db.from("audit_log").insert({
          action: "deposit.expired",
          target_id: hold.id,
          detail: "Auto-released after 7-day backstop",
        });
      }
    }
  }

  heartbeat("inspections");
  return NextResponse.json({ ok: true });
}
