/**
 * Sandbox smoke test for Fincra.
 * One-off — calls Fincra directly without importing lib/fincra.ts so we
 * sidestep the "server-only" import guard and the dotenv/tsx dev deps.
 * Run with: node --env-file=.env scripts/smoke-fincra.mjs
 */
import { setTimeout as sleep } from "node:timers/promises";

const API_KEY = process.env.FINCRA_API_KEY;
const BUSINESS_ID = process.env.FINCRA_BUSINESS_ID;
const BASE_URL = process.env.FINCRA_BASE_URL ?? "https://sandboxapi.fincra.com";

if (!API_KEY || !BUSINESS_ID) {
  console.error("[smoke] FATAL — FINCRA_API_KEY or FINCRA_BUSINESS_ID missing in .env");
  process.exit(1);
}
console.log("[smoke] BASE_URL:", BASE_URL, "  BUSINESS_ID:", BUSINESS_ID.slice(0, 8) + "…");

async function fincra(path, init = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "api-key": API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: res.status, ok: res.ok, json, text };
}

async function main() {
  // 1. Register beneficiary
  console.log("[smoke] step 1/3 — POST /profile/beneficiaries/business/{id}");
  const benefRes = await fincra(`/profile/beneficiaries/business/${BUSINESS_ID}`, {
    method: "POST",
    body: JSON.stringify({
      firstName: "Smoke",
      lastName: "Test",
      accountHolderName: "Smoke Test",
      bank: { name: "Wema Bank", code: "035" },
      address: { country: "NG", state: "Lagos" },
      type: "individual",
      currency: "NGN",
      paymentDestination: "bank_account",
      destinationAddress: "0000000000",
    }),
  });
  console.log("[smoke]   status:", benefRes.status);
  console.log("[smoke]   body:", JSON.stringify(benefRes.json, null, 2));
  if (!benefRes.ok && benefRes.status !== 200) {
    console.error("[smoke] FATAL — beneficiary registration failed");
    process.exit(2);
  }

  // 2. Create payout (NGN 1.00 = 100 minor)
  console.log("\n[smoke] step 2/3 — POST /disbursements/payouts (NGN 1.00)");
  const customerReference = `smoke-${Date.now()}`;
  const payoutRes = await fincra("/disbursements/payouts", {
    method: "POST",
    body: JSON.stringify({
      business: BUSINESS_ID,
      sourceCurrency: "NGN",
      destinationCurrency: "NGN",
      amount: 1,
      customerReference,
      paymentDestination: "bank_account",
      description: "CheckinBliss sandbox smoke test",
      beneficiary: {
        firstName: "Smoke",
        lastName: "Test",
        accountHolderName: "Smoke Test",
        type: "individual",
        country: "NG",
        accountNumber: "0000000000",
        bankCode: "035",
      },
    }),
  });
  console.log("[smoke]   status:", payoutRes.status);
  console.log("[smoke]   body:", JSON.stringify(payoutRes.json, null, 2));
  if (!payoutRes.ok) {
    console.error("[smoke] FATAL — payout creation failed");
    process.exit(3);
  }
  const payoutReference = payoutRes.json?.data?.reference;
  if (!payoutReference) {
    console.error("[smoke] FATAL — no payoutReference in response");
    process.exit(3);
  }

  // 3. Poll for status
  console.log(`\n[smoke] step 3/3 — polling GET /disbursements/payouts/reference/${payoutReference}`);
  let terminal = null;
  for (let i = 1; i <= 6; i++) {
    await sleep(5000);
    const pollRes = await fincra(`/disbursements/payouts/reference/${payoutReference}`, { method: "GET" });
    const status = pollRes.json?.data?.status ?? pollRes.json?.status ?? "unknown";
    console.log(`[smoke]   poll ${i}/6 — HTTP ${pollRes.status}, status=${status}`);
    if (status !== "processing") {
      terminal = { pollRes, status };
      break;
    }
  }

  console.log("\n[smoke] FINAL:");
  if (terminal) {
    console.log(JSON.stringify(terminal.pollRes.json, null, 2));
    process.exit(terminal.status === "successful" ? 0 : 4);
  } else {
    console.log("[smoke] did not reach terminal state in 30s — check Fincra sandbox dashboard");
    process.exit(5);
  }
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
