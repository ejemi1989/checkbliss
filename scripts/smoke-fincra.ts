import { config } from "dotenv";
config({ path: ".env" });

import {
  fincraConfigured,
  createFincraBeneficiary,
  createFincraPayout,
  getFincraPayoutStatus,
} from "@/lib/fincra";

async function main() {
  console.log("[smoke] fincraConfigured:", fincraConfigured);
  if (!fincraConfigured) {
    console.error("[smoke] FATAL — FINCRA_API_KEY or FINCRA_BUSINESS_ID missing in .env");
    process.exit(1);
  }

  console.log("[smoke] step 1/3 — registering sandbox beneficiary...");
  const beneficiary = await createFincraBeneficiary({
    firstName: "Smoke",
    lastName: "Test",
    accountHolderName: "Smoke Test",
    bankName: "Wema Bank",
    bankCode: "035",
    accountNumber: "0000000000",
    type: "individual",
    country: "NG",
  });
  console.log("[smoke]   ok — beneficiary accountHolderName:", beneficiary.accountHolderName);

  console.log("[smoke] step 2/3 — creating NGN 1.00 payout...");
  const idempotencyKey = `smoke-${Date.now()}`;
  const payout = await createFincraPayout({
    customerReference: idempotencyKey,
    amountNgnMinor: 100,
    beneficiary,
    description: "CheckinBliss sandbox smoke test",
  });
  console.log("[smoke]   ok — payoutReference:", payout.payoutReference, "status:", payout.status);

  console.log("[smoke] step 3/3 — polling status (up to 30s)...");
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await getFincraPayoutStatus(payout.payoutReference);
    console.log(`[smoke]   poll ${i + 1}/6 — ${status.status}`);
    if (status.status !== "processing") {
      console.log("[smoke] FINAL:", JSON.stringify(status, null, 2));
      process.exit(status.status === "successful" ? 0 : 2);
    }
  }
  console.log("[smoke] did not reach terminal state in 30s — check Fincra sandbox dashboard");
  process.exit(3);
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
