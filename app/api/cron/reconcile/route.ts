import { NextRequest, NextResponse } from "next/server";
import { checkAndProcess } from "@/lib/idempotency";
import { heartbeat, heartbeatError, log } from "@/lib/observability";
import { reconcilePaymentIntents } from "@/lib/reconciliation";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(request: NextRequest) {
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const runId = `reconcile-${new Date().toISOString().slice(0, 13)}`;
  const idem = await checkAndProcess("cron", runId);
  if (idem === "skip") return NextResponse.json({ ok: true, idempotent: true });

  try {
    const outcomes = await reconcilePaymentIntents();

    const recovered = outcomes.filter((o) => o.disposition === "recover");
    const refunded = outcomes.filter((o) => o.disposition === "refund");

    if (outcomes.length > 0) {
      log("cron.reconcile", "info", `Reconciliation complete — ${outcomes.length} intent(s)`, {
        recovered: recovered.length,
        refunded: refunded.length,
        ok: outcomes.filter((o) => o.disposition === "ok").length,
      });
    }

    heartbeat("reconcile");
    return NextResponse.json({
      ok: true,
      outcomes,
      summary: {
        evaluated: outcomes.length,
        recovered: recovered.length,
        refunded: refunded.length,
      },
    });
  } catch (err) {
    heartbeatError("reconcile", String(err));
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
