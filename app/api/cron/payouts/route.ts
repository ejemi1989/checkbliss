import { NextRequest, NextResponse } from "next/server";
import { checkAndProcess } from "@/lib/idempotency";
import { heartbeat, heartbeatError, log } from "@/lib/observability";
import { evaluatePayoutEligibility, releaseEligiblePayouts, pollPendingPayouts } from "@/lib/payouts";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(request: NextRequest) {
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const runId = `payouts-${new Date().toISOString().slice(0, 13)}`;
  const idem = await checkAndProcess("cron", runId);
  if (idem === "skip") return NextResponse.json({ ok: true, idempotent: true });

  try {
    log("cron.payouts", "info", "Starting payout lifecycle");

    const eligibleIds = await evaluatePayoutEligibility();
    log("cron.payouts", "info", `Eligibility evaluated: ${eligibleIds.length} eligible`);

    const releasedIds = await releaseEligiblePayouts();
    log("cron.payouts", "info", `Payouts released: ${releasedIds.length} released`);

    const confirmed = await pollPendingPayouts();
    log("cron.payouts", "info", `Payouts confirmed: ${confirmed} confirmed`);

    heartbeat("payouts");
    return NextResponse.json({
      ok: true,
      eligible: eligibleIds.length,
      released: releasedIds.length,
      confirmed,
    });
  } catch (err) {
    heartbeatError("payouts", String(err));
    return NextResponse.json({ error: "Payout lifecycle failed" }, { status: 500 });
  }
}
