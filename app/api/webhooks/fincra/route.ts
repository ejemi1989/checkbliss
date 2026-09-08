import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  fincraConfigured,
  parseFincraWebhookEvent,
  verifyFincraWebhookSignature,
} from "@/lib/fincra";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { checkAndProcess } from "@/lib/idempotency";
import { log } from "@/lib/observability";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("signature");

  if (!fincraConfigured) {
    let preview = "";
    try {
      const parsed = JSON.parse(rawBody);
      preview = `${parsed.event ?? "unknown"} — ${parsed.data?.reference ?? "no ref"}`;
    } catch {
      preview = "raw payload";
    }
    log("fincra-webhook", "info", `[mock fincra webhook] ${preview}`);
    return NextResponse.json({ ok: true });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    log("fincra-webhook", "warn", "Rejected — invalid JSON");
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  if (!verifyFincraWebhookSignature(parsedJson, signature)) {
    log("fincra-webhook", "warn", "Rejected — signature mismatch");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let parsed;
  try {
    parsed = parseFincraWebhookEvent(parsedJson);
  } catch (err) {
    if (err instanceof ZodError) {
      log("fincra-webhook", "warn", "Rejected — malformed payload", { issues: err.issues });
      return new NextResponse("Malformed payload", { status: 400 });
    }
    throw err;
  }

  const eventId = `${parsed.event}:${parsed.data.reference}`;
  const decision = await checkAndProcess("fincra", eventId);
  if (decision === "skip") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  if (!supabaseAdminConfigured) {
    log("fincra-webhook", "info", `[mock DB] received ${parsed.event} ${parsed.data.reference}`);
    return NextResponse.json({ ok: true });
  }

  const db = createAdmin();
  const customerReference = parsed.data.customerReference ?? null;

  const { data: payout } = await db
    .from("owner_payouts")
    .select("id, booking_group_id, status")
    .eq("fincra_idempotency_key", customerReference)
    .maybeSingle();

  if (!payout) {
    log("fincra-webhook", "warn", `No payout matches customerReference=${customerReference}`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (["paid", "failed", "refunded"].includes(payout.status)) {
    return NextResponse.json({ ok: true, already_terminal: true });
  }

  if (parsed.event === "payout.successful") {
    const now = new Date().toISOString();
    await db.from("owner_payouts")
      .update({ status: "paid", paid_at: now })
      .eq("id", payout.id);
    await db.from("booking_groups")
      .update({ owner_payout_status: "paid", owner_payout_date: now })
      .eq("id", payout.booking_group_id);
    log("fincra-webhook", "info", `Marked paid — payout ${payout.id} (ref ${parsed.data.reference})`);
    return NextResponse.json({ ok: true });
  }

  if (parsed.event === "payout.failed") {
    const reason = parsed.data.reason ?? parsed.data.status ?? "unknown";
    await db.from("owner_payouts")
      .update({ status: "failed", last_error: reason })
      .eq("id", payout.id);
    await db.from("payout_alerts").insert({
      severity: "critical",
      kind: "fincra_failed",
      booking_group_id: payout.booking_group_id,
      owner_payout_id: payout.id,
      message: `Fincra reported payout ${parsed.data.reference} as failed: ${reason}`,
    });
    log("fincra-webhook", "warn", `Marked failed — payout ${payout.id} (ref ${parsed.data.reference}): ${reason}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
}
