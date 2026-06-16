import { NextRequest, NextResponse } from "next/server";
import { checkAndProcess } from "@/lib/idempotency";
import { heartbeat, heartbeatError, log } from "@/lib/observability";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(request: NextRequest) {
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const runId = `reconcile-${new Date().toISOString().slice(0, 13)}`;
  const idem = await checkAndProcess("cron", runId);
  if (idem === "skip") return NextResponse.json({ ok: true, idempotent: true });

  try {
    if (!process.env.AIRWALLEX_CLIENT_ID) {
      log("cron.reconcile", "info", "No Airwallex configured — skipping reconciliation");
      heartbeat("reconcile");
      return NextResponse.json({ ok: true, note: "mock — no reconciliation run" });
    }

    heartbeat("reconcile");
    return NextResponse.json({ ok: true, note: "Reconciliation not yet implemented" });
  } catch (err) {
    heartbeatError("reconcile", String(err));
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
