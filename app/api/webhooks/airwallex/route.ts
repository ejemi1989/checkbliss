import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import { checkAndProcess } from "@/lib/idempotency";
import { enqueue } from "@/lib/outbox";
import { log } from "@/lib/observability";

const AIRWALLEX_WEBHOOK_SECRET = process.env.AIRWALLEX_WEBHOOK_SECRET || "";

function verifySignature(payload: string, signature: string): boolean {
  if (!AIRWALLEX_WEBHOOK_SECRET) return true;
  const expected = crypto
    .createHmac("sha256", AIRWALLEX_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (AIRWALLEX_WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  if (!supabaseAdminConfigured) {
    try {
      const parsed = JSON.parse(rawBody);
      console.log(`[mock airwallex webhook] ${parsed.type ?? "unknown event"} — ${parsed.id ?? parsed.data?.id ?? "no id"}`);
    } catch {
      console.log("[mock airwallex webhook] Received raw payload");
    }
    return NextResponse.json({ ok: true });
  }

  try {
    const parsed = JSON.parse(rawBody);
    const eventType = parsed.type as string;
    const eventId = (parsed.id as string) || (parsed.data?.id as string) || "unknown";
    const intentId = parsed.data?.id as string | undefined;

    /* --- idempotency guard --- */
    const decision = await checkAndProcess("airwallex", eventId);
    if (decision === "skip") {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    log("airwallex-webhook", "info", `Processing ${eventType}`, { eventId, intentId });

    if (!intentId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const db = createAdmin();

    if (eventType === "payment_intent.succeeded") {
      await db.from("booking_groups").update({ charge_status: "succeeded" }).eq("charge_intent_id", intentId);
    } else if (eventType === "payment_intent.payment_failed") {
      await db.from("booking_groups").update({ charge_status: "failed" }).eq("charge_intent_id", intentId);
    } else if (eventType === "payment_intent.cancelled") {
      await db.from("deposit_holds").update({ status: "released", released_at: new Date().toISOString() }).eq("airwallex_authorisation_id", intentId);
    }

    await db.from("audit_log").insert({
      action: `airwallex.${eventType}`,
      target_id: intentId,
      detail: `Event ${eventType} for intent ${intentId}`,
    });

    if (eventType === "payment_intent.payment_failed" || eventType === "payment_intent.cancelled") {
      enqueue("email", "guest@placeholder", `Payment event: ${eventType} for intent ${intentId}`, "Payment Update");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
